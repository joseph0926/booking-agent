import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import type { DatabaseSync } from 'node:sqlite';
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
      .useFactory({ factory: () => openDatabase(':memory:') })
      .compile();
    app = moduleRef.createNestApplication();
    app.get<DatabaseSync>(DATABASE)
      .prepare('INSERT INTO stores (id, name) VALUES (?, ?)')
      .run('store-1', '학습용 가게');
    // 요청 도구가 서버를 동시에 시작하지 않도록 먼저 포트를 연다.
    await app.listen(0, '127.0.0.1');
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
  });

  // DB 스키마를 작성한 뒤 위 테스트에서 최종 확정 예약이 1건인지도 확인한다.
  // 요청을 함께 보내는 것만으로 조회와 저장 사이의 경쟁을 재현했다고 판단하지 않는다.
});
