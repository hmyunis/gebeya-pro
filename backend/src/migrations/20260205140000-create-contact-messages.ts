import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactMessages20260205140000 implements MigrationInterface {
  name = 'CreateContactMessages20260205140000';

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

    if (!(await hasTable('contact_messages'))) {
      await queryRunner.query(`
        CREATE TABLE \`contact_messages\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`name\` varchar(120) NOT NULL,
          \`contact\` varchar(160) NOT NULL,
          \`message\` varchar(100) NOT NULL,
          \`isRead\` tinyint NOT NULL DEFAULT 0,
          \`readByUserId\` int NULL,
          \`readAt\` datetime NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_contact_messages_isRead\` (\`isRead\`)
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

    if (await hasTable('contact_messages')) {
      await queryRunner.query('DROP TABLE `contact_messages`');
    }
  }
}

