import { Controller, Get, Inject } from '@nestjs/common';
import type { DatabaseSync } from 'node:sqlite';
import { DATABASE } from './database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: DatabaseSync) {}

  @Get()
  check() {
    const row = this.db.prepare('SELECT 1 AS ok').get();
    return { status: row?.ok === 1 ? 'ok' : 'degraded' };
  }
}
