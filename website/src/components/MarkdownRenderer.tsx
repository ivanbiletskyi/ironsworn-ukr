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

  // Handle scroll to search result or anchor hash
  useEffect(() => {
    if (!loading && markdownContent && contentRef.current) {
      const searchParams = new URLSearchParams(location.search);
      const searchQuery = searchParams.get('search');
      
      const hash = location.hash;
      
      if (searchQuery) {
        // Wait for the DOM to be fully rendered - sometimes it takes longer for large docs
        setTimeout(() => {
          const contentElement = contentRef.current;
          if (!contentElement) return;

          // Clear any previous highlights
          clearHighlights(contentElement);

          const allTextNodes = getTextNodes(contentElement);
          const lowerQuery = searchQuery.toLowerCase();
          
          const matchIndexParam = searchParams.get('matchIndex');
          const targetMatchIndex = matchIndexParam ? parseInt(matchIndexParam, 10) : 0;
          
          let currentMatchCount = 0;
          let found = false;
          
          for (const node of allTextNodes) {
            const text = node.textContent || '';
            const lowerText = text.toLowerCase();
            let pos = 0;
            
            while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
              if (currentMatchCount === targetMatchIndex) {
                const element = node.parentElement;
                if (element) {
                  highlightSpecificSearchText(node, searchQuery, pos);
                  scrollToElement(element);
                  found = true;
                  break;
                }
              }
              currentMatchCount++;
              pos += lowerQuery.length;
            }
            if (found) break;
          }
          
          // Fallback: search for first occurrence if specific index wasn't found (e.g., mismatch due to DOM differences)
          if (!found) {
            for (const node of allTextNodes) {
              if (node.textContent?.toLowerCase().includes(lowerQuery)) {
                const element = node.parentElement;
                if (element) {
                  highlightSpecificSearchText(node, searchQuery, node.textContent.toLowerCase().indexOf(lowerQuery));
                  scrollToElement(element);
                  break;
                }
              }
            }
          }
        }, 300); // Increased timeout for better reliability
      } else if (hash) {
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
  }, [loading, markdownContent, location.search, location.hash]);



  const scrollToElement = (element: HTMLElement) => {
    // block: 'center' ensures the element is clearly visible and not cut off by headers
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getTextNodes = (element: HTMLElement): Node[] => {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent?.trim()) {
        const parent = node.parentElement;
        // Skip code blocks and other non-content elements if needed
        if (parent && parent.tagName !== 'MARK' && parent.tagName !== 'CODE' && parent.tagName !== 'PRE') {
          textNodes.push(node);
        }
      }
    }
    return textNodes;
  };

  const clearHighlights = (container: HTMLElement) => {
    const marks = container.querySelectorAll('.search-mark-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });
  };

  const highlightSpecificSearchText = (node: Node, query: string, index: number) => {
    const text = node.textContent || '';
    
    if (index !== -1 && node.parentElement) {
      const parent = node.parentElement;
      const before = text.substring(0, index);
      const match = text.substring(index, index + query.length);
      const after = text.substring(index + query.length);
      
      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));
      
      const mark = document.createElement('mark');
      mark.className = 'search-mark-highlight';
      mark.textContent = match;
      mark.style.backgroundColor = 'var(--highlight)';
      mark.style.color = 'var(--text-primary)';
      mark.style.padding = '0.2em 0.4em';
      mark.style.borderRadius = '3px';
      mark.style.fontWeight = '600';
      fragment.appendChild(mark);
      
      if (after) fragment.appendChild(document.createTextNode(after));
      
      parent.replaceChild(fragment, node);
    }
  };

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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
          code({ node, className, children, ref, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'mermaid') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
