// Підзаголовки (h2) відкритої сторінки книги для бічного меню — і той, що
// зараз у полі зору. Текст рендерить MarkdownRenderer асинхронно, тож
// стежимо за DOM, а не за станом React.

import { useEffect, useState } from 'react';

export interface PageHeading {
  id: string;
  text: string;
}

// Заголовки в книзі набрані капсом; у меню читаються легше звичайним регістром.
function sentenceCase(text: string): string {
  if (text !== text.toUpperCase()) return text;
  const lower = text.toLowerCase();
  return (lower.charAt(0).toUpperCase() + lower.slice(1)).replace(/ironsworn/gi, 'Ironsworn');
}

// Межа «прочитаності» заголовка — трохи нижче верхнього краю екрана.
const ACTIVE_OFFSET = 120;

export function usePageHeadings(markdownPath: string | null) {
  const [found, setFound] = useState<{ path: string; list: PageHeading[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!markdownPath) return;
    const selector = `.markdown-content[data-source="${CSS.escape(markdownPath)}"] h2[id]`;
    let elements: HTMLElement[] = [];
    let frame = 0;

    const updateActive = () => {
      frame = 0;
      let current: string | null = null;
      for (const el of elements) {
        if (el.getBoundingClientRect().top > ACTIVE_OFFSET) break;
        current = el.id;
      }
      setActiveId(current);
    };
    const scheduleActive = () => {
      if (!frame) frame = requestAnimationFrame(updateActive);
    };

    const collect = () => {
      elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const list = elements.map(el => ({ id: el.id, text: sentenceCase((el.textContent ?? '').trim()) }));
      setFound(prev =>
        prev?.path === markdownPath && prev.list.map(h => h.id).join() === list.map(h => h.id).join()
          ? prev
          : { path: markdownPath, list },
      );
      scheduleActive();
    };

    const root = document.querySelector('.content-wrapper') ?? document.body;
    const observer = new MutationObserver(collect);
    observer.observe(root, { childList: true, subtree: true });
    const initial = requestAnimationFrame(collect);
    // capture: прокручується .content-wrapper (десктоп) або вікно (мобільний).
    document.addEventListener('scroll', scheduleActive, { capture: true, passive: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(initial);
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('scroll', scheduleActive, { capture: true });
    };
  }, [markdownPath]);

  const headings = found && found.path === markdownPath ? found.list : [];
  return { headings, activeId: headings.some(h => h.id === activeId) ? activeId : null };
}
