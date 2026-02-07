import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceBroadcastTargetingAndSubscribers20260207170000
  implements MigrationInterface
{
  name = 'EnhanceBroadcastTargetingAndSubscribers20260207170000';

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

    const hasIndex = async (table: string, index: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, index],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasTable('bot_subscribers'))) {
      await queryRunner.query(`
        CREATE TABLE \`bot_subscribers\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`telegramId\` varchar(64) NOT NULL,
          \`username\` varchar(64) NULL,
          \`firstName\` varchar(140) NULL,
          \`lastName\` varchar(140) NULL,
          \`isActive\` tinyint NOT NULL DEFAULT 1,
          \`lastSeenAt\` datetime NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `);
    }

    if (!(await hasIndex('bot_subscribers', 'idx_bot_subscribers_telegramId'))) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX `idx_bot_subscribers_telegramId` ON `bot_subscribers` (`telegramId`)',
      );
    }

    if (!(await hasIndex('bot_subscribers', 'idx_bot_subscribers_isActive'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_bot_subscribers_isActive` ON `bot_subscribers` (`isActive`)',
      );
    }

    if (await hasTable('broadcast_runs')) {
      await queryRunner.query(
        "ALTER TABLE `broadcast_runs` MODIFY COLUMN `target` enum('all','vip','role','users','bot_subscribers') NOT NULL DEFAULT 'all'",
      );

      if (!(await hasColumn('broadcast_runs', 'kind'))) {
        await queryRunner.query(
          "ALTER TABLE `broadcast_runs` ADD COLUMN `kind` enum('announcement','news','ad') NOT NULL DEFAULT 'announcement' AFTER `target`",
        );
      }

      if (!(await hasColumn('broadcast_runs', 'targetRole'))) {
        await queryRunner.query(
          "ALTER TABLE `broadcast_runs` ADD COLUMN `targetRole` enum('customer','admin','merchant') NULL AFTER `kind`",
        );
      }

      if (!(await hasColumn('broadcast_runs', 'targetUserIds'))) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_runs` ADD COLUMN `targetUserIds` text NULL AFTER `targetRole`',
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

    const hasIndex = async (table: string, index: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, index],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasTable('broadcast_runs')) {
      await queryRunner.query(
        "UPDATE `broadcast_runs` SET `target` = 'all' WHERE `target` IN ('role','users','bot_subscribers')",
      );

      if (await hasColumn('broadcast_runs', 'targetUserIds')) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_runs` DROP COLUMN `targetUserIds`',
        );
      }

      if (await hasColumn('broadcast_runs', 'targetRole')) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_runs` DROP COLUMN `targetRole`',
        );
      }

      if (await hasColumn('broadcast_runs', 'kind')) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_runs` DROP COLUMN `kind`',
        );
      }

      await queryRunner.query(
        "ALTER TABLE `broadcast_runs` MODIFY COLUMN `target` enum('all','vip') NOT NULL DEFAULT 'all'",
      );
    }

    if (await hasTable('bot_subscribers')) {
      if (await hasIndex('bot_subscribers', 'idx_bot_subscribers_isActive')) {
        await queryRunner.query(
          'DROP INDEX `idx_bot_subscribers_isActive` ON `bot_subscribers`',
        );
      }
      if (await hasIndex('bot_subscribers', 'idx_bot_subscribers_telegramId')) {
        await queryRunner.query(
          'DROP INDEX `idx_bot_subscribers_telegramId` ON `bot_subscribers`',
        );
      }
      await queryRunner.query('DROP TABLE `bot_subscribers`');
    }
  }
}
