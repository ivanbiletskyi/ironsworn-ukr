import { CHAPTERS, UK_TITLES } from './chapters';

export interface SearchResult {
  path: string;
  title: string;
  excerpt: string;
  context: string;
  matches: number;
  matchIndex: number;
}

// Map files to SEARCHABLE_FILES structure
const SEARCHABLE_FILES = CHAPTERS.flatMap(chapter => 
  chapter.files.map(file => ({
    path: file,
    title: file.replace(`${chapter.prefix}_`, '').replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' '),
    category: chapter.prefix
  }))
);

const contentCache = new Map<string, string>();

const getBasePath = () => {
  return import.meta.env.PROD ? '/ironsworn-ukr' : '';
};

async function loadMarkdownContent(path: string, lang: string): Promise<string> {
  const fullPath = `${lang}/${path}`;
  if (contentCache.has(fullPath)) {
    return contentCache.get(fullPath)!;
  }

  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/${fullPath}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fullPath}: ${response.status}`);
    }
    const content = await response.text();
    contentCache.set(fullPath, content);
    return content;
  } catch (error) {
    console.error(`Failed to load markdown content: ${fullPath}`, error);
    return '';
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/>\s+/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function getExcerpt(content: string, query: string, contextChars: number = 150, startFrom: number = 0): { text: string; context: string; nextIndex: number } {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery, startFrom);
  
  if (index === -1) {
    const excerptText = content.substring(0, contextChars) + '...';
    return { text: excerptText, context: '', nextIndex: -1 };
  }

  const start = Math.max(0, index - contextChars / 2);
  const end = Math.min(content.length, index + query.length + contextChars / 2);
  
  let excerpt = content.substring(start, end);
  
  const contextStart = Math.max(0, index - 50);
  const contextEnd = Math.min(content.length, index + query.length + 50);
  const context = content.substring(contextStart, contextEnd);
  
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return { text: excerpt, context, nextIndex: index + query.length };
}

function getAllExcerpts(content: string, query: string, maxResults: number = 100): Array<{ text: string; context: string; matchIndex: number }> {
  const excerpts: Array<{ text: string; context: string; matchIndex: number }> = [];
  let startFrom = 0;
  let matchIndex = 0;
  
  while (excerpts.length < maxResults) {
    const result = getExcerpt(content, query, 150, startFrom);
    if (result.nextIndex === -1) break;
    
    excerpts.push({ text: result.text, context: result.context, matchIndex });
    matchIndex++;
    startFrom = result.nextIndex;
  }
  
  return excerpts;
}

function countMatches(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let count = 0;
  let pos = 0;
  
  while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
    count++;
    pos += lowerQuery.length;
  }
  
  return count;
}

export async function searchDocumentation(query: string, lang: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchQuery = query.trim();

  const searchPromises = SEARCHABLE_FILES.map(async (file) => {
    const content = await loadMarkdownContent(file.path, lang);
    const strippedContent = stripMarkdown(content);
    
    const fileTitle = lang === 'uk' && UK_TITLES[file.path] ? UK_TITLES[file.path] : file.title;
    const titleMatches = countMatches(fileTitle, searchQuery);
    const contentMatches = countMatches(strippedContent, searchQuery);
    const totalMatches = titleMatches * 5 + contentMatches;
    
    if (totalMatches > 0) {
      const route = `/${lang}/${file.path.replace('.md', '')}`;
      const excerpts = getAllExcerpts(strippedContent, searchQuery, 100);
      
      return excerpts.map(({ text, context, matchIndex }, index) => ({
        path: route,
        title: excerpts.length > 1 ? `${fileTitle} (${index + 1}/${excerpts.length})` : fileTitle,
        excerpt: text,
        context,
        matches: totalMatches,
        matchIndex
      }));
    }
    
    return [];
  });

  const searchResults = await Promise.all(searchPromises);
  const flatResults = searchResults.flat();
  
  return flatResults
    .filter((result): result is SearchResult => result !== null && result !== undefined)
    .sort((a, b) => b.matches - a.matches);
}

export function clearSearchCache(): void {
  contentCache.clear();
}
