// 앱을 다시 시작해도 이미 있는 테이블과 데이터를 유지한다.
export const schema = /* sql */ `
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id),
    slot_start TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uniqueReservation
  ON reservations (store_id, slot_start)
  WHERE status = 'confirmed';
`;
