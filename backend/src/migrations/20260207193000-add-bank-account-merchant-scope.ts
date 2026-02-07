import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankAccountMerchantScope20260207193000
  implements MigrationInterface
{
  name = 'AddBankAccountMerchantScope20260207193000';

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

    if (!(await hasTable('bank_accounts'))) {
      return;
    }

    if (!(await hasColumn('bank_accounts', 'merchantId'))) {
      await queryRunner.query(
        'ALTER TABLE `bank_accounts` ADD COLUMN `merchantId` int NULL AFTER `status`',
      );
    }

    if (!(await hasIndex('bank_accounts', 'idx_bank_accounts_merchantId'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_bank_accounts_merchantId` ON `bank_accounts` (`merchantId`)',
      );
    }

    if (!(await hasForeignKey('bank_accounts', 'fk_bank_accounts_merchant_user'))) {
      await queryRunner.query(
        'ALTER TABLE `bank_accounts` ADD CONSTRAINT `fk_bank_accounts_merchant_user` FOREIGN KEY (`merchantId`) REFERENCES `users`(`id`) ON DELETE SET NULL',
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

    if (!(await hasTable('bank_accounts'))) {
      return;
    }

    if (await hasForeignKey('bank_accounts', 'fk_bank_accounts_merchant_user')) {
      await queryRunner.query(
        'ALTER TABLE `bank_accounts` DROP FOREIGN KEY `fk_bank_accounts_merchant_user`',
      );
    }

    if (await hasIndex('bank_accounts', 'idx_bank_accounts_merchantId')) {
      await queryRunner.query(
        'DROP INDEX `idx_bank_accounts_merchantId` ON `bank_accounts`',
      );
    }

    if (await hasColumn('bank_accounts', 'merchantId')) {
      await queryRunner.query(
        'ALTER TABLE `bank_accounts` DROP COLUMN `merchantId`',
      );
    }
  }
}
