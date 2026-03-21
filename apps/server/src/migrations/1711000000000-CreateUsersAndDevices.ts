import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndDevices1711000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await queryRunner.query(`
      CREATE TABLE users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone           VARCHAR(20) UNIQUE NOT NULL,
        phone_verified  BOOLEAN DEFAULT false,
        display_name    VARCHAR(100) NOT NULL,
        avatar_url      VARCHAR(500) NULL,
        bio             VARCHAR(500) NULL,
        is_online       BOOLEAN DEFAULT false,
        last_seen_at    TIMESTAMPTZ NULL,
        totp_secret     VARCHAR(255) NULL,
        totp_enabled    BOOLEAN DEFAULT false,
        recovery_codes  TEXT[] NULL,
        public_identities_key  BYTEA NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_users_phone ON users(phone)`);
    await queryRunner.query(
      `CREATE INDEX idx_users_display_name ON users USING gin(display_name gin_trgm_ops)`,
    );

    await queryRunner.query(`
      CREATE TABLE devices (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_name     VARCHAR(255) NOT NULL,
        platform        VARCHAR(50) NOT NULL,
        push_token      VARCHAR(500) NULL,
        refresh_token_hash VARCHAR(255) NULL,
        last_active_at  TIMESTAMPTZ DEFAULT NOW(),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_devices_user_id ON devices(user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS devices`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
