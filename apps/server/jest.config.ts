import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.service.ts', '**/*.gateway.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@shared/core$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@shared/(.*)$': '<rootDir>/../../../packages/shared/src/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@otplib|@scure|@noble|otplib)/)'],
};

export default config;
