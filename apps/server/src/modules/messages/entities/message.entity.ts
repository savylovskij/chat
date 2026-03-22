import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ChatEntity } from '../../chats/entities/chat.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId!: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  weight!: string;

  @Column({ name: 'encrypted_content', type: 'text', nullable: true })
  encryptedContent!: string | null;

  @Column({ name: 'media_url', type: 'varchar', length: 500, nullable: true })
  mediaUrl!: string | null;

  @Column({ name: 'media_metadata', type: 'jsonb', nullable: true })
  mediaMetadata!: Record<string, unknown> | null;

  @Column({ name: 'reply_to_id', type: 'uuid', nullable: true })
  replyToId!: string | null;

  @Column({ type: 'integer', nullable: true })
  timer!: number | null;

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited!: boolean;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ChatEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: ChatEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'sender_id' })
  sender!: UserEntity;

  @ManyToOne(() => MessageEntity)
  @JoinColumn({ name: 'reply_to_id' })
  replyTo!: MessageEntity | null;
}
