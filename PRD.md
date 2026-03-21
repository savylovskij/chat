# PRD: Secure Messenger

## Document Purpose

This document is a complete technical specification for building "Secure Messenger". Optimized for stage-by-stage work with Claude Code.

### How to use this PRD

```
WORKFLOW ДЛЯ CLAUDE CODE:

1. Замовник каже: "Почни етап N"
2. Claude Code читає ТІЛЬКИ розділ етапу N + посилання "Дивись в PRD"
3. Claude Code виконує всі завдання етапу
4. Claude Code повідомляє: "Етап N виконано" + чеклист acceptance criteria
5. Замовник перевіряє і каже "далі" або "виправ: ..."
6. ТІЛЬКИ після підтвердження — перехід до етапу N+1

ПРАВИЛА:
- НЕ переходь до наступного етапу без підтвердження замовника
- НЕ змінюй код попередніх етапів без запиту
- Кожен етап повинен компілюватися і працювати самостійно
- Acceptance criteria — обов'язковий чеклист, не рекомендація
- Якщо щось незрозуміло — питай, не вигадуй
```

### Stage structure

| Stage | Name                                     | Depends on |
| ----- | ---------------------------------------- | ---------- |
| 1     | Monorepo init                            | —          |
| 2     | Backend — auth                           | 1          |
| 3     | Backend — chats & messages               | 2          |
| 4     | Backend — WebSocket gateway              | 3          |
| 5     | Backend — media & files                  | 3          |
| 6     | Frontend — foundation, theme, i18n, auth | 1, 2       |
| 7     | Frontend — chat list                     | 6, 4       |
| 8     | Frontend — chat screen                   | 7          |
| 9     | Frontend — reactions & combo             | 8          |
| 10    | Frontend — media & voice                 | 8, 5       |
| 11    | E2EE integration                         | 8          |
| 12    | Push notifications                       | 4          |
| 13    | Profile, settings, devices, storage      | 8          |
| 14    | Responsive design                        | 8          |
| 15    | Polish & performance                     | all        |
| 16    | CI/CD & deploy                           | all        |

---

## 1. Product Overview

### 1.1 What is it

Secure Messenger — a cross-platform chat app focused on security, similar to Telegram. Runs on Android, iOS, macOS, Windows. Frontend and backend live in a single monorepo.

### 1.2 Key Principles

- **TypeScript everywhere**: All code (frontend, backend, shared) is written in TypeScript with `strict: true`. No `any`, no `.js` files. Types for all API responses, WebSocket events, store state. Shared types in `packages/shared`.
- **Security-first**: End-to-end encryption by default, minimal data on server
- **Real-time**: messages appear instantly on all user devices
- **One codebase — 4 platforms**: maximum code reuse via Expo
- **Monorepo**: shared types, validation, contracts between frontend and backend

### 1.3 Functional Requirements

- Registration and login (phone number + SMS verification)
- Two-factor authentication (TOTP)
- Direct chats (1-on-1)
- Group chats (up to 200 members)
- Text messages with E2EE
- Message reactions (emoji)
- Photo, video, file sharing
- Voice messages
- Online/offline statuses
- Typing indicators
- Multi-device sync
- Push notifications
- User search
- Message editing and deletion

---

## 2. Technology Stack

### 2.1 General

| Layer           | Technology          | Version                                              |
| --------------- | ------------------- | ---------------------------------------------------- |
| Package manager | pnpm                | 9+                                                   |
| Monorepo        | pnpm workspaces     | —                                                    |
| Language        | TypeScript          | 5.4+ (strict: true, noImplicitAny, strictNullChecks) |
| Linting         | ESLint + Prettier   | latest                                               |
| Git hooks       | husky + lint-staged | latest                                               |

### 2.2 Frontend (apps/mobile)

| Technology                                | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| React Native                              | UI framework                                 |
| Expo SDK 52+                              | Cross-platform build, OTA updates            |
| Expo Router                               | File-based navigation                        |
| Zustand                                   | State management                             |
| Socket.IO Client                          | Real-time communication                      |
| React Native Reanimated 3                 | Animations                                   |
| @shopify/flash-list                       | High-performance message lists               |
| expo-image-picker                         | Photo/video picker                           |
| expo-av                                   | Voice message recording/playback             |
| expo-file-system                          | File system access                           |
| expo-secure-store                         | Secure storage for keys and tokens           |
| expo-notifications                        | Push notifications                           |
| react-native-gesture-handler              | Gestures (swipe reply, long press reactions) |
| @react-native-async-storage/async-storage | Local cache                                  |
| date-fns                                  | Date formatting                              |
| i18next + react-i18next                   | Internationalization (English)               |
| libsignal-protocol-typescript             | E2EE (Signal Protocol on client)             |

### 2.3 Backend (apps/server)

| Technology                          | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| NestJS 10                           | Backend framework                                |
| TypeORM                             | ORM for PostgreSQL                               |
| PostgreSQL 16                       | Main database                                    |
| Redis 7                             | Cache, sessions, presence, pub/sub               |
| Socket.IO + @nestjs/websockets      | Real-time gateway                                |
| @nestjs/platform-socket.io          | Socket.IO adapter                                |
| socket.io-redis-adapter (ioredis)   | Redis adapter for Socket.IO (horizontal scaling) |
| Passport.js + @nestjs/passport      | Auth strategies                                  |
| @nestjs/jwt                         | JWT tokens                                       |
| twilio (or vonage)                  | SMS OTP delivery                                 |
| otplib                              | TOTP generation and verification                 |
| qrcode                              | QR generation for 2FA                            |
| class-validator + class-transformer | DTO validation                                   |
| @nestjs/throttler                   | Rate limiting                                    |
| helmet                              | HTTP security headers                            |
| @aws-sdk/client-s3                  | S3-compatible file storage                       |
| sharp                               | Image compression, thumbnails                    |
| firebase-admin                      | Push notifications (FCM)                         |
| @nestjs/config                      | Configuration via .env                           |
| @nestjs/swagger                     | API documentation                                |

### 2.4 Shared (packages/shared)

| Contents              | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| DTO classes           | Shared between frontend and backend, with class-validator decorators |
| TypeScript interfaces | User, Chat, Message, Reaction etc.                                   |
| Enums                 | MessageType, ChatType, UserRole etc.                                 |
| Constants             | Limits, regex patterns, error codes                                  |
| WebSocket event types | Typed event names and payloads                                       |

### 2.5 Infrastructure (dev)

| Technology     | Purpose                                      |
| -------------- | -------------------------------------------- |
| Docker Compose | Local environment (PostgreSQL, Redis, MinIO) |
| MinIO          | S3-compatible storage for dev                |
| GitHub Actions | CI/CD                                        |
| EAS Build      | Mobile app builds                            |

### 2.6 ESLint, Prettier, Husky Configuration

