// Jest setup for React Testing Library
import "@testing-library/jest-dom";

// Mock matchMedia for components that use it
global.matchMedia =
  global.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
  };

// Mock ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }

  observe() {
    this.cb([{ contentRect: { width: 1000, height: 1000 } }]);
  }

  unobserve() {}
  disconnect() {}
};

// Mock scrollTo for components that use it
global.scrollTo = jest.fn();

// Mock localStorage
global.localStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => delete store[key],
    clear: () => (store = {}),
  };
})();
