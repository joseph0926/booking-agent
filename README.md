# booking-agent

동네 가게의 예약을 받는 서버와, 그 위에서 손님과 대화하며 예약을 처리하는 상담 에이전트다. 예약 서버에서 시작해 LLM 상담원, 실시간 대화와 장애 대응까지 6주 동안 키운다.

이 저장소는 [서버와 AI 애플리케이션 트랙](../study/engineering/tracks/backend-ai/README.md)의 학습 프로젝트다. 주차별 목표와 진행 방식은 트랙 문서가 소유하고, 이 문서는 제품 설명과 API 계약을 소유한다.

## 제품

- 손님은 가게의 시간대(슬롯)를 골라 예약하고, 예약을 바꾸거나 취소한다.
- 3주차부터는 손님이 대화로 요청하면 상담 에이전트가 예약 API를 도구로 호출해 처리한다.
- 5주차부터는 가게마다 다른 정책(예약 가능 시간, 취소 마감, 사람에게 넘기는 조건)을 코드 수정 없이 설정으로 추가한다.

## 도메인 규칙 (1주차)

- 가게는 여러 슬롯을 가진다. 슬롯은 시작 시각으로 구분하며 길이는 60분이다.
- 한 슬롯에는 확정된 예약이 최대 1건이다.
- 예약의 상태는 `confirmed`와 `cancelled` 중 하나다. 취소된 예약은 슬롯을 차지하지 않는다.
- 예약 변경은 기존 슬롯을 비우고 새 슬롯을 차지하는 하나의 동작이다. 새 슬롯을 차지하지 못하면 기존 예약은 그대로 남는다.

## API 계약 (1주차)

| 메서드와 경로 | 요청 | 성공 | 실패 |
|---|---|---|---|
| `POST /stores/:storeId/reservations` | `{ "slotStart": "2026-11-10T18:00:00+09:00", "customerName": "..." }` | `201` 예약 `{ id, storeId, slotStart, customerName, status }` | `409` 슬롯이 이미 찼음, `400` 잘못된 입력, `404` 없는 가게 |
| `PATCH /reservations/:id` | `{ "slotStart": "..." }` | `200` 바뀐 예약 | `409` 새 슬롯이 찼거나 이미 취소된 예약, `404` 없는 예약 |
| `DELETE /reservations/:id` | 없음 | `200` 취소된 예약 | `409` 이미 취소된 예약, `404` 없는 예약 |
| `GET /stores/:storeId/reservations?date=2026-11-10` | 없음 | `200` 그날의 확정된 예약 목록 | `400` 잘못된 날짜, `404` 없는 가게 |

## 1주차 완료 조건

- 같은 슬롯에 동시에 들어온 예약 요청 20건 중 정확히 1건이 `201`, 나머지는 `409`다. 저장된 확정 예약도 1건이다.
- 같은 예약에 변경과 취소가 동시에 들어와도, 끝난 뒤의 저장 상태가 도메인 규칙을 어기지 않는다.
- 위 두 조건은 Vitest 테스트로 확인한다. 테스트는 사용자가 구현보다 먼저 쓴다.
- 한 프로세스의 동기 SQLite에서는 요청이 저절로 끼어들지 않으므로, 테스트는 조회와 저장 사이에 대기를 넣어 두 요청이 같은 상태를 읽은 뒤 쓰도록 순서를 제어한다. 응답 코드와 함께 저장된 최종 상태를 확인한다.

## 실행 환경

- Node 24, pnpm 12, TypeScript 7, NestJS 12, Vitest 5, SQLite(Node 내장 `node:sqlite`).
- Vitest는 NestJS 의존성 주입에 필요한 데코레이터 메타데이터를 만들기 위해 `unplugin-swc`로 변환한다.
- DB는 기본으로 메모리에서 열린다. 파일로 남기려면 `DB_PATH`를 지정한다(`data/`는 Git에서 제외).
- Git 저장소 생성과 커밋은 사용자가 한다.

```bash
pnpm install
```

```bash
pnpm test
```

```bash
pnpm build && pnpm start
```

## 뼈대에 있는 것과 없는 것

- 있는 것: 앱 시작(`src/main.ts`), DB 연결 모듈(`src/database/database.module.ts`), DB까지 확인하는 `GET /health`와 그 테스트(`test/health.e2e.test.ts`).
- 작성 중: `test/reservations.e2e.test.ts`에 요청 20건의 응답 검사까지 작성했다. 예약 처리 코드가 아직 구현되지 않아 501 응답으로 실패한다. DB의 최종 상태 검사와 실행 순서 제어는 남아 있다.
- 작성한 것: `src/database/schema.ts`의 가게 및 예약 테이블과 부분 유니크 인덱스. 별도 메모리 DB에서 생성 및 제약 동작을 확인했고 앱 시작에도 연결했다.
- 준비한 것: `src/reservations.controller.ts`의 POST 경로와 DB 전달. 가게 존재 확인은 작성 및 실행 확인을 마쳤다. 없는 가게는 404, 있는 가게는 아직 예약 저장 구현 대기인 501을 반환한다.
- 3주차부터 쓰는 모델 API 키는 사용자가 `.env`에 넣는다. 테스트는 모의 모델로 돌린다.