#### .eslintrc.js (monorepo root)

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.base.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
    'prettier', // має бути останнім — вимикає правила що конфліктують з Prettier
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    'import/no-duplicates': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    {
      files: ['apps/mobile/**/*.{ts,tsx}'],
      extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
      plugins: ['react', 'react-hooks'],
      settings: { react: { version: 'detect' } },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react-hooks/exhaustive-deps': 'warn',
        'react/prop-types': 'off', // TypeScript замість PropTypes
      },
    },
    {
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', 'build/'],
};
```

**Required dev dependencies (root):**

```bash
pnpm add -Dw eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-import eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks
```

#### .prettierrc (monorepo root)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### .prettierignore

```
node_modules
dist
.expo
build
*.min.js
pnpm-lock.yaml
```

#### Husky + lint-staged

**Installation:**

```bash
pnpm add -Dw husky lint-staged
npx husky init
```

**.husky/pre-commit:**

```bash
#!/bin/sh
npx lint-staged
```

**lint-staged config in package.json (root):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

**Scripts in root package.json:**

```json
{
  "scripts": {
    "lint": "eslint 'apps/*/src/**/*.{ts,tsx}' 'packages/*/src/**/*.ts'",
    "lint:fix": "eslint 'apps/*/src/**/*.{ts,tsx}' 'packages/*/src/**/*.ts' --fix",
    "format": "prettier --write 'apps/*/src/**/*.{ts,tsx}' 'packages/*/src/**/*.ts'",
    "format:check": "prettier --check 'apps/*/src/**/*.{ts,tsx}' 'packages/*/src/**/*.ts'",
    "typecheck": "pnpm -r typecheck",
    "prepare": "husky"
  }
}
```

**Each package (apps/server, apps/mobile, packages/shared) adds to its package.json:**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 3. Monorepo Structure

```
secure-messenger/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + test + typecheck
│       └── deploy.yml                # Build + deploy
├── .husky/
│   └── pre-commit                    # lint-staged
├── apps/
│   ├── mobile/                       # Expo (React Native)
│   │   ├── app/                      # Expo Router (file-based routing)
│   │   │   ├── (auth)/               # Auth group
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── verify-2fa.tsx
│   │   │   ├── (main)/               # Main group (authenticated)
│   │   │   │   ├── (tabs)/
│   │   │   │   │   ├── _layout.tsx   # Tab navigator
│   │   │   │   │   ├── index.tsx     # Chat list
│   │   │   │   │   ├── contacts.tsx  # Contacts / user search
│   │   │   │   │   └── settings.tsx  # Settings
│   │   │   │   ├── chat/
│   │   │   │   │   ├── [id].tsx      # Chat room
│   │   │   │   │   └── info/[id].tsx # Chat info (members, media)
│   │   │   │   └── profile/
│   │   │   │       ├── edit.tsx      # Edit profile
│   │   │   │       └── security.tsx  # 2FA, devices
│   │   │   └── _layout.tsx           # Root layout
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── MessageInput.tsx
│   │   │   │   │   ├── ReactionPicker.tsx
│   │   │   │   │   ├── ReactionBadge.tsx
│   │   │   │   │   ├── VoiceRecorder.tsx
│   │   │   │   │   ├── VoicePlayer.tsx
│   │   │   │   │   ├── MediaPreview.tsx
│   │   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   │   ├── ChatListItem.tsx
│   │   │   │   │   └── MessageList.tsx
│   │   │   │   ├── common/
│   │   │   │   │   ├── Avatar.tsx
│   │   │   │   │   ├── OnlineIndicator.tsx
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   └── EmptyState.tsx
│   │   │   │   └── ui/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       ├── Modal.tsx
│   │   │   │       └── Toast.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSocket.ts       # Socket.IO connection management
│   │   │   │   ├── useChat.ts         # Chat operations
│   │   │   │   ├── useMessages.ts     # Messages with pagination
│   │   │   │   ├── useReactions.ts    # Add/remove reactions
│   │   │   │   ├── usePresence.ts     # Online/offline tracking
│   │   │   │   ├── useTyping.ts       # Typing indicators
│   │   │   │   ├── useAuth.ts         # Auth flow
│   │   │   │   ├── useMediaPicker.ts  # Photo/video/file selection
│   │   │   │   ├── useVoiceRecorder.ts # Voice recording
│   │   │   │   └── useCrypto.ts       # E2EE operations
│   │   │   ├── store/
│   │   │   │   ├── authStore.ts       # Tokens, user profile, 2FA status
│   │   │   │   ├── chatStore.ts       # Chat list, active chat, unread counts
│   │   │   │   ├── messageStore.ts    # Messages by chat, reactions, pagination
│   │   │   │   ├── presenceStore.ts   # Online statuses, typing indicators
│   │   │   │   └── cryptoStore.ts     # Local keys, Signal sessions
│   │   │   ├── services/
│   │   │   │   ├── api.ts             # Axios instance with interceptors
│   │   │   │   ├── socket.ts          # Socket.IO singleton
│   │   │   │   ├── auth.service.ts    # Auth API calls
│   │   │   │   ├── chat.service.ts    # Chat API calls
│   │   │   │   ├── message.service.ts # Message API calls
│   │   │   │   ├── media.service.ts   # Upload/download
│   │   │   │   ├── user.service.ts    # User API calls
│   │   │   │   └── push.service.ts    # Push notification registration
│   │   │   ├── crypto/
│   │   │   │   ├── signalManager.ts   # Signal Protocol session management
│   │   │   │   ├── keyStore.ts        # Local key storage (expo-secure-store)
│   │   │   │   ├── encrypt.ts         # Encrypt message before sending
│   │   │   │   └── decrypt.ts         # Decrypt received message
│   │   │   ├── utils/
│   │   │   │   ├── formatDate.ts
│   │   │   │   ├── formatFileSize.ts
│   │   │   │   └── debounce.ts
│   │   │   ├── i18n/
│   │   │   │   ├── index.ts               # i18next init
│   │   │   │   └── en.ts                  # English
│   │   │   ├── constants/
│   │   │   │   ├── theme.ts           # Colors, spacing, typography
│   │   │   │   └── config.ts          # API URL, limits
│   │   │   └── types/
│   │   │       └── navigation.ts      # Navigation param types
│   │   ├── assets/
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                        # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── jwt.strategy.ts
│       │   │   │   │   └── jwt-refresh.strategy.ts
│       │   │   │   ├── guards/
│       │   │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   │   ├── ws-auth.guard.ts   # WebSocket JWT guard
│       │   │   │   │   └── two-factor.guard.ts
│       │   │   │   ├── dto/
│       │   │   │   │   ├── register.dto.ts
│       │   │   │   │   ├── login.dto.ts
│       │   │   │   │   └── verify-2fa.dto.ts
│       │   │   │   └── decorators/
│       │   │   │       └── current-user.decorator.ts
│       │   │   ├── users/
│       │   │   │   ├── users.module.ts
│       │   │   │   ├── users.controller.ts
│       │   │   │   ├── users.service.ts
│       │   │   │   ├── entities/
│       │   │   │   │   ├── user.entities.ts
│       │   │   │   │   └── device.entities.ts
│       │   │   │   └── dto/
│       │   │   │       ├── update-profile.dto.ts
│       │   │   │       └── search-users.dto.ts
│       │   │   ├── chats/
│       │   │   │   ├── chats.module.ts
│       │   │   │   ├── chats.controller.ts
│       │   │   │   ├── chats.service.ts
│       │   │   │   ├── entities/
│       │   │   │   │   ├── chat.entities.ts
│       │   │   │   │   └── chat-member.entities.ts
│       │   │   │   └── dto/
│       │   │   │       ├── create-chat.dto.ts
│       │   │   │       └── add-member.dto.ts
│       │   │   ├── messages/
│       │   │   │   ├── messages.module.ts
│       │   │   │   ├── messages.controller.ts
│       │   │   │   ├── messages.service.ts
│       │   │   │   ├── entities/
│       │   │   │   │   ├── message.entities.ts
│       │   │   │   │   └── message-reaction.entities.ts
│       │   │   │   └── dto/
│       │   │   │       ├── send-message.dto.ts
│       │   │   │       ├── edit-message.dto.ts
│       │   │   │       └── add-reaction.dto.ts
│       │   │   ├── media/
│       │   │   │   ├── media.module.ts
│       │   │   │   ├── media.controller.ts
│       │   │   │   ├── media.service.ts
│       │   │   │   └── entities/
│       │   │   │       └── media.entities.ts
│       │   │   ├── keys/
│       │   │   │   ├── keys.module.ts
│       │   │   │   ├── keys.controller.ts
│       │   │   │   ├── keys.service.ts
│       │   │   │   └── entities/
│       │   │   │       └── prekey.entities.ts
│       │   │   └── gateway/
│       │   │       ├── gateway.module.ts
│       │   │       ├── chat.gateway.ts          # Main WebSocket gateway
│       │   │       ├── gateway.adapter.ts        # Redis adapter config
│       │   │       └── dto/
│       │   │           ├── ws-send-message.dto.ts
│       │   │           ├── ws-reaction.dto.ts
│       │   │           └── ws-typing.dto.ts
│       │   ├── common/
│       │   │   ├── filters/
│       │   │   │   └── all-exceptions.filter.ts
│       │   │   ├── interceptors/
│       │   │   │   └── transform.interceptor.ts
│       │   │   ├── pipes/
│       │   │   │   └── validation.pipe.ts
│       │   │   └── decorators/
│       │   │       └── api-paginated.decorator.ts
│       │   ├── config/
│       │   │   ├── database.config.ts
│       │   │   ├── redis.config.ts
│       │   │   ├── s3.config.ts
│       │   │   ├── jwt.config.ts
│       │   │   └── app.config.ts
│       │   ├── migrations/                      # TypeORM migrations
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       │   ├── e2e/
│       │   └── unit/
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                        # Спільний код
│       ├── src/
│       │   ├── dto/                   # Спільні DTO
│       │   │   ├── auth.dto.ts
│       │   │   ├── chat.dto.ts
│       │   │   ├── message.dto.ts
│       │   │   └── user.dto.ts
│       │   ├── interfaces/            # TypeScript інтерфейси
│       │   │   ├── user.interface.ts
│       │   │   ├── chat.interface.ts
│       │   │   ├── message.interface.ts
│       │   │   └── reaction.interface.ts
│       │   ├── enums/
│       │   │   ├── message-type.enum.ts    # text, image, video, file, voice
│       │   │   ├── chat-type.enum.ts       # direct, group
│       │   │   ├── member-role.enum.ts     # admin, member
│       │   │   └── ws-events.enum.ts       # Всі WebSocket event names
│       │   ├── constants/
│       │   │   ├── limits.ts          # MAX_GROUP_MEMBERS=200, MAX_FILE_SIZE, etc.
│       │   │   ├── regex.ts           # EMAIL_REGEX, PHONE_REGEX
│       │   │   └── error-codes.ts     # Типізовані коди помилок
│       │   └── index.ts               # Re-export all
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.yml                 # PostgreSQL + Redis + MinIO
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── pnpm-workspace.yaml                # workspace config
├── package.json                       # Root package.json
├── tsconfig.base.json                 # Base TS config
└── README.md
```

---

## 4. Database (PostgreSQL 16)

### 4.1 General Rules

- All tables use UUID v4 as primary key (except prekeys — SERIAL)
- All tables have `created_at TIMESTAMPTZ DEFAULT NOW()`
- Soft delete via `deleted_at TIMESTAMPTZ NULL` where needed
- Indexes on all FKs and frequently filtered fields
- TypeORM migrations for schema versioning

### 4.2 Table: users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20) UNIQUE NOT NULL,      -- E.164 format: +380XXXXXXXXX
    phone_verified  BOOLEAN DEFAULT false,
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500) NULL,
    bio             VARCHAR(500) NULL,
    is_online       BOOLEAN DEFAULT false,
    last_seen_at    TIMESTAMPTZ NULL,
    totp_secret     VARCHAR(255) NULL,               -- Encrypted, NULL = 2FA not enabled
    totp_enabled    BOOLEAN DEFAULT false,
    public_identities_key  BYTEA NULL,                 -- Signal Protocol identities key
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_display_name ON users USING gin(display_name gin_trgm_ops); -- для пошуку
```

### 4.3 Table: devices

```sql
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name     VARCHAR(255) NOT NULL,            -- "iPhone 15", "Chrome on Windows"
    platform        VARCHAR(50) NOT NULL,             -- ios, android, macos, windows
    push_token      VARCHAR(500) NULL,                -- FCM token
    refresh_token_hash VARCHAR(255) NULL,             -- Hashed refresh token
    last_active_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
```

