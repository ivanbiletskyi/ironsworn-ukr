export const loadMarkdownContent = async (filePath: string): Promise<string> => {
  try {
    // Add base path support for production deployments
    const basePath = import.meta.env.PROD ? '/ironsworn-ukr' : '';
    const fullPath = filePath.startsWith('/') ? `${basePath}${filePath}` : `${basePath}/${filePath}`;
    
    const response = await fetch(fullPath);
    
    if (!response.ok) {
      throw new Error(`Failed to load markdown: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error loading markdown file:', error);
    throw error;
  }
};
