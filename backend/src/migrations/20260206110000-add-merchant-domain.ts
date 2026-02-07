import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantDomain20260206110000 implements MigrationInterface {
  name = 'AddMerchantDomain20260206110000';

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

    const hasForeignKey = async (table: string, constraintName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
        [dbName, table, constraintName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const roleColumn = await queryRunner.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role' LIMIT 1`,
      [dbName],
    );
    const roleType = String(roleColumn?.[0]?.COLUMN_TYPE ?? '');
    if (!roleType.includes("'merchant'")) {
      await queryRunner.query(
        "ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','admin','merchant') NOT NULL DEFAULT 'customer'",
      );
    }

    if (!(await hasColumn('products', 'merchantId'))) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD COLUMN `merchantId` int NULL',
      );
    }
    if (!(await hasIndex('products', 'idx_products_merchantId'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_products_merchantId` ON `products` (`merchantId`)',
      );
    }
    if (!(await hasForeignKey('products', 'fk_products_merchant_user'))) {
      await queryRunner.query(
        'ALTER TABLE `products` ADD CONSTRAINT `fk_products_merchant_user` FOREIGN KEY (`merchantId`) REFERENCES `users`(`id`) ON DELETE SET NULL',
      );
    }

    if (!(await hasColumn('orders', 'merchantId'))) {
      await queryRunner.query(
        'ALTER TABLE `orders` ADD COLUMN `merchantId` int NULL',
      );
    }
    if (!(await hasIndex('orders', 'idx_orders_merchantId'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_orders_merchantId` ON `orders` (`merchantId`)',
      );
    }
    if (!(await hasForeignKey('orders', 'fk_orders_merchant_user'))) {
      await queryRunner.query(
        'ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_merchant_user` FOREIGN KEY (`merchantId`) REFERENCES `users`(`id`) ON DELETE SET NULL',
      );
    }

    if (!(await hasTable('merchant_profiles'))) {
      await queryRunner.query(`
        CREATE TABLE \`merchant_profiles\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`userId\` int NOT NULL,
          \`phoneNumber\` varchar(32) NOT NULL,
          \`itemTypes\` text NOT NULL,
          \`address\` text NOT NULL,
          \`profilePictureUrl\` varchar(512) NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_merchant_profiles_userId\` (\`userId\`),
          CONSTRAINT \`fk_merchant_profiles_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
    }

    if (!(await hasTable('merchant_applications'))) {
      await queryRunner.query(`
        CREATE TABLE \`merchant_applications\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`fullName\` varchar(140) NOT NULL,
          \`phoneNumber\` varchar(32) NOT NULL,
          \`itemTypes\` text NOT NULL,
          \`address\` text NOT NULL,
          \`profilePictureUrl\` varchar(512) NULL,
          \`telegramId\` bigint NOT NULL,
          \`telegramUsername\` varchar(64) NULL,
          \`telegramFirstName\` varchar(140) NULL,
          \`telegramPhotoUrl\` varchar(512) NULL,
          \`status\` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
          \`merchantUserId\` int NULL,
          \`processedByUserId\` int NULL,
          \`processedAt\` datetime NULL,
          \`reviewNote\` text NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_merchant_applications_status\` (\`status\`),
          INDEX \`idx_merchant_applications_telegramId\` (\`telegramId\`),
          CONSTRAINT \`fk_merchant_applications_merchantUser\` FOREIGN KEY (\`merchantUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_merchant_applications_processedBy\` FOREIGN KEY (\`processedByUserId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB;
      `);
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

    const hasForeignKey = async (table: string, constraintName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
        [dbName, table, constraintName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasTable('merchant_applications')) {
      await queryRunner.query('DROP TABLE `merchant_applications`');
    }

    if (await hasTable('merchant_profiles')) {
      await queryRunner.query('DROP TABLE `merchant_profiles`');
    }

    if (await hasForeignKey('orders', 'fk_orders_merchant_user')) {
      await queryRunner.query(
        'ALTER TABLE `orders` DROP FOREIGN KEY `fk_orders_merchant_user`',
      );
    }
    if (await hasIndex('orders', 'idx_orders_merchantId')) {
      await queryRunner.query(
        'DROP INDEX `idx_orders_merchantId` ON `orders`',
      );
    }
    if (await hasColumn('orders', 'merchantId')) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `merchantId`');
    }

    if (await hasForeignKey('products', 'fk_products_merchant_user')) {
      await queryRunner.query(
        'ALTER TABLE `products` DROP FOREIGN KEY `fk_products_merchant_user`',
      );
    }
    if (await hasIndex('products', 'idx_products_merchantId')) {
      await queryRunner.query(
        'DROP INDEX `idx_products_merchantId` ON `products`',
      );
    }
    if (await hasColumn('products', 'merchantId')) {
      await queryRunner.query(
        'ALTER TABLE `products` DROP COLUMN `merchantId`',
      );
    }

    const merchantUsers = await queryRunner.query(
      "SELECT COUNT(*) AS count FROM `users` WHERE `role` = 'merchant'",
    );
    const merchantCount = Number.parseInt(
      String(merchantUsers?.[0]?.count ?? 0),
      10,
    );
    if (merchantCount > 0) {
      throw new Error(
        'Cannot revert merchant role enum while merchant users exist',
      );
    }

    await queryRunner.query(
      "ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','admin') NOT NULL DEFAULT 'customer'",
    );
  }
}
