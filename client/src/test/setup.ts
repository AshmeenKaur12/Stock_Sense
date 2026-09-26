import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

const createMatchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

if (!window.matchMedia) {
  window.matchMedia = createMatchMedia;
}

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

const resizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

window.ResizeObserver ??= resizeObserver;
