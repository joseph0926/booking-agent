import { DatabaseSync } from "node:sqlite";
import { schema } from "../../src/database/schema";

export const raceSlotStart = "2026-11-20T09:00:00.000Z";

export function openReservationLab(enforceUnique: boolean): DatabaseSync {
  const db = new DatabaseSync(":memory:", {
    enableForeignKeyConstraints: true,
  });

  try {
    db.exec(schema);
    db.prepare("INSERT INTO stores (id, name) VALUES (?, ?)").run(
      "store-1",
      "동시 예약 실습",
    );

    // 이 함수에서 새로 만든 메모리 DB에만 비교 조건을 적용한다.
    if (!enforceUnique) {
      db.exec("DROP INDEX uniqueReservation");
    }

    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function createReadBarrier(): () => Promise<void> {
  let arrived = 0;
  let release: () => void = () => {};
  const bothRead = new Promise<void>((resolve) => {
    release = resolve;
  });

  return () => {
    arrived += 1;
    if (arrived === 2) {
      release();
    }
    return bothRead;
  };
}
