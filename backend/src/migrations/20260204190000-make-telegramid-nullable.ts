import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTelegramIdNullable20260204190000 implements MigrationInterface {
  name = 'MakeTelegramIdNullable20260204190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const rows = await queryRunner.query(
      `SELECT IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'telegramId' LIMIT 1`,
      [dbName],
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const isNullable = rows[0]?.IS_NULLABLE === 'YES';
    const columnType = String(rows[0]?.COLUMN_TYPE ?? 'bigint');
    if (isNullable) {
      return;
    }

    // Preserve the existing BIGINT display/unsigned attributes if any.
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`telegramId\` ${columnType} NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const nullCountRows = await queryRunner.query(
      `SELECT COUNT(*) AS count FROM \`users\` WHERE \`telegramId\` IS NULL`,
    );
    const nullCount = Number.parseInt(
      String(nullCountRows?.[0]?.count ?? 0),
      10,
    );
    if (nullCount > 0) {
      throw new Error(
        'Cannot revert telegramId to NOT NULL while NULL values exist',
      );
    }

    const rows = await queryRunner.query(
      `SELECT IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'telegramId' LIMIT 1`,
      [dbName],
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const isNullable = rows[0]?.IS_NULLABLE === 'YES';
    const columnType = String(rows[0]?.COLUMN_TYPE ?? 'bigint');
    if (!isNullable) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`telegramId\` ${columnType} NOT NULL`,
    );
  }
}
