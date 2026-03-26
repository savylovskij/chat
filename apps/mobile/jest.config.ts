import type { Config } from 'jest';

const config: Config = {
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  setupFiles: ['./jest.setup.ts'],
  testEnvironment: 'node',
};

export default config;
