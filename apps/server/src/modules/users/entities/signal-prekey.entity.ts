import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DeviceEntity } from './device.entity';
import { UserEntity } from './user.entity';

@Entity('signal_prekeys')
export class SignalPrekeyEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId!: string;

  @Column({ name: 'key_id', type: 'integer' })
  keyId!: number;

  @Column({ name: 'public_key', type: 'bytea' })
  publicKey!: Buffer;

  @Column({ name: 'is_signed', type: 'boolean', default: false })
  isSigned!: boolean;

  @Column({ type: 'bytea', nullable: true })
  signature!: Buffer | null;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => DeviceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: DeviceEntity;
}
