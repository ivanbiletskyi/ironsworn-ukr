import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // cleanup() unmounts first — and unmounting flushes any pending state to
  // localStorage — so the store is only cleared afterwards.
  cleanup();
  // Node-середовище (`@vitest-environment node`) localStorage не має.
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
