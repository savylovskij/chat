import Joi from 'joi';

import { validateSchema } from '../common/helpers/validate-schema.helper';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:8081'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().default('secure_messenger'),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_SSL: Joi.string().default('false'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),

  TOTP_ENCRYPTION_KEY: Joi.string().required(),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  S3_ENDPOINT: Joi.string().required(),
  S3_REGION: Joi.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: Joi.string().required(),
  S3_SECRET_ACCESS_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().required(),

  FIREBASE_PROJECT_ID: Joi.string().optional().allow(''),
  FIREBASE_PRIVATE_KEY: Joi.string().optional().allow(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().optional().allow(''),
}).unknown(true);

export function validateEnv(): void {
  Object.assign(process.env, validateSchema(envSchema, process.env));
}