### 4.4 Table: chats

```sql
CREATE TABLE chats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    name            VARCHAR(255) NULL,                -- NULL для direct, обов'язково для group
    description     VARCHAR(1000) NULL,
    avatar_url      VARCHAR(500) NULL,
    created_by      UUID REFERENCES users(id),
    last_message_id UUID NULL,                        -- Для сортування чатів
    last_message_at TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chats_last_message_at ON chats(last_message_at DESC);
```

### 4.5 Table: chat_members

```sql
CREATE TABLE chat_members (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id              UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                 VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_message_id UUID NULL REFERENCES messages(id),
    notifications_muted  BOOLEAN DEFAULT false,
    joined_at            TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(chat_id, user_id)
);

CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
```

### 4.6 Table: messages

```sql
CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id           UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id         UUID NOT NULL REFERENCES users(id),
    type              VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image', 'video', 'file', 'voice')),
    encrypted_content TEXT NULL,                       -- E2EE зашифрований контент (base64)
    media_url         VARCHAR(500) NULL,               -- S3 URL для медіа (зашифрований файл)
    media_metadata    JSONB NULL,                      -- { size, duration, width, height, mimeType, fileName }
    reply_to_id       UUID NULL REFERENCES messages(id),
    is_edited         BOOLEAN DEFAULT false,
    edited_at         TIMESTAMPTZ NULL,
    deleted_at        TIMESTAMPTZ NULL,                -- Soft delete (для всіх = deleteForEveryone)
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id_created ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
```

### 4.7a Table: message_deletions (delete "for me" only)

```sql
CREATE TABLE message_deletions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deleted_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_msg_deletions_user ON message_deletions(user_id);
```

**Deletion logic:**

- `deleteForMe` — record in `message_deletions`. Message stays for others. Server filters on query.
- `deleteForEveryone` — sets `messages.deleted_at`. Author only, within 48 hours. Broadcasts deletion to all members.

### 4.7b Table: blocked_users

```sql
CREATE TABLE blocked_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);
```

### 4.7 Table: message_reactions

```sql
CREATE TABLE message_reactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji           VARCHAR(32) NOT NULL,              -- Unicode emoji: "👍", "❤️", "😂" тощо
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(message_id, user_id, emoji)                 -- Один користувач = одна реакція одного типу
);

CREATE INDEX idx_reactions_message_id ON message_reactions(message_id);
```

### 4.8 Table: signal_prekeys

```sql
CREATE TABLE signal_prekeys (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    key_id          INTEGER NOT NULL,
    public_key      BYTEA NOT NULL,
    is_signed       BOOLEAN DEFAULT false,
    signature       BYTEA NULL,                        -- Тільки для signed prekeys
    is_used         BOOLEAN DEFAULT false,             -- One-time prekeys помічаються як використані
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prekeys_user_device ON signal_prekeys(user_id, device_id);
CREATE INDEX idx_prekeys_available ON signal_prekeys(user_id, is_used) WHERE is_used = false;
```

---

## 5. Security Architecture

### 5.1 Authentication

#### Registration

1. Client sends `POST /api/auth/register` with `{ phone, displayName }`
2. Server validates phone (E.164 format, uniqueness), sends SMS with 6-digit OTP code
3. Server generates 6-digit OTP, stores in Redis (TTL 5 min), sends via SMS (Twilio/Vonage)
4. Client sends `POST /api/auth/verify` with `{ phone, code }`
5. Server verifies OTP from Redis, creates user + device records
6. Returns `{ accessToken, refreshToken, user }`

#### Login

1. `POST /api/auth/login` with `{ phone, deviceName, platform }`
2. Server generates 6-digit OTP, stores in Redis (TTL 5 min), sends SMS
3. If 2FA enabled — returns `{ requires2FA: true, tempToken }` (tempToken valid 5 min, only for 2FA verify)
4. If 2FA not needed or passed — JWT tokens generated

#### JWT Tokens

- **Access token**: 15 minute TTL. Payload: `{ sub: userId, deviceId, iat, exp }`
- **Refresh token**: 30 day TTL. Stored as hash (SHA-256) in devices table
- **Rotation**: on each refresh old token invalidated, new one issued
- **Algorithm**: RS256 (RSA keys) for verification without secret

#### Refresh flow

1. `POST /api/auth/refresh` with `{ refreshToken }` in body (not cookie for React Native)
2. Server hashes received refresh token, compares with devices.refresh_token_hash
3. If match — generates new access+refresh pair, updates hash in DB
4. If no match — invalidates ALL refresh tokens for this user (possible theft)

### 5.2 Two-Factor Authentication (2FA)

#### Enabling

1. `POST /api/auth/2fa/enable` — server generates TOTP secret (via otplib), encrypts AES-256-GCM before DB save
2. Returns `{ secret, qrCodeUrl }` — QR for Google Authenticator / Authy
3. `POST /api/auth/2fa/confirm` with `{ code }` — first code verification, 2FA activation
4. Generates and returns one-time recovery codes (10 codes, hashed in DB)

#### Login Verification

1. After successful OTP verification, if `totp_enabled=true`, returns tempToken
2. `POST /api/auth/2fa/verify` with `{ tempToken, code }`
3. TOTP check with ±1 window (30 seconds each way)
4. Also accepts recovery code (one-time, deleted after use)

### 5.3 End-to-End Encryption (Signal Protocol)

#### Key Initialization (on registration/first device login)

1. Client generates:
   - **Identities Key Pair** (Curve25519) — long-term key pair
   - **Signed PreKey** (Curve25519) — signed by identities key, rotated monthly
   - **100 One-Time PreKeys** (Curve25519) — one-time keys
2. Private keys stored in expo-secure-store (device encrypted storage)
3. Public keys uploaded to server: `POST /api/keys/upload`
4. Server stores keys but HAS NO ACCESS to private keys

#### Session Establishment (X3DH)

1. Alice wants to message Bob for the first time
2. Alice requests Bob's keys: `GET /api/keys/:userId`
3. Server returns: Identities Key + Signed PreKey + One-Time PreKey (marks as used)
4. Alice performs X3DH: computes shared secret from 3-4 DH operations
5. Alice creates initial message with PreKey bundle
6. Bob on receiving performs his part of X3DH, establishes session

#### Message Encryption

1. Sender encrypts plaintext via Signal session (Double Ratchet)
2. Result — base64-encoded ciphertext
3. For each receiver device — separate ciphertext (multi-device)
4. Server stores encrypted blobs, cannot decrypt them

#### Group Chats

- Uses **Sender Keys** protocol (like Signal/WhatsApp)
- Sender creates SenderKey, distributes it via pairwise channels
- Each message encrypted once with SenderKey (efficient for groups)
- On group membership change — SenderKey regenerated

#### Media File Encryption

1. Random AES-256-GCM key generated
2. File encrypted with this key on client
3. Encrypted file uploaded to S3
4. AES key + IV + SHA-256 hash transmitted as part of encrypted message
5. Receiver: decrypts messages → gets key → downloads file → decrypts file

### 5.4 Additional security measures

- **Rate limiting**: 20 req/min for auth endpoints, 100 req/min for API, 30 msg/min for WebSocket
- **HTTPS/TLS 1.3**: mandatory for all connections
- **WSS**: WebSocket only via TLS
- **Helmet.js**: X-Content-Type-Options, X-Frame-Options, CSP headers
- **CORS**: explicit domain allowlist
- **Input validation**: class-validator on every DTO, whitelist: true (rejects unknown fields)
- **SQL injection**: parameterized queries via TypeORM
- **File validation**: magic bytes check (not just extension), size limit 50MB
- **Brute-force protection**: IP blocking after 10 failed logins in 15 minutes

---

## 6. Real-time Architecture (Socket.IO)

### 6.1 Connection

```typescript
// Клієнт підключається з JWT
const socket = io(WS_URL, {
  auth: { token: accessToken },
  transports: ['websocket'], // Пропускаємо long-polling для мобільних
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});
```

### 6.2 Server gateway (NestJS)

```typescript
@WebSocketGateway({
  cors: { origin: ALLOWED_ORIGINS },
  namespace: '/chat',
  adapter: RedisIoAdapter, // Для горизонтального масштабування
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // При підключенні:
  // 1. Верифікувати JWT з auth.token
  // 2. Приєднати socket до rooms: `user:${userId}` + всі chat rooms користувача
  // 3. Оновити is_online=true, повідомити контакти
  // При відключенні:
  // 1. Якщо більше немає активних сокетів цього користувача — is_online=false
  // 2. Оновити last_seen_at
  // 3. Повідомити контакти про offline
}
```

### 6.3 WebSocket events (full list)

#### Client → Server

| Event             | Payload                                                                                      | Description                                                               |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `message:send`    | `{ chatId, type, encryptedContent, mediaUrl?, mediaMetadata?, replyToId?, clientMessageId }` | Send message. `clientMessageId` — client-generated UUID for deduplication |
| `message:edit`    | `{ messageId, encryptedContent }`                                                            | Edit message                                                              |
| `message:delete`  | `{ messageId, mode: 'forMe' \| 'forEveryone' }`                                              | Delete message                                                            |
| `message:read`    | `{ chatId, messageId }`                                                                      | Mark message as read (and everything before it)                           |
| `reaction:add`    | `{ messageId, emoji }`                                                                       | Add reaction                                                              |
| `reaction:remove` | `{ messageId, emoji }`                                                                       | Remove reaction                                                           |
| `typing:start`    | `{ chatId }`                                                                                 | Started typing                                                            |
| `typing:stop`     | `{ chatId }`                                                                                 | Stopped typing                                                            |
| `presence:ping`   | `{}`                                                                                         | Heartbeat every 30 seconds                                                |

