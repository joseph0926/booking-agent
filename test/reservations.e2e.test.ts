import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import type { DatabaseSync } from "node:sqlite";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { DATABASE, openDatabase } from "../src/database/database.module";

describe("같은 시간대의 예약 요청", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE)
      .useFactory({ factory: () => openDatabase(":memory:") })
      .compile();
    app = moduleRef.createNestApplication();
    app
      .get<DatabaseSync>(DATABASE)
      .prepare("INSERT INTO stores (id, name) VALUES (?, ?)")
      .run("store-1", "학습용 가게");
    // 요청 도구가 서버를 동시에 시작하지 않도록 먼저 포트를 연다.
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    await app.close();
  });

  it("같은 시간대의 요청 20건 중 1건은 201, 19건은 409를 받는다", async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }).map((_, idx) =>
        request(app.getHttpServer())
          .post("/stores/store-1/reservations")
          .send({
            slotStart: "2026-11-10T18:00:00+09:00",
            customerName: `customerName-${idx}`,
          }),
      ),
    );

    expect(responses.filter((res) => res.statusCode === 409).length).toBe(19);
    expect(responses.filter((res) => res.statusCode === 201).length).toBe(1);

    const { count } = app
      .get<DatabaseSync>(DATABASE)
      .prepare(
        "SELECT COUNT(*) AS count FROM reservations WHERE store_id = ? AND slot_start = ? AND status = ?",
      )
      .get("store-1", "2026-11-10T09:00:00.000Z", "confirmed");

    expect(count).toBe(1);
  });

  it("손님 이름이 없으면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-10T18:00:00+09:00",
      });

    expect(response.statusCode).toBe(400);
  });

  it("손님 이름이 문자열이 아니면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-10T18:00:00+09:00",
        customerName: 123,
      });

    expect(response.statusCode).toBe(400);
  });

  it("손님 이름이 공백이면 400을 반환한다", async () => {
    const response1 = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-10T18:00:00+09:00",
        customerName: "",
      });
    const response2 = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-10T18:00:00+09:00",
        customerName: "  ",
      });

    expect(response1.statusCode).toBe(400);
    expect(response2.statusCode).toBe(400);
  });

  it("예약 시작 시각이 없으면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });

  it("예약 시작 시각이 문자열이 아니면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: 123,
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });

  it("예약 시작 시각이 공백이면 400을 반환한다", async () => {
    const response1 = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "",
        customerName: "홍길동",
      });
    const response2 = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "  ",
        customerName: "홍길동",
      });

    expect(response1.statusCode).toBe(400);
    expect(response2.statusCode).toBe(400);
  });

  it("예약 시작 시각이 날짜가 아니면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "not-a-date",
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });

  it("예약 시작 시각에 시차 표기가 없으면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-10T18:00:00",
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });

  it("예약 시작 시각을 UTC로 통일해 저장한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-11T18:00:00+09:00",
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.slotStart).toBe("2026-11-11T09:00:00.000Z");

    const storedSlotStart = app
      .get<DatabaseSync>(DATABASE)
      .prepare("SELECT slot_start FROM reservations WHERE id = ?")
      .get(response.body.id);

    expect(storedSlotStart?.slot_start).toBe("2026-11-11T09:00:00.000Z");
  });

  it("서로 다른 시간대의 예약은 모두 생성된다", async () => {
    const response1 = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-12T09:00:00.000Z",
        customerName: "홍길동",
      });
    const response2 = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-11T11:00:00.000Z",
        customerName: "홍길동",
      });

    expect(response1.statusCode).toBe(201);
    expect(response2.statusCode).toBe(201);
    expect(response1.body.id).not.toEqual(response2.body.id);
  });

  it("예약 시작 시각이 달력에 없는 날짜면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-02-30T18:00:00+09:00",
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });

  it("예약 시작 시각의 날짜와 시간 사이가 공백이면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-13 18:00:00+09:00",
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });

  it("예약 시작 시각에 초가 없으면 400을 반환한다", async () => {
    const response = await request(app.getHttpServer())
      .post("/stores/store-1/reservations")
      .send({
        slotStart: "2026-11-14T18:00+09:00",
        customerName: "홍길동",
      });

    expect(response.statusCode).toBe(400);
  });
});
