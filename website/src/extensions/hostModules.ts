// Спільні модулі для розширень. Бандл розширення не містить власного React
// чи router: Vite-пресет із extension-kit підміняє ці імпорти на модулі звідси.
// Два екземпляри React на сторінці зламали б хуки, а два router — контекст
// маршруту.
//
// Модуль підвантажується динамічно лише перед першим розширенням, тож
// звичайні відвідувачі не платять за повний namespace router.

import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as router from 'react-router-dom';
import { HOST_GLOBAL } from './api';

export function installHostModules(): void {
  const scope = globalThis as unknown as Record<string, unknown>;
  if (scope[HOST_GLOBAL]) return;
  scope[HOST_GLOBAL] = {
    modules: {
      react: React,
      'react/jsx-runtime': jsxRuntime,
      'react/jsx-dev-runtime': jsxDevRuntime,
      'react-router-dom': router,
      'react-router': router,
    },
  };
}