#### Server → Client

| Event              | Payload                                                 | Description                       |
| ------------------ | ------------------------------------------------------- | --------------------------------- |
| `message:new`      | `{ message, chatId }`                                   | New message in chat               |
| `message:edited`   | `{ messageId, chatId, encryptedContent, editedAt }`     | Message edited                    |
| `message:deleted`  | `{ messageId, chatId, mode: 'forMe' \| 'forEveryone' }` | Message deleted                   |
| `message:read`     | `{ chatId, userId, messageId }`                         | Someone read messages             |
| `reaction:added`   | `{ messageId, chatId, userId, emoji }`                  | Reaction added                    |
| `reaction:removed` | `{ messageId, chatId, userId, emoji }`                  | Reaction removed                  |
| `typing:update`    | `{ chatId, userId, isTyping }`                          | Typing status                     |
| `user:online`      | `{ userId, isOnline, lastSeenAt? }`                     | Online status change              |
| `chat:created`     | `{ chat }`                                              | New chat created (you were added) |
| `chat:updated`     | `{ chatId, changes }`                                   | Chat metadata updated             |
| `member:added`     | `{ chatId, user }`                                      | Member added to group             |
| `member:removed`   | `{ chatId, userId }`                                    | Member removed from group         |
| `error`            | `{ code, message }`                                     | Error                             |

### 6.4 Multi-device synchronization

Each user device connects via separate WebSocket. Mechanism:

1. On connection socket joins room `user:{userId}`
2. On message send server emits `message:new` to room `chat:{chatId}`
3. Since ALL user devices are in this room — they all receive messages
4. `clientMessageId` allows sender device to identify its own message and not show duplicate
5. Redis Adapter (`@socket.io/redis-adapter`) synchronizes events between server instances

### 6.5 Offline state handling

1. Messages are ALWAYS stored in DB via REST or WebSocket
2. On reconnect client requests `GET /api/chats/:id/messages?after={lastMessageId}`
3. Server returns missed messages
4. Push notification sent if user offline >10 seconds

### 6.6 Typing indicators

- `typing:start` debounced on client (sent max once per 3 seconds)
- Server auto-clears typing after 5 seconds without new `typing:start`
- Typing statuses NOT stored in DB — only via Redis pub/sub
- In group chats shows "X is typing..." or "X, Y are typing..."

---

## 7. REST API

### 7.1 General Rules

- Base URL: `/api/v1`
- All responses: `{ data: T, meta?: { page, limit, total } }`
- Errors: `{ statusCode, message, error, code }`
- Pagination: cursor-based (`?cursor={lastId}&limit=50`)
- Authorization: `Authorization: Bearer {accessToken}`
- Content-Type: `application/json` (except upload)

### 7.2 Auth Endpoints

```
POST   /api/v1/auth/register
  Body: { phone, displayName }
  Response: { accessToken, refreshToken, user }

POST   /api/v1/auth/login
  Body: { phone, deviceName, platform }
  Response: { tempToken }    -- Use tempToken to verify OTP

POST   /api/v1/auth/verify
  Body: { phone, code, tempToken }
  Response: { accessToken, refreshToken, user }
  Response: { accessToken, refreshToken, user }
       або { requires2FA: true, tempToken }

POST   /api/v1/auth/refresh
  Body: { refreshToken }
  Response: { accessToken, refreshToken }

POST   /api/v1/auth/logout
  Headers: Authorization
  Body: { refreshToken }
  Response: 204 No Content

POST   /api/v1/auth/2fa/enable
  Headers: Authorization
  Response: { secret, qrCodeDataUrl, manualEntryKey }

POST   /api/v1/auth/2fa/confirm
  Headers: Authorization
  Body: { code }
  Response: { recoveryCodes: string[] }

POST   /api/v1/auth/2fa/verify
  Body: { tempToken, code }
  Response: { accessToken, refreshToken, user }

POST   /api/v1/auth/2fa/disable
  Headers: Authorization
  Body: { code }
  Response: 204 No Content
```

### 7.3 User Endpoints

```
GET    /api/v1/users/me
  Headers: Authorization
  Response: { user }

PATCH  /api/v1/users/me
  Headers: Authorization
  Body: { displayName?, bio?, avatarUrl? }
  Response: { user }

GET    /api/v1/users/search?q={query}&limit=20
  Headers: Authorization
  Response: { users[] }

GET    /api/v1/users/:id
  Headers: Authorization
  Response: { user: { id, displayName, avatarUrl, bio, isOnline, lastSeenAt } }

GET    /api/v1/users/me/devices
  Headers: Authorization
  Response: { devices[] }

DELETE /api/v1/users/me/devices/:deviceId
  Headers: Authorization
  Response: 204 No Content
```

### 7.4 Keys endpoints (E2EE)

```
POST   /api/v1/keys/upload
  Headers: Authorization
  Body: { identitiesKey, signedPreKey: { keyId, publicKey, signature }, preKeys: [{ keyId, publicKey }] }
  Response: 201 Created

GET    /api/v1/keys/:userId
  Headers: Authorization
  Query: ?deviceId={deviceId}    -- опціонально, для конкретного пристрою
  Response: { identitiesKey, signedPreKey, oneTimePreKey? }

GET    /api/v1/keys/status
  Headers: Authorization
  Response: { availablePreKeys: number }   -- щоб клієнт знав when довантажити нові
```

### 7.5 Chat endpoints

```
GET    /api/v1/chats
  Headers: Authorization
  Query: ?cursor={lastChatId}&limit=20
  Response: { chats[], meta }
  -- Кожен чат включає: lastMessage, unreadCount, members (preview)

POST   /api/v1/chats
  Headers: Authorization
  Body: { type: 'direct' | 'group', memberIds: string[], name?, description? }
  -- Для direct: memberIds має один елемент (ID співрозмовника)
  -- Для direct: if чат вже існує — повертає існуючий
  Response: { chat }

GET    /api/v1/chats/:id
  Headers: Authorization
  Response: { chat }   -- Повні деталі з усіма учасниками

PATCH  /api/v1/chats/:id
  Headers: Authorization
  Body: { name?, description?, avatarUrl? }   -- Тільки для group, only admin
  Response: { chat }

DELETE /api/v1/chats/:id
  Headers: Authorization
  Response: 204 No Content    -- Тільки для group, only creator

POST   /api/v1/chats/:id/members
  Headers: Authorization
  Body: { userIds: string[] }   -- Тільки для group, only admin
  Response: { members[] }

DELETE /api/v1/chats/:id/members/:userId
  Headers: Authorization
  Response: 204 No Content    -- Admin видаляє учасника, або учасник виходить сам

PATCH  /api/v1/chats/:id/members/:userId/role
  Headers: Authorization
  Body: { role: 'admin' | 'member' }
  Response: { member }

POST   /api/v1/chats/:id/mute
  Headers: Authorization
  Body: { muted: boolean }
  Response: 204 No Content
```

### 7.6 Message Endpoints

```
GET    /api/v1/chats/:chatId/messages
  Headers: Authorization
  Query: ?cursor={messageId}&limit=50&direction=before|after
  Response: { messages[], meta }
  -- Автоматично фільтрує повідомлення з message_deletions для поточного user

GET    /api/v1/chats/:chatId/messages/:messageId
  Headers: Authorization
  Response: { message }

DELETE /api/v1/chats/:chatId/messages/:messageId
  Headers: Authorization
  Body: { mode: 'forMe' | 'forEveryone' }
  -- forMe: запис в message_deletions, не впливає на інших
  -- forEveryone: soft delete (deleted_at), only автор, протягом 48 год
  -- forEveryone: broadcast message:deleted всім учасникам чату
  -- forEveryone: показує "Повідомлення видалено" замість контенту
  Response: 204 No Content

DELETE /api/v1/chats/:chatId/messages
  Headers: Authorization
  Body: { mode: 'forMe', messageIds?: string[] }
  -- Bulk deletion "only для мене"
  -- Якщо messageIds не вказано — видаляє ВСІ повідомлення чату для цього юзера
  Response: 204 No Content

GET    /api/v1/chats/:chatId/messages/:messageId/reactions
  Headers: Authorization
  Response: { reactions: { emoji: string, users: User[] }[] }
```

### 7.6a Chat Deletion Endpoints

```
DELETE /api/v1/chats/:chatId
  Headers: Authorization
  Body: { mode: 'leave' | 'deleteForMe' | 'deleteForEveryone' }
  -- leave: вийти з чату (для груп). Чат залишається для інших.
  -- deleteForMe: чат зникає зі списку, повідомлення видаляються only для цього юзера.
     Реалізація: додати всі message_id в message_deletions + видалити запис з chat_members
     або додати прапорець hidden_at в chat_members.
  -- deleteForEveryone: повне видалення чату і всіх повідомлень (only для direct чатів,
     only if обидва учасники згодні, або для груп — only creator).
  Response: 204 No Content

POST   /api/v1/chats/:chatId/clear
  Headers: Authorization
  -- Очистити історію чату only for self (всі повідомлення → message_deletions)
  -- Чат залишається в списку, але порожній
  Response: 204 No Content
```

### 7.6b User Blocking Endpoints

```
POST   /api/v1/users/:userId/block
  Headers: Authorization
  -- Заблокувати користувача: він не може відправляти повідомлення, бачити онлайн-статус
  -- Direct чат з цим користувачем архівується
  Response: 204 No Content

DELETE /api/v1/users/:userId/block
  Headers: Authorization
  -- Розблокувати користувача
  Response: 204 No Content

GET    /api/v1/users/blocked
  Headers: Authorization
  Response: { users: User[] }
  -- Список заблокованих користувачів
```

