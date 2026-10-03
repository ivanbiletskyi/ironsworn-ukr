// Спільні компоненти, які хост передає розширенням через HostApi.ui.

import { Link } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import type { MarkdownProps, NextLinkProps } from './api';
import { useLang } from './hostHooks';

export const Markdown = ({ source, linkBase }: MarkdownProps) => (
  <MarkdownRenderer content={source} linkBase={linkBase} />
);

export const NextLink = ({ to, title }: NextLinkProps) => {
  const lang = useLang();
  return (
    <div className="next-chapter-container">
      <Link to={to} className="next-chapter-btn" onClick={() => window.scrollTo(0, 0)}>
        <div className="btn-label">{lang === 'uk' ? 'Далі' : 'Next'}</div>
        <div className="btn-title">{title}</div>
        <span className="arrow">→</span>
      </Link>
    </div>
  );
};
