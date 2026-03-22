import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedia1711000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "media_type_enum" AS ENUM ('image', 'video', 'file', 'voice');
    `);

    await queryRunner.query(`
      CREATE TYPE "media_status_enum" AS ENUM ('pending', 'uploaded');
    `);

    await queryRunner.query(`
      CREATE TABLE "media" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "file_name" VARCHAR(500) NOT NULL,
        "mime_type" VARCHAR(100) NOT NULL,
        "file_size" INT NOT NULL,
        "type" "media_type_enum" NOT NULL,
        "status" "media_status_enum" NOT NULL DEFAULT 'pending',
        "s3_key" VARCHAR(500) NOT NULL,
        "thumbnail_s3_key" VARCHAR(500),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_media_user_id" ON "media" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_media_status" ON "media" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "media";`);
    await queryRunner.query(`DROP TYPE "media_status_enum";`);
    await queryRunner.query(`DROP TYPE "media_type_enum";`);
  }
}
