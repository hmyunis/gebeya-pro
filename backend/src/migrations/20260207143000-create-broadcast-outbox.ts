import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBroadcastOutbox20260207143000 implements MigrationInterface {
  name = 'CreateBroadcastOutbox20260207143000';

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

    const hasIndex = async (table: string, index: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, index],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasForeignKey = async (table: string, fk: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_NAME = ? AND TABLE_NAME = ? LIMIT 1`,
        [dbName, fk, table],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasTable('broadcast_runs'))) {
      await queryRunner.query(`
        CREATE TABLE \`broadcast_runs\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`status\` enum('QUEUED','RUNNING','COMPLETED','COMPLETED_WITH_ERRORS','CANCELLED') NOT NULL DEFAULT 'QUEUED',
          \`target\` enum('all','vip') NOT NULL DEFAULT 'all',
          \`message\` text NOT NULL,
          \`requestedByUserId\` int NULL,
          \`totalRecipients\` int NOT NULL DEFAULT 0,
          \`pendingCount\` int NOT NULL DEFAULT 0,
          \`sentCount\` int NOT NULL DEFAULT 0,
          \`failedCount\` int NOT NULL DEFAULT 0,
          \`unknownCount\` int NOT NULL DEFAULT 0,
          \`startedAt\` datetime NULL,
          \`finishedAt\` datetime NULL,
          \`lastHeartbeatAt\` datetime NULL,
          \`lockToken\` varchar(64) NULL,
          \`lockExpiresAt\` datetime NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `);
    }

    if (!(await hasIndex('broadcast_runs', 'idx_broadcast_runs_status_createdAt'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_broadcast_runs_status_createdAt` ON `broadcast_runs` (`status`, `createdAt`)',
      );
    }

    if (!(await hasIndex('broadcast_runs', 'idx_broadcast_runs_finishedAt'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_broadcast_runs_finishedAt` ON `broadcast_runs` (`finishedAt`)',
      );
    }

    if (
      !(await hasForeignKey('broadcast_runs', 'fk_broadcast_runs_requested_user'))
    ) {
      await queryRunner.query(
        'ALTER TABLE `broadcast_runs` ADD CONSTRAINT `fk_broadcast_runs_requested_user` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL',
      );
    }

    if (!(await hasTable('broadcast_deliveries'))) {
      await queryRunner.query(`
        CREATE TABLE \`broadcast_deliveries\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`runId\` int NOT NULL,
          \`userId\` int NULL,
          \`telegramId\` varchar(64) NOT NULL,
          \`status\` enum('PENDING','PROCESSING','SENT','FAILED_RETRYABLE','FAILED_PERMANENT','UNKNOWN') NOT NULL DEFAULT 'PENDING',
          \`attemptCount\` int NOT NULL DEFAULT 0,
          \`nextAttemptAt\` datetime NULL,
          \`lastAttemptAt\` datetime NULL,
          \`sentAt\` datetime NULL,
          \`telegramMessageId\` bigint NULL,
          \`lastError\` varchar(512) NULL,
          \`lockToken\` varchar(64) NULL,
          \`lockExpiresAt\` datetime NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `);
    }

    if (
      !(await hasIndex(
        'broadcast_deliveries',
        'idx_broadcast_deliveries_run_status_nextAttemptAt',
      ))
    ) {
      await queryRunner.query(
        'CREATE INDEX `idx_broadcast_deliveries_run_status_nextAttemptAt` ON `broadcast_deliveries` (`runId`, `status`, `nextAttemptAt`)',
      );
    }

    if (
      !(await hasIndex(
        'broadcast_deliveries',
        'idx_broadcast_deliveries_run_lockExpiresAt',
      ))
    ) {
      await queryRunner.query(
        'CREATE INDEX `idx_broadcast_deliveries_run_lockExpiresAt` ON `broadcast_deliveries` (`runId`, `lockExpiresAt`)',
      );
    }

    if (
      !(await hasIndex(
        'broadcast_deliveries',
        'uq_broadcast_deliveries_run_telegram',
      ))
    ) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX `uq_broadcast_deliveries_run_telegram` ON `broadcast_deliveries` (`runId`, `telegramId`)',
      );
    }

    if (
      !(await hasForeignKey(
        'broadcast_deliveries',
        'fk_broadcast_deliveries_run',
      ))
    ) {
      await queryRunner.query(
        'ALTER TABLE `broadcast_deliveries` ADD CONSTRAINT `fk_broadcast_deliveries_run` FOREIGN KEY (`runId`) REFERENCES `broadcast_runs`(`id`) ON DELETE CASCADE',
      );
    }

    if (
      !(await hasForeignKey(
        'broadcast_deliveries',
        'fk_broadcast_deliveries_user',
      ))
    ) {
      await queryRunner.query(
        'ALTER TABLE `broadcast_deliveries` ADD CONSTRAINT `fk_broadcast_deliveries_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL',
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

    const hasIndex = async (table: string, index: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [dbName, table, index],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasForeignKey = async (table: string, fk: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_NAME = ? AND TABLE_NAME = ? LIMIT 1`,
        [dbName, fk, table],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasTable('broadcast_deliveries')) {
      if (
        await hasForeignKey('broadcast_deliveries', 'fk_broadcast_deliveries_user')
      ) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_deliveries` DROP FOREIGN KEY `fk_broadcast_deliveries_user`',
        );
      }
      if (
        await hasForeignKey('broadcast_deliveries', 'fk_broadcast_deliveries_run')
      ) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_deliveries` DROP FOREIGN KEY `fk_broadcast_deliveries_run`',
        );
      }
      if (
        await hasIndex('broadcast_deliveries', 'uq_broadcast_deliveries_run_telegram')
      ) {
        await queryRunner.query(
          'DROP INDEX `uq_broadcast_deliveries_run_telegram` ON `broadcast_deliveries`',
        );
      }
      if (
        await hasIndex(
          'broadcast_deliveries',
          'idx_broadcast_deliveries_run_lockExpiresAt',
        )
      ) {
        await queryRunner.query(
          'DROP INDEX `idx_broadcast_deliveries_run_lockExpiresAt` ON `broadcast_deliveries`',
        );
      }
      if (
        await hasIndex(
          'broadcast_deliveries',
          'idx_broadcast_deliveries_run_status_nextAttemptAt',
        )
      ) {
        await queryRunner.query(
          'DROP INDEX `idx_broadcast_deliveries_run_status_nextAttemptAt` ON `broadcast_deliveries`',
        );
      }
      await queryRunner.query('DROP TABLE `broadcast_deliveries`');
    }

    if (await hasTable('broadcast_runs')) {
      if (
        await hasForeignKey('broadcast_runs', 'fk_broadcast_runs_requested_user')
      ) {
        await queryRunner.query(
          'ALTER TABLE `broadcast_runs` DROP FOREIGN KEY `fk_broadcast_runs_requested_user`',
        );
      }
      if (await hasIndex('broadcast_runs', 'idx_broadcast_runs_finishedAt')) {
        await queryRunner.query(
          'DROP INDEX `idx_broadcast_runs_finishedAt` ON `broadcast_runs`',
        );
      }
      if (await hasIndex('broadcast_runs', 'idx_broadcast_runs_status_createdAt')) {
        await queryRunner.query(
          'DROP INDEX `idx_broadcast_runs_status_createdAt` ON `broadcast_runs`',
        );
      }
      await queryRunner.query('DROP TABLE `broadcast_runs`');
    }
  }
}
