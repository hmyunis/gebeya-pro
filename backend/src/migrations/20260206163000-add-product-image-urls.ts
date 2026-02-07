import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImageUrls20260206163000 implements MigrationInterface {
  name = 'AddProductImageUrls20260206163000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasColumn('products', 'imageUrls'))) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD COLUMN `imageUrls` longtext NULL AFTER `imageUrl`',
      );
    }

    await queryRunner.query(
      "UPDATE `products` SET `imageUrls` = JSON_ARRAY(`imageUrl`) WHERE `imageUrls` IS NULL AND `imageUrl` IS NOT NULL AND `imageUrl` <> ''",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasColumn('products', 'imageUrls')) {
      await queryRunner.query(
        'ALTER TABLE `products` DROP COLUMN `imageUrls`',
      );
    }
  }
}
