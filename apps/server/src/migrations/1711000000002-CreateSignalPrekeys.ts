import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSignalPrekeys1711000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE signal_prekeys (
        id              SERIAL PRIMARY KEY,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        key_id          INTEGER NOT NULL,
        public_key      BYTEA NOT NULL,
        is_signed       BOOLEAN DEFAULT false,
        signature       BYTEA NULL,
        is_used         BOOLEAN DEFAULT false,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_prekeys_user_device ON signal_prekeys(user_id, device_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_prekeys_available ON signal_prekeys(user_id, is_used) WHERE is_used = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_prekeys_available;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_prekeys_user_device;`);
    await queryRunner.query(`DROP TABLE IF EXISTS signal_prekeys;`);
  }
}
