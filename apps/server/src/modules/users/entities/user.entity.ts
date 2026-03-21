import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DeviceEntity } from './device.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone!: string;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio!: string | null;

  @Column({ name: 'is_online', type: 'boolean', default: false })
  isOnline!: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: 'totp_secret', type: 'varchar', length: 255, nullable: true })
  totpSecret!: string | null;

  @Column({ name: 'totp_enabled', type: 'boolean', default: false })
  totpEnabled!: boolean;

  @Column({ name: 'recovery_codes', type: 'text', array: true, nullable: true })
  recoveryCodes!: string[] | null;

  @Column({ name: 'public_identities_key', type: 'bytea', nullable: true })
  publicIdentitiesKey!: Buffer | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => DeviceEntity, (device) => device.user)
  devices!: DeviceEntity[];
}
