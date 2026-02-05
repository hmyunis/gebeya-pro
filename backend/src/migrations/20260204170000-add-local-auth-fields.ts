import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalAuthFields20260204170000 implements MigrationInterface {
  name = 'AddLocalAuthFields20260204170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasColumn = async (column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasIndex = async (indexName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = ? LIMIT 1`,
        [dbName, indexName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (!(await hasColumn('loginUsername'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `loginUsername` varchar(32) NULL',
      );
    }
    if (!(await hasColumn('passwordHash'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255) NULL',
      );
    }
    if (!(await hasColumn('passwordLoginFailedAttempts'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `passwordLoginFailedAttempts` int NOT NULL DEFAULT 0',
      );
    }
    if (!(await hasColumn('passwordLoginLockedUntil'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `passwordLoginLockedUntil` datetime NULL',
      );
    }
    if (!(await hasIndex('IDX_users_loginUsername'))) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX `IDX_users_loginUsername` ON `users` (`loginUsername`)',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbName =
      (await queryRunner.query('SELECT DATABASE() AS name'))?.[0]?.name ?? '';

    const hasColumn = async (column: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ? LIMIT 1`,
        [dbName, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const hasIndex = async (indexName: string) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = ? LIMIT 1`,
        [dbName, indexName],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    if (await hasIndex('IDX_users_loginUsername')) {
      await queryRunner.query(
        'DROP INDEX `IDX_users_loginUsername` ON `users`',
      );
    }
    if (await hasColumn('passwordLoginLockedUntil')) {
      await queryRunner.query(
        'ALTER TABLE `users` DROP COLUMN `passwordLoginLockedUntil`',
      );
    }
    if (await hasColumn('passwordLoginFailedAttempts')) {
      await queryRunner.query(
        'ALTER TABLE `users` DROP COLUMN `passwordLoginFailedAttempts`',
      );
    }
    if (await hasColumn('passwordHash')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `passwordHash`');
    }
    if (await hasColumn('loginUsername')) {
      await queryRunner.query(
        'ALTER TABLE `users` DROP COLUMN `loginUsername`',
      );
    }
  }
}
