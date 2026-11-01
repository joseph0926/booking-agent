import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => new DatabaseSync(process.env.DB_PATH ?? ':memory:'),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly db: DatabaseSync) {}

  onApplicationShutdown() {
    this.db.close();
  }
}
