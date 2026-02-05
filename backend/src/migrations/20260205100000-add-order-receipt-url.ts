import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderReceiptUrl20260205100000 implements MigrationInterface {
  name = 'AddOrderReceiptUrl20260205100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasColumn = async (column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasColumn('receiptUrl'))) {
      await queryRunner.query(
        'ALTER TABLE `orders` ADD COLUMN `receiptUrl` varchar(512) NULL',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasColumn = async (column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasColumn('receiptUrl')) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `receiptUrl`');
    }
  }
}
