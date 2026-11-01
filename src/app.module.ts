import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { ReservationsController } from './reservations.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, ReservationsController],
})
export class AppModule {}
