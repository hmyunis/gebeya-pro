import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsCreatedBy20260207204000 implements MigrationInterface {
  name = 'AddProductsCreatedBy20260207204000';

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

    if (!(await hasColumn('products', 'createdById'))) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD COLUMN `createdById` int NULL AFTER `merchantId`',
      );
    }

    if (!(await hasIndex('products', 'idx_products_createdById'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_products_createdById` ON `products` (`createdById`)',
      );
    }

    if (!(await hasForeignKey('products', 'fk_products_created_by_user'))) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD CONSTRAINT `fk_products_created_by_user` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL',
      );
    }

    if (await hasColumn('products', 'merchantId')) {
      await queryRunner.query(
        'UPDATE `products` SET `createdById` = `merchantId` WHERE `createdById` IS NULL AND `merchantId` IS NOT NULL',
      );
    }

    const adminUsers = await queryRunner.query(
      "SELECT `id` FROM `users` WHERE `role` = 'admin' ORDER BY `id` ASC",
    );
    if (Array.isArray(adminUsers) && adminUsers.length === 1) {
      const adminId = Number.parseInt(String(adminUsers[0]?.id), 10);
      if (Number.isFinite(adminId) && adminId > 0) {
        await queryRunner.query(
          'UPDATE `products` SET `createdById` = ? WHERE `createdById` IS NULL',
          [adminId],
        );
      }
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

    if (await hasForeignKey('products', 'fk_products_created_by_user')) {
      await queryRunner.query(
        'ALTER TABLE `products` DROP FOREIGN KEY `fk_products_created_by_user`',
      );
    }

    if (await hasIndex('products', 'idx_products_createdById')) {
      await queryRunner.query(
        'DROP INDEX `idx_products_createdById` ON `products`',
      );
    }

    if (await hasColumn('products', 'createdById')) {
      await queryRunner.query(
        'ALTER TABLE `products` DROP COLUMN `createdById`',
      );
    }
  }
}
