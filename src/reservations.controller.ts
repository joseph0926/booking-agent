import {
  Body,
  Controller,
  Inject,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
} from "@nestjs/common";
import type { DatabaseSync } from "node:sqlite";
import { DATABASE } from "./database/database.module";

@Controller("stores/:storeId/reservations")
export class ReservationsController {
  constructor(@Inject(DATABASE) private readonly db: DatabaseSync) {}

  @Post()
  create(@Param("storeId") storeId: string, @Body() body: unknown) {
    // TODO: storeId로 stores를 조회하고 없으면 NotFoundException을 던진다.
    const store = this.db
      .prepare("SELECT id FROM stores WHERE id = ?")
      .get(storeId);
    if (!store) {
      throw new NotFoundException("가게를 찾을 수 없습니다");
    }

    // 다음 단계에서 입력 검증, 예약 저장과 중복일 때의 응답을 구현한다.
    throw new NotImplementedException("예약 생성 구현 대기");
  }
}
