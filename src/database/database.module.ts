import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { schema } from './schema';

export const DATABASE = Symbol('DATABASE');

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path, { enableForeignKeyConstraints: true });
  try {
    db.exec(schema);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => openDatabase(process.env.DB_PATH ?? ':memory:'),
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
