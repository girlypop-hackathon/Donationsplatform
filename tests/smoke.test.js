// Smoke test to verify testing setup works
describe("Testing Setup Smoke Test", () => {
  test("Jest is working correctly", () => {
    expect(true).toBe(true);
  });

  test("Basic arithmetic works", () => {
    expect(2 + 2).toBe(4);
  });

  test("Test environment is configured", () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
