import { afterEach, expect, it } from "vitest";
import {
  createReadBarrier,
  openReservationLab,
  raceSlotStart,
} from "./fixtures/reservation-race";

let db: ReturnType<typeof openReservationLab>;

afterEach(() => {
  db?.close();
});

it("두 요청이 빈자리를 읽어도 확정 예약은 1건만 남는다", async () => {
  db = openReservationLab(true);
  const waitForBothReads = createReadBarrier();
  const readCounts: number[] = [];

  async function reserve(id: string) {
    const row = db
      .prepare(
        "SELECT COUNT(*) AS count FROM reservations WHERE store_id = ? AND slot_start = ? AND status = ?",
      )
      .get("store-1", raceSlotStart, "confirmed");

    if (row === undefined || typeof row.count !== "number") {
      throw new Error("예약 건수 조회 결과가 올바르지 않습니다");
    }
    const count = row.count;

    readCounts.push(count);
    if (count > 0) {
      throw new Error("이미 예약된 시간대입니다");
    }

    await waitForBothReads();

    db.prepare(
      "INSERT INTO reservations (id, store_id, slot_start, customer_name, status) VALUES (?, ?, ?, ?, ?)",
    ).run(id, "store-1", raceSlotStart, "홍길동", "confirmed");
  }

  const results = await Promise.allSettled([reserve("A"), reserve("B")]);

  expect(readCounts).toStrictEqual([0, 0]);
  expect(results.filter((res) => res.status === "fulfilled").length).toBe(1);

  const rejectedResult = results.filter((res) => res.status === "rejected");
  expect(rejectedResult.length).toBe(1);
  expect(rejectedResult[0].reason.message).toBe(
    "UNIQUE constraint failed: reservations.store_id, reservations.slot_start",
  );

  const row = db
    .prepare(
      "SELECT COUNT(*) AS count FROM reservations WHERE store_id = ? AND slot_start = ? AND status = ?",
    )
    .get("store-1", raceSlotStart, "confirmed");

  if (row === undefined || typeof row.count !== "number") {
    throw new Error("예약 건수 조회 결과가 올바르지 않습니다");
  }
  const count = row.count;
  expect(count).toBe(1);
});
