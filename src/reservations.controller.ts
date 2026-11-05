import {
  Body,
  Controller,
  Inject,
  NotFoundException,
  Param,
  Post,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import type { DatabaseSync } from "node:sqlite";
import { DATABASE } from "./database/database.module";
import crypto from "node:crypto";

@Controller("stores/:storeId/reservations")
export class ReservationsController {
  constructor(@Inject(DATABASE) private readonly db: DatabaseSync) {}

  @Post()
  create(@Param("storeId") storeId: string, @Body() body: unknown) {
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
    if (Number.isNaN(new Date(body.slotStart).getTime())) {
      throw new BadRequestException("예약 시작 시각은 날짜여야합니다");
    }

    const offsetPattern = /[+-]\d{2}:\d{2}$/;
    if (!body.slotStart.endsWith("Z") && !offsetPattern.test(body.slotStart)) {
      throw new BadRequestException(
        "예약 시작 시각에 시차 표기가 존재해야합니다.",
      );
    }

    const slotStartRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (!slotStartRegEx.test(body.slotStart)) {
      throw new BadRequestException(
        "예약 시작 시각의 형식이 올바르지 않습니다",
      );
    }

    const slotStartDatePart = body.slotStart.slice(0, 10);
    const TEST_TIME_PART = "T00:00:00.000Z";
    const testSlotStart = new Date(slotStartDatePart + TEST_TIME_PART);
    if (Number.isNaN(testSlotStart.getTime())) {
      throw new BadRequestException(
        "예약 시작 시각에 유효한 날짜를 입력해 주세요",
      );
    }

    const slotStart = new Date(body.slotStart).toISOString();

    if (testSlotStart.toISOString().slice(0, 10) !== slotStartDatePart) {
      throw new BadRequestException(
        "예약 시작 시각에 유효한 날짜를 입력해 주세요",
      );
    }

    const id = crypto.randomUUID();

    try {
      this.db
        .prepare(
          "INSERT INTO reservations (id, store_id, slot_start, customer_name, status) VALUES (?, ?, ?, ?, ?)",
        )
        .run(id, store.id, slotStart, body.customerName, "confirmed");
    } catch (error) {
      const isSlotConflict =
        error instanceof Error &&
        "errcode" in error &&
        error.errcode === 2067 &&
        error.message ===
          "UNIQUE constraint failed: reservations.store_id, reservations.slot_start";

      if (isSlotConflict) {
        throw new ConflictException("이미 예약된 시간대입니다");
      }

      throw error;
    }

    return {
      id,
      storeId: store.id,
      slotStart,
      customerName: body.customerName,
      status: "confirmed",
    };
  }
}
