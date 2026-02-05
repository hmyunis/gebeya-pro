import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBankAccounts20260205113000 implements MigrationInterface {
  name = 'CreateBankAccounts20260205113000';

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

    if (!(await hasTable('bank_accounts'))) {
      await queryRunner.query(`
        CREATE TABLE \`bank_accounts\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`bankName\` varchar(120) NOT NULL,
          \`logoUrl\` varchar(512) NULL,
          \`accountHolderName\` varchar(160) NOT NULL,
          \`accountNumber\` varchar(64) NOT NULL,
          \`status\` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
          PRIMARY KEY (\`id\`)
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

    if (await hasTable('bank_accounts')) {
      await queryRunner.query('DROP TABLE `bank_accounts`');
    }
  }
}