### 7.7 Media Endpoints

```
POST   /api/v1/media/upload-url
  Headers: Authorization
  Body: { fileName, mimeType, fileSize }
  Response: { uploadUrl, mediaId, mediaUrl }
  -- Повертає presigned S3 URL для прямого завантаження з клієнта

GET    /api/v1/media/:mediaId
  Headers: Authorization
  Response: redirect to presigned download URL (короткий TTL)
```

---

## 8. Frontend (Implementation Details)

### 8.1 Expo configuration

```json
// app.json
{
  "expo": {
    "name": "Secure Messenger",
    "slug": "secure-messenger",
    "version": "1.0.0",
    "scheme": "securemessenger",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-av", { "microphonePermission": "Required for voice messages" }],
      ["expo-image-picker", { "photosPermission": "Required to send photos" }],
      "expo-notifications"
    ],
    "ios": { "bundleIdentifier": "com.securemessenger.app" },
    "android": { "package": "com.securemessenger.app" }
  }
}
```

### 8.2 Theme & Design

Interface style — Telegram-like:

- **Color scheme**: light theme by default, dark theme as option
- **Light**: bg #FFFFFF, sender bubbles #E3F2FD (blue), receiver bubbles #F5F5F5
- **Dark**: bg #1A1A2E, sender bubbles #1B4965, receiver bubbles #2D2D44
- **Accent**: #2196F3 (Material Blue)
- **Font**: System (San Francisco on iOS, Roboto on Android)
- **Avatars**: round, 48px in chat list, 36px in messages
- **Messages**: bubble tail (like Telegram), time at bottom-right

### 8.3 Chat List Screen

- List with `@shopify/flash-list` (estimatedItemSize: 76)
- Each item: avatar, name, last message (preview), time, unread badge
- Online indicator (green dot on avatar)
- Pull-to-refresh
- Swipe left → mute/archive
- FAB "New chat" button
- Chat search (local filter by name)

### 8.4 Chat Room Screen

- Inverted FlashList (newer messages at bottom)
- Infinite scroll up (loading older messages)
- Message bubbles:
  - Text: with link support (Linking)
  - Images: thumbnail, tap → fullscreen gallery
  - Video: thumbnail with play icon, tap → playback
  - Files: icon + name + size, tap → download
  - Voice: waveform visualization + play button + duration
- Reply: swipe right on message → show reply preview in input area
- Reactions:
  - Long press on message → ReactionPicker (6 quick + "..." for full list)
  - Quick reactions: 👍 ❤️ 😂 😮 😢 🔥
  - Under message — ReactionBadge (grouped: "👍3 ❤️2")
  - Tap on badge → list of who reacted
- Typing indicator at bottom of list
- Input area:
  - TextInput with auto-grow (max 6 lines)
  - "+" button on left (attach: photo, video, file)
  - Mic button on right (hold → record, release → send, swipe left → cancel)
  - Send button (replaces mic when text present)
- Header: avatar, name, status ("online" / "last seen 5 min ago"), info button

### 8.5 State management (Zustand stores)

#### authStore

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  requires2FA: boolean;
  tempToken: string | null;

  login: (phone: string) => Promise<void>;
  register: (phone: string, displayName: string) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

#### chatStore

```typescript
interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
  blockedUsers: string[]; // список заблокованих userId

  fetchChats: () => Promise<void>;
  createChat: (type: ChatType, memberIds: string[], name?: string) => Promise<Chat>;
  setActiveChat: (chatId: string | null) => void;
  updateUnreadCount: (chatId: string, count: number) => void;
  updateLastMessage: (chatId: string, message: Message) => void;
  // Видалення чату
  leaveChat: (chatId: string) => Promise<void>; // вийти з групи
  deleteChatForMe: (chatId: string) => Promise<void>; // видалити only for self
  deleteChatForEveryone: (chatId: string) => Promise<void>; // видалити для всіх (direct/creator)
  clearChatHistory: (chatId: string) => Promise<void>; // clear history for self
  // Blocking
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  // WebSocket handlers
  onChatCreated: (chat: Chat) => void;
  onChatUpdated: (chatId: string, changes: Partial<Chat>) => void;
  onChatDeleted: (chatId: string) => void;
}
```

#### messageStore

```typescript
interface MessageState {
  messagesByChat: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  pendingMessages: Message[]; // Optimistic UI

  fetchMessages: (chatId: string, cursor?: string) => Promise<void>;
  sendMessage: (
    chatId: string,
    content: string,
    type: MessageType,
    mediaUrl?: string,
  ) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, mode: 'forMe' | 'forEveryone') => Promise<void>;
  deleteAllMessages: (chatId: string) => Promise<void>; // clear history for self
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  // WebSocket handlers
  onNewMessage: (chatId: string, message: Message) => void;
  onMessageEdited: (messageId: string, content: string) => void;
  onMessageDeleted: (messageId: string, mode: 'forMe' | 'forEveryone') => void;
  onReactionAdded: (messageId: string, userId: string, emoji: string) => void;
  onReactionRemoved: (messageId: string, userId: string, emoji: string) => void;
}
```

#### presenceStore

```typescript
interface PresenceState {
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>; // chatId → userId[]
  lastSeen: Record<string, Date>;

  setOnline: (userId: string, isOnline: boolean) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  setLastSeen: (userId: string, date: Date) => void;
}
```

### 8.6 Socket.IO client service

```typescript
// services/socket.ts
class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.socket.on('connect', this.onConnect);
    this.socket.on('disconnect', this.onDisconnect);
    this.socket.on('connect_error', this.onError);

    // Реєстрація всіх обробників
    this.registerMessageHandlers();
    this.registerReactionHandlers();
    this.registerPresenceHandlers();
    this.registerChatHandlers();
  }

  // При реконнекті — запросити пропущені повідомлення
  private onConnect = () => {
    const chatStore = useChatStore.getState();
    chatStore.chats.forEach((chat) => {
      this.socket?.emit('chat:join', { chatId: chat.id });
    });
    // Sync missed messages
    this.syncMissedMessages();
  };

  private async syncMissedMessages(): Promise<void> {
    // Для кожного чату запитати повідомлення після останнього відомого
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Emit helpers
  sendMessage(data: WsSendMessageDto): void {
    this.socket?.emit('message:send', data);
  }

  addReaction(messageId: string, emoji: string): void {
    this.socket?.emit('reaction:add', { messageId, emoji });
  }

  startTyping(chatId: string): void {
    this.socket?.emit('typing:start', { chatId });
  }

  stopTyping(chatId: string): void {
    this.socket?.emit('typing:stop', { chatId });
  }
}

export const socketService = new SocketService();
```

### 8.7 Crypto module (client side)

```typescript
// crypto/signalManager.ts
class SignalManager {
  // Ініціалізація: генерація ключів, збереження в secure store
  async initialize(): Promise<KeyBundle>;

  // Встановлення сесії з іншим користувачем
  async createSession(userId: string, preKeyBundle: PreKeyBundle): Promise<void>;

  // Шифрування тексту для конкретного отримувача
  async encrypt(userId: string, plaintext: string): Promise<string>;

  // Дешифрування отриманого повідомлення
  async decrypt(userId: string, ciphertext: string): Promise<string>;

  // Шифрування файлу (AES-256-GCM)
  async encryptFile(
    fileUri: string,
  ): Promise<{ encryptedUri: string; key: string; iv: string; hash: string }>;

  // Дешифрування файлу
  async decryptFile(encryptedUri: string, key: string, iv: string): Promise<string>;
}
```

---

## 9. Docker Compose (dev environment)

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: secure_messenger
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 10. Environment Variables

