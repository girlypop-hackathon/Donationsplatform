// Jest configuration for the entire project
module.exports = {
  projects: [
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.{js,jsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/shared/setupTests.js'],
      moduleNameMapper: {
        '\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/shared/fileMock.js'
      },
      transform: {
        '^.+\.(js|jsx)$': ['babel-jest', { configFile: '<rootDir>/../config/babel.config.js' }]
      }
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/tests/backend/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/shared/backendSetup.js']
    }
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'Frontend/**/*.{js,jsx}',
    'Backend/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ]
};