## 가게와 예약 테이블 작성

작성 위치는 [schema.ts](./src/database/schema.ts)의 백틱 안이다. 테이블과 제약을 정의하는 SQL을 스키마라고 부른다. 앱 시작 시 실행하며 아래 명령은 매번 별도의 메모리 DB에서 실행한다. `IF NOT EXISTS`로 재시작 때 기존 데이터를 유지하지만 기존 테이블의 구조를 바꾸지는 않는다.

- `stores`: `id`, `name`을 둔다.
- `reservations`: `id`, `store_id`, `slot_start`, `customer_name`, `status`를 둔다.
- 이번 단계에서는 모든 열을 `TEXT NOT NULL`로 선언하고 각 테이블의 `id`를 `PRIMARY KEY`로 지정한다. `NOT NULL`은 NULL을 막으며 빈 문자열을 막는 규칙은 아니다.
- `reservations.store_id`는 `stores.id`를 참조한다. 외래 키는 존재하지 않는 가게의 예약 저장을 막는다. 아래 실행 명령은 외래 키 검사를 명시적으로 켠다.
- `status`는 `CHECK`로 `confirmed` 또는 `cancelled`만 허용한다. 기본값은 이번 단계에서 요구하지 않으며 저장할 때 상태를 명시한다.
- 테이블 두 개를 만든 뒤 파일에 옮겨 둔 사용자 작성 인덱스를 실행한다. 전체 행에 대한 시간대 중복 금지는 추가하지 않는다.

프로젝트 루트에서 실행한다.

```bash
pnpm build
```

```bash
node <<'JS'
const { DatabaseSync } = require('node:sqlite');
const { schema } = require('./dist/database/schema.js');
const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
try {
  db.exec(schema);
  console.table(db.prepare(`
    SELECT type, name FROM sqlite_schema
    WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name
  `).all());
} finally {
  db.close();
}
JS
```

현재 작성본에서는 `stores`, `reservations`와 `uniqueReservation`이 나타난다. 2026-11-01에 별도 메모리 DB에서 필수 값, 외래 키, 상태 제한, 중복 금지와 취소 후 재예약을 순차 실행으로 확인했다. 위 목록 조회 명령 자체는 생성 여부만 확인한다. HTTP 예약 테스트는 API 구현 전까지 실패하며 동시 요청의 보장은 아직 검증하지 않았다.


## 예약 생성 API 작성

작성 위치는 [reservations.controller.ts](./src/reservations.controller.ts)의 `create` 메서드다. 요청이 들어오면 NestJS가 이 메서드를 호출한다. `storeId`는 URL의 가게 ID, `body`는 요청 본문이고 `this.db`는 초기화된 DB 연결이다. 본문은 아직 확인하지 않았으므로 `unknown`으로 둔다.

첫 작성 범위는 가게 존재 확인이다.

1. `stores`에서 `id`가 `storeId`인 행을 조회한다. SQL 안의 `?` 자리에 `.get(storeId)`로 값을 전달하며 문자열에 직접 끼워 넣지 않는다.
2. 조회 결과가 없으면 `NotFoundException`을 던져 404를 돌려준다.
3. 가게가 있으면 현재의 `NotImplementedException`까지 진행해 501을 유지한다. 입력 검증, 예약 저장과 409 응답은 다음 단계에서 작성한다.

`this.db.prepare(SQL).get(값)`은 조회한 첫 행을 반환하고 결과가 없으면 `undefined`다. 이후 삽입에는 `.run(...)`을 사용한다. 이번 단계의 가게 조회를 예약 자리의 사전 조회만으로 중복을 막는 방식과 혼동하지 않는다. 예약 중복 금지는 작성한 DB 제약으로 처리한다.

예약 테스트는 각 실행에서 새 메모리 DB를 열고 `store-1` 가게를 넣는다. 실제 앱 DB에는 테스트 가게를 자동 추가하지 않는다. 요청을 보내기 전에 테스트 서버의 포트를 열어 요청 도구가 서버를 함께 시작하지 않도록 했다. 사용자가 작성한 요청 20개와 응답 검사문은 그대로 유지했다.

```bash
pnpm typecheck
pnpm exec vitest run test/reservations.e2e.test.ts
```

위 예약 테스트는 생성 로직을 구현하기 전까지 실패한다. 2026-11-01 첫 단계 검토에서 존재하는 가게의 501, 없는 가게의 404와 예약 저장 0건을 실제 앱으로 확인했다. 최종 DB 상태 검사와 실행 순서를 제어하는 동시성 검증은 아직 남아 있다.

참고: [NestJS 컨트롤러](https://docs.nestjs.com/controllers), [Node SQLite](https://nodejs.org/api/sqlite.html).
