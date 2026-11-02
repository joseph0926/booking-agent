import {
  Body,
  Controller,
  Inject,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
  BadRequestException,
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
    if (body === null || typeof body !== "object") {
      throw new BadRequestException("요청 본문은 객체여야 합니다");
    }
    if (!("customerName" in body)) {
      throw new BadRequestException("손님 이름이 필요합니다");
    }
    if (typeof body.customerName !== "string") {
      throw new BadRequestException("손님 이름은 문자열이어야 합니다");
    }
    if (body.customerName.trim().length === 0) {
      throw new BadRequestException("손님 이름을 입력해 주세요");
    }

    if (!("slotStart" in body)) {
      throw new BadRequestException("예약 시작 시각이 필요합니다");
    }
    if (typeof body.slotStart !== "string") {
      throw new BadRequestException("예약 시작 시각은 문자열이어야 합니다");
    }
    if (body.slotStart.trim().length === 0) {
      throw new BadRequestException("예약 시작 시각을 입력해 주세요");
    }

    // 다음 단계에서 입력 검증, 예약 저장과 중복일 때의 응답을 구현한다.
    throw new NotImplementedException("예약 생성 구현 대기");
  }
}
