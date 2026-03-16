import React, { useEffect, useState, useRef } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { loadMarkdownContent } from '../utils/markdownLoader';
import { useLocation, Link, useParams } from 'react-router-dom';
import mermaid from 'mermaid';

interface MarkdownRendererProps {
  markdownPath: string; // The relative path in the public folder e.g., "en/1-Basics_1-Playing-Ironsworn.md"
  title?: string;
}

const Mermaid: React.FC<{ chart: string; isDark: boolean }> = ({ chart, isDark }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
    });

    const renderChart = async () => {
      try {
        if (ref.current) {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid parsing error:", err);
      }
    };

    renderChart();
  }, [chart, isDark]);

  return <div ref={ref} className="mermaid-container flex justify-center my-4 overflow-x-auto w-full" />;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdownPath, title }) => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { lang } = useParams();

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const content = await loadMarkdownContent(markdownPath);
        setMarkdownContent(content);
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError(`Не вдалося завантажити файл / Failed to load file: ${markdownPath}`);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [markdownPath]);

  // Handle scroll to specific anchor if present in hash
  useEffect(() => {
    if (!loading && markdownContent && contentRef.current) {
      const hash = location.hash;
      if (hash) {
        // Wait a small tick to ensure DOM is updated after markdown render
        setTimeout(() => {
          const id = hash.replace('#', '');
          const element = document.getElementById(id);
          if (element) {
            const yOffset = -80; // offset for fixed header
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 150);
      }
    }
  }, [loading, markdownContent, location.hash]);

  if (loading) {
    return (
      <div className="markdown-content">
        {title && <h1 className="page-title">{title}</h1>}
        <div className="loading">Завантаження / Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="markdown-content">
        {title && <h1 className="page-title">{title}</h1>}
        <div className="error-message" style={{ color: 'var(--danger)', padding: '2rem', textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  // Determine current theme to pass to markdown preview
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  return (
    <div className="markdown-content" ref={contentRef} data-color-mode={isDark ? 'dark' : 'light'}>
      {title && <h1 className="page-title">{title}</h1>}
      <MarkdownPreview
        source={markdownContent}
        wrapperElement={{
          "data-color-mode": isDark ? "dark" : "light"
        }}
        components={{
          code({ node, className, children, ref, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'mermaid') {
              const extractText = (childNode: any): string => {
                if (typeof childNode === 'string') return childNode;
                if (Array.isArray(childNode)) return childNode.map(extractText).join('');
                if (childNode && childNode.props && childNode.props.children) {
                  return extractText(childNode.props.children);
                }
                return '';
              };
              const codeString = extractText(children).replace(/\n$/, '');
              return <Mermaid chart={codeString} isDark={isDark} />;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          a: ({ ...props }) => {
            const href = props.href || '';
            
            // Handle external links normally
            if (href.startsWith('http') || href.startsWith('mailto:')) {
              return <a {...props} target="_blank" rel="noopener noreferrer" />;
            }

            // Handle pure hash links within the same page
            if (href.startsWith('#')) {
              return <Link to={`${location.pathname}${href}`} {...props} />;
            }

            // Handle internal markdown file links
            let internalPath = href;
            let hash = '';
            
            // Extract hash if present
            if (internalPath.includes('#')) {
              const parts = internalPath.split('#');
              internalPath = parts[0];
              hash = '#' + parts[1];
            }

            // Remove .md extension and relative prefixes
            internalPath = internalPath.replace(/\.md$/, '').replace(/^\.\//, '');
            
            // Construct absolute router path with current language
            const to = `/${lang || 'uk'}/${internalPath}${hash}`;
            
            return <Link to={to} {...props} />;
          }
        }}
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
};

export default MarkdownRenderer;
