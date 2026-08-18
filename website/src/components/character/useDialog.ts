// Спільна поведінка модальних екранів профілів (вікно вибору й фулскрін
// картки): Esc закриває, фокус замикається всередині, після закриття
// повертається на кнопку, що відкривала (PROFILES_PLAN.md §8).

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
}

export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  // Колбек через ref: інакше кожен рендер із новою стрілкою перезапускав би
  // ефект і щоразу відкидав фокус на початок діалога.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    (focusables(node)[0] ?? node)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables(ref.current);
      if (items.length === 0) return;
      const edge = event.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement !== edge) return;
      event.preventDefault();
      (event.shiftKey ? items[items.length - 1] : items[0]).focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return ref;
}
