import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsBankAccount20260208010000
  implements MigrationInterface
{
  name = 'AddProductsBankAccount20260208010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasTable = async (table: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
        [dbName, table],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasIndex = async (table: string, indexName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, indexName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasForeignKey = async (table: string, fkName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
        [dbName, table, fkName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasTable('products'))) {
      return;
    }

    if (!(await hasColumn('products', 'bankAccountId'))) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD COLUMN `bankAccountId` int NULL AFTER `createdById`',
      );
    }

    if (!(await hasIndex('products', 'idx_products_bankAccountId'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_products_bankAccountId` ON `products` (`bankAccountId`)',
      );
    }

    if (
      (await hasTable('bank_accounts')) &&
      !(await hasForeignKey('products', 'fk_products_bank_account'))
    ) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD CONSTRAINT `fk_products_bank_account` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasTable = async (table: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
        [dbName, table],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasColumn = async (table: string, column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasIndex = async (table: string, indexName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, indexName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasForeignKey = async (table: string, fkName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
        [dbName, table, fkName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasTable('products'))) {
      return;
    }

    if (await hasForeignKey('products', 'fk_products_bank_account')) {
      await queryRunner.query(
        'ALTER TABLE `products` DROP FOREIGN KEY `fk_products_bank_account`',
      );
    }

    if (await hasIndex('products', 'idx_products_bankAccountId')) {
      await queryRunner.query(
        'DROP INDEX `idx_products_bankAccountId` ON `products`',
      );
    }

    if (await hasColumn('products', 'bankAccountId')) {
      await queryRunner.query('ALTER TABLE `products` DROP COLUMN `bankAccountId`');
    }
  }
}
