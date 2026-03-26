import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceIpAndLocation1711000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE devices
        ADD COLUMN ip_address VARCHAR(45) NULL,
        ADD COLUMN location VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE devices
        DROP COLUMN IF EXISTS location,
        DROP COLUMN IF EXISTS ip_address
    `);
  }
}
