# 🧪 Testing Guide for Donations Platform

## Testing Philosophy

This project follows Test-Driven Development (TDD) principles:

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve the code while keeping tests green

## Testing Structure

```
tests/
├── backend/          # Backend API and service tests
│   ├── unit/          # Unit tests for individual functions
│   └── integration/   # Integration tests for API endpoints
├── frontend/         # Frontend React component tests
│   ├── unit/          # Unit tests for individual components
│   └── integration/   # Integration tests for component interactions
└── shared/           # Shared test utilities and mocks
```

## Running Tests

### Backend Tests

```bash
# Run all backend tests
cd Backend
npm test

# Run specific test file
npm test tests/backend/integration/campaigns.test.js
```

### Frontend Tests

```bash
# Run all frontend tests
cd Frontend
npm test

# Run with watch mode
npm test -- --watch
```

## Test Coverage

Aim for minimum 80% test coverage. Run coverage reports:

```bash
# Backend coverage
cd Backend
npm test -- --coverage

# Frontend coverage
cd Frontend
npm test -- --coverage
```

## Mocking Strategies

### API Mocking

Use `msw` (Mock Service Worker) for API mocking in frontend tests:

```javascript
// tests/shared/mocks/handlers.js
import { rest } from "msw";

export const handlers = [
  rest.post("/api/campaigns", (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          campaign_id: 1,
          ...req.body,
        },
      }),
    );
  }),
];
```

### Database Mocking

Use `sqlite3` in-memory database for backend tests:

```javascript
// tests/shared/testDatabase.js
const sqlite3 = require("sqlite3").verbose();

function createTestDatabase() {
  return new sqlite3.Database(":memory:", (err) => {
    if (err) throw err;
    console.log("Test database connected");
  });
}

module.exports = { createTestDatabase };
```

## Continuous Integration

Add test running to your CI/CD pipeline (GitHub Actions example):

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install

      - name: Run backend tests
        run: cd Backend && npm test

      - name: Run frontend tests
        run: cd Frontend && npm test
```

## Best Practices

1. **Test Naming:** Use descriptive names like `should create campaign when form is valid`
2. **Test Isolation:** Each test should be independent
3. **Arrange-Act-Assert:** Follow the AAA pattern
4. **Test Data:** Use realistic but simple test data
5. **Avoid Implementation Details:** Test behavior, not implementation
6. **Keep Tests Fast:** Unit tests should run in milliseconds
7. **Test Edge Cases:** Include boundary conditions and error cases

## Getting Started with TDD

1. **Pick a feature** (e.g., "Create Campaign form validation")
2. **Write a failing test** that describes the desired behavior
3. **Run the test** (it should fail)
4. **Write minimal code** to make the test pass
5. **Refactor** the code while keeping tests green
6. **Repeat** for the next feature

Example TDD workflow for the CreateCampaign component:

```bash
# 1. Write a test for form validation
# tests/frontend/unit/CreateCampaign.validation.test.jsx

# 2. Run the test (should fail)
npm test CreateCampaign.validation.test.jsx

# 3. Implement the validation logic in CreateCampaign.jsx

# 4. Run the test again (should pass)
npm test CreateCampaign.validation.test.jsx

# 5. Refactor if needed
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest for API testing](https://github.com/visionmedia/supertest)
- [MSW for API mocking](https://mswjs.io/)
- [TDD with React](https://kentcdodds.com/blog/write-tests)

Let's build a robust test suite together! 🚀
