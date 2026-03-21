import { ObjectSchema } from 'joi';

export function validateSchema<T>(schema: ObjectSchema<T>, data: unknown): T {
  const result = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
  });
  const error = result.error;
  const value = result.value as T;

  if (error) {
    const messages = error.details.map((detail) => detail.message).join('\n  - ');
    throw new Error(`Environment validation failed:\n  - ${messages}`);
  }

  return value;
}