```env
# .env.example

# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_messenger
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d

# 2FA
TOTP_ENCRYPTION_KEY=your-32-byte-aes-key-hex

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=secure-messenger
S3_REGION=us-east-1

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
FIREBASE_CLIENT_EMAIL=your-client-email

# CORS
CORS_ORIGINS=http://localhost:8081

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 11. Development Stages (sequence for Claude Code)

> **MAIN INSTRUCTION:**
>
> Each stage is an isolated unit of work. Execute ONLY the current stage.
>
> **Algorithm for each stage:**
>
> 1. Read "Goal" — understand WHAT we're building
> 2. Read "See PRD" — find those sections and read implementation DETAILS
> 3. Execute all "Tasks" items sequentially
> 4. Check every "Acceptance criteria" item — all must be ✅
> 5. Report to user: "Stage N complete" + list of what was done
> 6. STOP. Wait for "next" or fixes.
>
> **After each stage the code must:**
>
> - Compile without errors (`pnpm build` / `npx expo start`)
> - Run
> - Pass all acceptance criteria

### Dependencies between stages

| Stage | Name                                     | Depends on |
| ----- | ---------------------------------------- | ---------- |
| 1     | Monorepo init                            | —          |
| 2     | Backend — auth                           | 1          |
| 3     | Backend — chats & messages               | 2          |
| 4     | Backend — WebSocket gateway              | 3          |
| 5     | Backend — media & files                  | 3          |
| 6     | Frontend — foundation, theme, i18n, auth | 1, 2       |
| 7     | Frontend — chat list                     | 6, 4       |
| 8     | Frontend — chat screen                   | 7          |
| 9     | Frontend — reactions & combo             | 8          |
| 10    | Frontend — media & voice                 | 8, 5       |
| 11    | E2EE integration                         | 8          |
| 12    | Push notifications                       | 4          |
| 13    | Profile, settings, devices, storage      | 8          |
| 14    | Responsive design                        | 8          |
| 15    | Polish & performance                     | all        |
| 16    | CI/CD & deploy                           | all        |

---

### Stage 1: Monorepo Initialization

**Goal:** Set up project from scratch — monorepo, TypeScript, linting, Docker.

**See PRD:** Section 2 (stack), Section 3 (structure), Section 9 (Docker), Section 10 (env)

**Tasks:**

1. Create root `package.json` with `pnpm-workspace.yaml` (packages: `apps/*`, `packages/*`)
2. Set up `tsconfig.base.json`:
   - `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
   - paths alias for `@shared/*`
   - All project files — `.ts` / `.tsx`, no `.js`
3. Set up ESLint + Prettier (shared config at root)
4. Create `packages/shared/src/` with base types:
   - `types/user.ts`, `types/chat.ts`, `types/message.ts`
   - `enums/index.ts` (ChatType, MessageType, MessageWeight)
   - `dto/auth.dto.ts`, `dto/message.dto.ts`
   - `constants/ws-events.ts` (all WebSocket event names)
5. Create `apps/server` — NestJS 10 project with modular structure (empty modules: auth, users, chats, messages, media, keys, gateway)
6. Create `apps/mobile` — Expo SDK 52+ with Expo Router (file-based routing)
7. Create `docker-compose.yml` (PostgreSQL 16, Redis 7, MinIO)
8. Create `.env.example` with all variables (see Section 10)
9. Set up husky + lint-staged for pre-commit

**Acceptance criteria:**

- [ ] `pnpm install` works without errors
- [ ] `pnpm -r build` compiles all packages
- [ ] `pnpm lint` passes
- [ ] `docker compose up -d` starts PostgreSQL, Redis, MinIO
- [ ] `apps/server` starts on port 3000 and returns 200 on `/health`
- [ ] `apps/mobile` starts via `npx expo start`
- [ ] `packages/shared` imports in server and mobile without errors

---

### Stage 2: Backend — Authentication

**Goal:** Complete auth system: registration, login, JWT rotation, 2FA.

**See PRD:** Section 4.2-4.3 (tables users, devices), Section 5 (security), Section 7.1-7.3 (auth API)

**Tasks:**

1. Set up TypeORM with PostgreSQL (database.config.ts, entities auto-load)
2. Create entities: User, Device (per Section 4 schema)
3. Create and run migrations
4. Implement AuthModule:
   - `POST /auth/register` — phone validation (E.164), send SMS OTP
   - `POST /auth/login` — send SMS OTP, verify code, JWT generation (access 15min RS256 + refresh 30d)
   - `POST /auth/refresh` — refresh token rotation (old one invalidated)
   - `POST /auth/logout` — delete refresh token from devices
5. JWT strategy (Passport.js): JwtAuthGuard, WsAuthGuard
6. 2FA (otplib + qrcode):
   - `POST /auth/2fa/enable` — generate TOTP secret, return QR code
   - `POST /auth/2fa/confirm` — first verification + generate 10 recovery codes (hashed)
   - `POST /auth/2fa/verify` — login with 2FA code
   - `POST /auth/2fa/disable` — disable 2FA
7. Rate limiting: @nestjs/throttler (20 req/min on auth endpoints)
8. Helmet, CORS, global ValidationPipe (class-validator)
9. Swagger documentation

**Acceptance criteria:**

- [ ] Registering new user returns 201 with JWT
- [ ] Login with valid OTP returns access + refresh tokens
- [ ] Login with wrong/expired OTP returns 401
- [ ] Refresh token works and old one becomes invalid
- [ ] 2FA flow: enable → QR code → confirm → recovery codes → verify works
- [ ] Rate limiter blocks after 20 requests per minute
- [ ] Swagger available at /api/docs

---

### Stage 3: Backend — Chats & Messages

**Goal:** CRUD for chats, messages, reactions. Delete for me / for everyone. Blocking.

**See PRD:** Section 4.4-4.7b (tables chats, chat_members, messages, message_deletions, message_reactions, blocked_users), Section 7.4-7.6b (API)

**Tasks:**

1. Create entities: Chat, ChatMember, Message, MessageReaction, MessageDeletion, BlockedUser
2. Migrations
3. ChatsModule:
   - Create direct/group chats (direct deduplication)
   - Chat list with lastMessage, unreadCount, sorted by last_message_at
   - Member management (add, remove, change role)
   - `DELETE /chats/:id` with mode: leave | deleteForMe | deleteForEveryone
   - `POST /chats/:id/clear` — clear history for self
4. MessagesModule:
   - Save messages (text, image, video, file, voice)
   - Field `weight` (normal, important, urgent, whisper)
   - Field `timer` (null or seconds until disappearance)
   - Cursor-based pagination filtering message_deletions
   - `DELETE /messages/:id` with mode: forMe | forEveryone (48 hour limit)
   - Bulk delete for me
5. Reactions: add, remove, aggregation
6. Blocking: POST/DELETE `/users/:id/block`, GET `/users/blocked`

**Acceptance criteria:**

- [ ] Creating direct chat between two users
- [ ] Creating group chat with 3+ members
- [ ] Sending message with weight and timer fields
- [ ] Message pagination works (cursor + limit)
- [ ] "Delete for me" — message disappears only for the user
- [ ] "Delete for everyone" — message disappears for all (soft delete)
- [ ] "Delete for everyone" doesn't work after 48 hours
- [ ] User blocking works
- [ ] Clear chat history for self

---

### Stage 4: Backend — WebSocket Gateway

**Goal:** Real-time messages, typing, presence, multi-device sync.

**See PRD:** Section 6 (real-time architecture), WebSocket events table

**Tasks:**

1. Socket.IO + @nestjs/websockets + Redis adapter
2. ChatGateway:
   - handleConnection: JWT verification from query token, join rooms
   - handleDisconnect: cleanup, update online status
3. Event handlers:
   - `message:send` → save → broadcast (including weight, timer)
   - `message:edit` → update → broadcast
   - `message:delete` with `mode: forMe | forEveryone` → corresponding logic → broadcast
   - `message:read` → update last_read → broadcast
   - `reaction:add/remove` → DB → broadcast
   - `typing:start/stop` → Redis pub → broadcast
4. Presence:
   - Redis SET for connected sockets per user
   - Online/offline broadcast
   - Heartbeat: 30s ping, 60s timeout
5. Multi-device sync via user room

**Acceptance criteria:**

- [ ] WebSocket connection with JWT works
- [ ] Message from A instantly appears for B
- [ ] Typing indicator works in real-time
- [ ] Online/offline status updates
- [ ] When connected from 2 devices — both receive messages
- [ ] message:delete with mode forEveryone — broadcast to all

---

### Stage 5: Backend — Media & Files

**Goal:** Upload/download files via S3, thumbnails.

**See PRD:** Section 7.7 (media API)

**Tasks:**

1. S3 client (@aws-sdk/client-s3), MinIO-compatible
2. MediaModule:
   - `POST /media/upload-url` → presigned URL
   - Type and size validation (photos up to 10MB, videos up to 100MB, files up to 50MB)
   - `GET /media/:id` → presigned download URL
3. Sharp for thumbnails: on image upload → 200x200 thumbnail

**Acceptance criteria:**

- [ ] Presigned upload URL is generated
- [ ] File uploads to MinIO via presigned URL
- [ ] Thumbnail is created automatically for images
- [ ] Download URL works

---

### Stage 6: Frontend — Foundation, Theme, i18n, Auth

**Goal:** Mobile app foundation: Obsidian & Emerald theme, i18n, auth screens.

**See PRD:** Section 8 (frontend), Section 12 (i18n). Theme: Obsidian & Emerald.

**Tasks:**

1. Expo Router: `(auth)/login`, `(auth)/register`, `(tabs)/chats`, `(tabs)/settings`
2. Obsidian & Emerald theme:
   - bg `#1C1C22`, sidebar `#141418`, accent `#2DD48C`, text `#E8E8EC`
   - Font: SF Pro (system), iOS-style with blur navigation
   - Border-radius: 14-20px (iOS-style)
3. i18n: i18next + react-i18next (English only)
4. Avatar component: generative blob (Catmull-Rom spline from contact ID, variance 0.92-1.0, 6 points)
5. Online indicator: crescent (bar under avatar, pulse animation)
6. `services/api.ts` — Axios with JWT refresh interceptor
7. authStore (Zustand + expo-secure-store)
8. Screens: Login, Register, 2FA Verify, 2FA Setup
9. Auth guard in \_layout.tsx

**Acceptance criteria:**

- [ ] App launches with Obsidian & Emerald theme
- [ ] Language auto-detected, switches uk↔en
- [ ] Avatars are blob shapes, unique per ID
- [ ] Online indicator — crescent under avatar
- [ ] Login → Register → 2FA flow works
- [ ] JWT stored in secure store

---

### Stage 7: Frontend — Chat List

**Goal:** "Chats" screen with chat list + floating bubbles on top.

**See PRD:** Section 8.3

**Tasks:**

1. chatStore (Zustand): fetchChats, createChat, deleteChat, leaveChat, clearHistory, blockUser
2. Sidebar title: "Chats" (not "Secure Messenger")
3. Floating bubbles row on top of list:
   - Horizontal scroll of blob avatars
   - On chat selection — its avatar moves to first position
   - Size depends on message count
   - Unread badge on bubble (no typing dots on bubbles)
4. ChatListItem: blob avatar with crescent, name, preview, time, unread badge
5. Read status in preview: single check (delivered) / double (read)
6. Typing indicator in preview
7. FlashList with pull-to-refresh, skeleton loading
8. FAB → new chat
9. Socket.IO connection (useSocket hook)

**Acceptance criteria:**

- [ ] Floating bubbles row reorders on chat selection
- [ ] Unread badge on bubbles (no typing)
- [ ] Single/double check in preview based on read status
- [ ] Typing indicator in preview
- [ ] New chat creation works
- [ ] WebSocket connection established

---

### Stage 8: Frontend — Chat Screen

**Goal:** Full-featured chat screen with creative features.

**See PRD:** Section 8.4

**Tasks:**

1. messageStore (Zustand): fetchMessages, sendMessage, editMessage, deleteMessage (forMe/forEveryone), deleteAllMessages
2. MessageBubble with dynamic border-radius:
   - Single own: `20px 20px 6px 20px` (tail at bottom-right)
   - Single other: `20px 20px 20px 6px` (tail at bottom-left)
   - First in group: tail at bottom
   - Last in group: mirrored tail at top
   - Middle: even on both sides
3. Message font: 13px (no larger)
4. Message weight styles:
   - `whisper`: 12px, italic, muted opacity
   - `important`: green left border, 600 weight
   - `urgent`: red left border, 700 weight, pulsing glow
5. Timer messages: progress bar (green→yellow→red), text blurs, bubble dissolves
6. Per-chat accent: own bubble color = contact color (darkened)
7. Read receipts: single check (delivered, muted) / double (read, bright)
8. Date chips between messages ("today", "yesterday")
9. Time-as-space: larger gap on >5min pause, breathing line for >15min
10. Reply: context menu → reply preview in input → quote with sender-colored line
11. Ghost delete: blur → scale down → fade out (0.6s)
12. Message gravity: own "fly out" from right with arc+rotate, others from left
13. Live background: canvas particles (emerald dots)
14. Typing indicator in chat header
15. Inverted FlashList with infinite scroll

**Acceptance criteria:**

- [ ] Border-radius correct for all positions (single/first/middle/last)
- [ ] Single message has tail at bottom (NOT fully round)
- [ ] Weight styles visually distinct
- [ ] Timer message blurs and disappears
- [ ] Per-chat accent: different bubble colors in different chats
- [ ] Single/double check mark
- [ ] Ghost delete animation works
- [ ] Canvas particles on background

---

### Stage 9: Frontend — Reactions & Combo

**Goal:** Long-press popup with reactions + context menu. Combo chain.

**Tasks:**

1. Long press / right click → unified popup (Telegram-style):
   - Top: reactions row (👍 ❤️ 😂 😮 😢 🔥) with stagger animation
   - Bottom: menu (Reply, Copy, Edit, Delete for me, Delete for everyone, Forward)
   - Backdrop blur, spring animation
2. Reaction pills under message
3. Combo badge: 3+ same → "🔥 x4 COMBO!" with spring animation
4. Explosion: 3+ reactions → 8 confetti fly out
5. Delete for me / for everyone in context menu

**Acceptance criteria:**

- [ ] Long press opens popup with reactions + menu
- [ ] Combo badge at 3+ same reactions
- [ ] Confetti explosion
- [ ] "Delete for me" / "Delete for everyone" work

---

### Stage 10: Frontend — Media & Voice

**Goal:** Photos, videos, files, voice with mood waveform.

**See PRD:** Section 8 (media)

**Tasks:**

1. MediaPicker: gallery, camera, files (expo-image-picker, expo-document-picker)
2. Upload flow: presigned URL → S3 → message, progress indicator
3. Display: thumbnail → fullscreen, video player, file download
4. VoiceRecorder: hold mic → record → waveform + timer → send
5. Voice mood waveform: emerald (calm), amber (energy), gray (quiet)
6. Playback: play/pause, progress, speed (1x/1.5x/2x)

**Acceptance criteria:**

- [ ] Photo selection and sending works
- [ ] Voice records and sends
- [ ] Waveform with mood colors
- [ ] Upload progress visible

---

### Stage 11: E2EE Integration

**Goal:** End-to-end encryption via Signal Protocol.

**See PRD:** Section 5 (security)

**Tasks:**

1. libsignal-protocol-typescript
2. keyStore (expo-secure-store)
3. signalManager: key generation, public upload, sessions
4. Message flow: plaintext → encrypt → send / receive → decrypt → display
5. File encryption: AES-256-GCM before upload
6. Backend: prekey bundles, replenishment

**Acceptance criteria:**

- [ ] Messages encrypted before sending
- [ ] Received messages decrypted
- [ ] Server cannot see plaintext
- [ ] Files encrypted before upload

---

### Stage 12: Push Notifications

**Goal:** FCM push for offline users (no content).

**Tasks:**

1. Firebase Cloud Messaging + firebase-admin
2. Backend: push with chat_id + sender_name (no text!)
3. Frontend: expo-notifications, FCM token, handle tap → navigate

**Acceptance criteria:**

- [ ] Push arrives when user is offline
- [ ] Payload does NOT contain message text
- [ ] Tap opens corresponding chat

---

### Stage 13: Profile, Settings, Devices, Storage

**Goal:** Settings, devices (in chat window!), storage management, feed.

**See PRD:** Section 13 (storage), Section 12 (i18n)

**Tasks:**

1. Edit Profile: display name, avatar, bio
2. Security: 2FA toggle, linked phone number
3. Devices — opens IN CHAT WINDOW (main area), NOT in sidebar:
   - Device cards: name, OS, location, IP, last active
   - Current device with badge "this device"
   - "Terminate" button for other sessions
   - "Terminate all other sessions"
4. Chat Info: contact profile, members for groups
5. Feed in contact profile: micro-updates with colored line
6. Language: English only (i18n infrastructure ready for future languages)
7. Storage Management (see Section 13):
   - Cache size with diagram by categories
   - Breakdown by chats with "Clear"
   - Auto-cleanup: LRU, retention, limit
   - StorageService with expo-sqlite
   - MediaPlaceholder for uncached media

**Acceptance criteria:**

- [ ] Profile editable
- [ ] Devices open IN CHAT WINDOW
- [ ] Session termination works
- [ ] Feed visible in contact profile
- [ ] Language switches instantly
- [ ] Storage: size, clearing, auto-cleanup

---

### Stage 14: Responsive Design

**Goal:** Responsive on all screens.

**Tasks:**

1. Mobile (<768px): sidebar as sheet with overlay, reduced padding, fullscreen profile
2. Tablet (769-1100px): narrower sidebar (280px), profile (260px)
3. Desktop (>1100px): three-column layout
4. iOS blur on header and input bar (backdrop-filter)

**Acceptance criteria:**

- [ ] Mobile: sidebar sheet works
- [ ] Tablet: narrower sidebar
- [ ] Desktop: three columns
- [ ] Blur works

---

### Stage 15: Polish & Performance

**Goal:** Offline queue, optimistic UI, performance.

**Tasks:**

1. Offline queue: store messages → auto-send on reconnect
2. Optimistic UI: message with pending status, rollback on error
3. Performance: image caching, virtualization, bundle size
4. Error handling: error boundary, network toasts, retry
5. Testing on all platforms

**Acceptance criteria:**

- [ ] Offline message delivered on reconnect
- [ ] Optimistic UI works
- [ ] No lag with 1000+ messages
- [ ] Error toast on failure

---

### Stage 16: CI/CD & Deploy

**Goal:** Automation.

**Tasks:**

1. GitHub Actions: PR check (lint + typecheck + test), main (build + deploy), release (EAS)
2. Server Dockerfile: multi-stage, non-root, health check
3. EAS Build: dev, preview, production profiles, OTA updates

**Acceptance criteria:**

- [ ] PR check runs automatically
- [ ] Server deploys on push to main
- [ ] EAS build creates APK/IPA

---

## 12. Internationalization (i18n)

### 12.1 Language

The app ships with **English only**. The i18n infrastructure (i18next) is in place so additional languages can be added later.

### 12.2 Technical Implementation

Library: `i18next` + `react-i18next`

#### Initialization (i18n/index.ts)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

#### Translation file (i18n/en.ts)

```typescript
export default {
  // Auth
  'auth.login': 'Sign In',
  'auth.register': 'Sign Up',
  'auth.phone': 'Phone number',
  'auth.verifyCode': 'Enter verification code',
  'auth.displayName': 'Display Name',
  'auth.sendCode': 'Send verification code',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.logout': 'Log Out',

  // 2FA
  'auth.2fa.setup': '2FA Setup',
  'auth.2fa.scanQR': 'Scan QR code with authenticator app',
  'auth.2fa.enterCode': 'Enter 6-digit code',
  'auth.2fa.enabled': '2FA enabled!',
  'auth.2fa.recoveryCodes': 'Save recovery codes',

  // Chat
  'chat.newChat': 'New Chat',
  'chat.newGroup': 'Create Group',
  'chat.search': 'Search...',
  'chat.searchContacts': 'Search contacts...',
  'chat.typeMessage': 'Message...',
  'chat.typing': 'typing...',
  'chat.online': 'online',
  'chat.lastSeen': 'last seen {{time}}',
  'chat.members': '{{count}} members',
  'chat.photo': 'Photo',
  'chat.video': 'Video',
  'chat.file': 'File',
  'chat.voiceMessage': 'Voice message',
  'chat.slideToCancel': 'Slide to cancel',
  'chat.edited': 'edited',
  'chat.deleted': 'Message deleted',

  // Context menu
  'menu.reply': 'Reply',
  'menu.copy': 'Copy',
  'menu.edit': 'Edit',
  'menu.delete': 'Delete',
  'menu.deleteForMe': 'Delete for me',
  'menu.deleteForEveryone': 'Delete for everyone',
  'menu.forward': 'Forward',

  // Chat actions
  'chat.clearHistory': 'Clear history',
  'chat.clearHistoryConfirm': 'Clear all chat history? This only affects you.',
  'chat.deleteChat': 'Delete chat',
  'chat.deleteChatForMe': 'Delete for me only',
  'chat.deleteChatForAll': 'Delete for everyone',
  'chat.deleteChatConfirm': 'Delete this chat? This cannot be undone.',
  'chat.leaveGroup': 'Leave group',
  'chat.leaveGroupConfirm': "Leave this group? You won't see messages anymore.",
  'chat.messageDeleted': 'Message deleted',
  'chat.deleteTimeLimit': 'Delete for everyone available within 48 hours',

  // Blocking
  'user.block': 'Block',
  'user.unblock': 'Unblock',
  'user.blockConfirm': "Block {{name}}? They won't be able to message you.",
  'user.blocked': 'Blocked',
  'user.blockedList': 'Blocked users',

  // Settings
  'settings.title': 'Settings',
  'settings.editProfile': 'Edit Profile',
  'settings.notifications': 'Notifications',
  'settings.security': 'Security & 2FA',
  'settings.devices': 'Active Devices',
  'settings.theme': 'Appearance',
  'settings.storage': 'Data & Storage',

  // Storage
  'storage.title': 'Data & Storage',
  'storage.totalUsage': 'Used',
  'storage.clearAll': 'Clear all',
  'storage.clearChat': 'Clear',
  'storage.photos': 'Photos',
  'storage.videos': 'Videos',
  'storage.files': 'Files',
  'storage.voice': 'Voice',
  'storage.other': 'Other',
  'storage.keepMedia': 'Keep media',
  'storage.forever': 'Forever',
  'storage.maxCache': 'Cache limit',
  'storage.noLimit': 'No limit',
  'storage.autoDownload': 'Auto-download',
  'storage.wifiOnly': 'Wi-Fi only',
  'storage.always': 'Always',
  'storage.never': 'Never',
  'storage.tapToDownload': 'Tap to download',
  'storage.confirmClear': 'Clear cache? Media can be re-downloaded.',

  // Profile
  'profile.title': 'Profile',
  'profile.about': 'About',
  'profile.e2ee': 'End-to-end encrypted',
  'profile.members': 'Members',

  // Common
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.done': 'Done',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.delete': 'Delete',
  'common.confirm': 'Confirm',
  'common.today': 'Today',
  'common.yesterday': 'Yesterday',

  // Errors (mapped from backend error codes)
  'errors.AUTH_INVALID_CREDENTIALS': 'Invalid phone number or code',
  'errors.AUTH_2FA_REQUIRED': '2FA code required',
  'errors.CHAT_NOT_FOUND': 'Chat not found',
  'errors.MESSAGE_NOT_FOUND': 'Message not found',
  'errors.RATE_LIMIT': 'Too many requests, try again later',
};
```

### 12.3 Usage in components

```typescript
import { useTranslation } from 'react-i18next';

function ChatScreen() {
  const { t } = useTranslation();
  return <TextInput placeholder={t('chat.typeMessage')} />;
}
```

### 12.4 Backend error codes

Backend returns errors with codes (not text). Client maps code to translation:

```typescript
// Server returns:
{ statusCode: 400, code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' }

// Client displays:
t(`errors.${errorCode}`) // -> "Invalid phone number or code"
```

---

## 13. Storage Management

### 13.1 Overview

Similar to Telegram, users can control how much storage the app uses on their device. All media is cached locally for fast access but can be cleared without losing messages (media re-downloads from server when needed).

### 13.2 "Data & Storage" Screen (Settings → Storage)

#### General Info

Top section shows:

- **Total cache size** (e.g. "1.2 GB")
- **Pie chart** with breakdown: photos, videos, files, voice, other
- **"Clear all" button** — clears all cache with one tap

#### Breakdown by Category

List with size per category:

| Category | Includes                        | Icon     |
| -------- | ------------------------------- | -------- |
| Photos   | Cached images from chats        | Image    |
| Videos   | Cached videos                   | Video    |
| Files    | Downloaded documents            | FileText |
| Voice    | Cached voice messages           | Mic      |
| Other    | Thumbnails, preview, temp files | Database |

Each category is tappable, opens file list with option to delete individually.

#### Breakdown by Chat

Below — chat list sorted by storage used:

```
Олена Коваленко          248 MB    [Очистити]
Команда Розробки          156 MB    [Очистити]
Максим Бондаренко          42 MB    [Очистити]
...
```

"Clear" button next to each chat — clears cache for that chat only.

### 13.3 Auto-management

#### Auto-cleanup Settings

```
Keep media: [Always / 1 місяць / 1 тиждень / 3 дні]
Max cache size: [No limit / 1 GB / 2 GB / 5 GB]
Auto-download photos: [Wi-Fi / Wi-Fi + мобільні / Never]
Auto-download videos: [Wi-Fi / Never]
Auto-download files: [Wi-Fi / Never]
```

#### Auto-cleanup Logic

1. When cache hits limit — oldest files are deleted (LRU)
2. Files older than the configured period — deleted automatically on launch
3. Messages are NOT deleted — only local media cache
4. When opening message with cleared cache — media re-downloads from server
5. "Tap to download" placeholder instead of auto-download

### 13.4 Technical Implementation

#### Table: media_cache (local, SQLite via expo-sqlite)

```sql
CREATE TABLE media_cache (
    id              TEXT PRIMARY KEY,      -- media_id з сервера
    chat_id         TEXT NOT NULL,
    message_id      TEXT NOT NULL,
    type            TEXT NOT NULL,          -- photo, video, file, voice
    local_path      TEXT NOT NULL,          -- шлях в expo-file-system
    file_size       INTEGER NOT NULL,       -- розмір в байтах
    mime_type       TEXT,
    downloaded_at   INTEGER NOT NULL,       -- timestamp
    last_accessed   INTEGER NOT NULL        -- для LRU
);

CREATE INDEX idx_cache_chat ON media_cache(chat_id);
CREATE INDEX idx_cache_type ON media_cache(type);
CREATE INDEX idx_cache_accessed ON media_cache(last_accessed);
```

#### Cleanup service (services/storage.service.ts)

```typescript
interface StorageInfo {
  total: number; // загальний розмір в байтах
  byType: Record<'photo' | 'video' | 'file' | 'voice' | 'other', number>;
  byChat: Array<{ chatId: string; chatName: string; size: number }>;
}

interface StorageSettings {
  keepMediaDuration: 'forever' | '30d' | '7d' | '3d';
  maxCacheSize: number | null; // null = без ліміту
  autoDownloadPhoto: 'wifi' | 'always' | 'never';
  autoDownloadVideo: 'wifi' | 'never';
  autoDownloadFile: 'wifi' | 'never';
}

class StorageService {
  // Отримати інформацію про використання сховища
  async getStorageInfo(): Promise<StorageInfo>;

  // Очистити весь кеш
  async clearAll(): Promise<void>;

  // Очистити кеш конкретного чату
  async clearChat(chatId: string): Promise<void>;

  // Очистити кеш за категорією
  async clearByType(type: 'photo' | 'video' | 'file' | 'voice'): Promise<void>;

  // Видалити конкретний файл з кешу
  async removeFile(mediaId: string): Promise<void>;

  // Автоочищення за правилами
  async autoCleanup(settings: StorageSettings): Promise<number>; // повертає звільнений розмір

  // Перевірити чи файл є в кеші
  async isCached(mediaId: string): Promise<string | null>; // повертає local_path або null

  // Завантажити та кешувати файл
  async downloadAndCache(mediaId: string, chatId: string, messageId: string): Promise<string>;

  // Оновити last_accessed при перегляді
  async touch(mediaId: string): Promise<void>;

  // Отримати налаштування
  async getSettings(): Promise<StorageSettings>;
  async updateSettings(settings: Partial<StorageSettings>): Promise<void>;
}
```

#### Integration with message UI

When displaying media messages:

1. Check `isCached(mediaId)`
2. If exists — show from local path, call `touch()`
3. If not — show placeholder:
   - Photos: blurred thumbnail (always stored, ~5KB) + download icon
   - Videos: thumbnail + size + play icon
   - Files: type icon + name + size + "Download" button
   - Voice: empty waveform + duration + play button
4. On tap — download via `downloadAndCache()`, show progress

#### Auto-cleanup execution

```typescript
// При запуску додатку (app/_layout.tsx)
useEffect(() => {
  const cleanup = async () => {
    const settings = await storageService.getSettings();
    const freed = await storageService.autoCleanup(settings);
    if (freed > 0) {
      console.log(`Auto-cleanup freed ${formatFileSize(freed)}`);
    }
  };
  cleanup();
}, []);
```

### 13.5 File structure (addition)

```
src/
├── services/
│   └── storage.service.ts          # StorageService
├── screens/ (або app/)
│   └── settings/
│       └── storage.tsx              # Екран управління сховищем
├── components/
│   └── chat/
│       ├── MediaPlaceholder.tsx     # Placeholder для некешованої медіа
│       └── DownloadProgress.tsx     # Індикатор завантаження
├── store/
│   └── storageStore.ts             # Zustand store для кешу
└── db/
    └── cache.ts                     # expo-sqlite wrapper для media_cache
```

### 13.6 Translations (i18n addition)

Storage translation keys are already included in the main en.ts file (Section 12). No separate file needed.

---

## 14. Limitations and Known Trade-offs

- **Desktop**: macOS and Windows support via Expo Web or separate react-native-macos/windows. MVP focuses on iOS + Android, desktop added later
- **Group E2EE**: Sender Keys are harder to implement, can start with pairwise encryption and optimize later
- **Voice/video calls**: NOT in scope for this PRD
- **Stories/Channels**: NOT in scope
- **Message search**: difficult with E2EE since server cannot see content. Can implement local search
- **Backup/restore**: requires separate design for E2EE keys
