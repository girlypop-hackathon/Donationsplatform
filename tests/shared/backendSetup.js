// Jest setup for backend tests
const { TextEncoder, TextDecoder } = require('util');

// Polyfill for TextEncoder/TextDecoder if needed
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock database functions for testing
jest.mock('../../Backend/setup', () => ({
  initializeTestDatabase: jest.fn().mockResolvedValue({
    run: jest.fn((sql, params, callback) => {
      // Mock database insert
      if (sql.includes('INSERT INTO providers')) {
        callback(null);
      } else if (sql.includes('INSERT INTO campaigns')) {
        const mockResult = {
          lastID: 1
        };
        callback(null);
        return mockResult;
      } else {
        callback(null);
      }
    }),
    get: jest.fn((sql, params, callback) => {
      // Mock database select
      if (sql.includes('SELECT * FROM campaigns')) {
        callback(null, {
          campaign_id: 1,
          provider_id: 1,
          campaign_bio: 'Test Campaign',
          goal_amount: 5000,
          amount_raised: 0
        });
      } else {
        callback(null, null);
      }
    }),
    all: jest.fn((sql, params, callback) => {
      // Mock database select all
      if (sql.includes('SELECT * FROM campaigns')) {
        callback(null, [
          {
            campaign_id: 1,
            provider_id: 1,
            campaign_bio: 'Test Campaign',
            goal_amount: 5000,
            amount_raised: 0
          }
        ]);
      } else {
        callback(null, []);
      }
    }),
    close: jest.fn()
  }),
  closeTestDatabase: jest.fn()
}));