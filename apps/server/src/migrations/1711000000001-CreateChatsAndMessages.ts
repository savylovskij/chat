import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatsAndMessages1711000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE chats (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type            VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
        name            VARCHAR(255) NULL,
        description     VARCHAR(1000) NULL,
        avatar_url      VARCHAR(500) NULL,
        created_by      UUID REFERENCES users(id),
        last_message_id UUID NULL,
        last_message_at TIMESTAMPTZ NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_chats_last_message_at ON chats(last_message_at DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE chat_members (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id              UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role                 VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        last_read_message_id UUID NULL,
        notifications_muted  BOOLEAN DEFAULT false,
        joined_at            TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(chat_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_chat_members_user_id ON chat_members(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id)`);

    await queryRunner.query(`
      CREATE TABLE messages (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id           UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id         UUID NOT NULL REFERENCES users(id),
        type              VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image', 'video', 'file', 'voice')),
        weight            VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (weight IN ('normal', 'important', 'urgent', 'whisper')),
        encrypted_content TEXT NULL,
        media_url         VARCHAR(500) NULL,
        media_metadata    JSONB NULL,
        reply_to_id       UUID NULL REFERENCES messages(id),
        timer             INTEGER NULL,
        is_edited         BOOLEAN DEFAULT false,
        edited_at         TIMESTAMPTZ NULL,
        deleted_at        TIMESTAMPTZ NULL,
        created_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_messages_chat_id_created ON messages(chat_id, created_at DESC)`,
    );
    await queryRunner.query(`CREATE INDEX idx_messages_sender_id ON messages(sender_id)`);
    await queryRunner.query(
      `CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE chat_members
        ADD CONSTRAINT fk_chat_members_last_read
        FOREIGN KEY (last_read_message_id) REFERENCES messages(id)
    `);

    await queryRunner.query(`
      CREATE TABLE message_deletions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deleted_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(message_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_msg_deletions_user ON message_deletions(user_id)`);

    await queryRunner.query(`
      CREATE TABLE message_reactions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji           VARCHAR(32) NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_reactions_message_id ON message_reactions(message_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE blocked_users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(blocker_id, blocked_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS blocked_users`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_reactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_deletions`);
    await queryRunner.query(
      `ALTER TABLE chat_members DROP CONSTRAINT IF EXISTS fk_chat_members_last_read`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS chat_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS chats`);
  }
}
