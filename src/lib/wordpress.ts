// WordPress REST API integration
// Update WORDPRESS_API_URL with your WordPress site URL

import { marked } from 'marked';

// Configure marked for code highlighting
marked.setOptions({
  gfm: true,
  breaks: true,
});

const WORDPRESS_API_URL = import.meta.env.WORDPRESS_API_URL || 'https://your-wordpress-site.com';

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  featured_media: number;
  categories: number[];
  tags: number[];
  author: number;
  _embedded?: {
    author?: WPAuthor[];
    'wp:featuredmedia'?: WPMedia[];
    'wp:term'?: WPTerm[][];
  };
}

export interface WPAuthor {
  id: number;
  name: string;
  avatar_urls: { [key: string]: string };
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    sizes: {
      [key: string]: {
        source_url: string;
        width: number;
        height: number;
      };
    };
  };
}

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
}

async function fetchAPI<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${WORDPRESS_API_URL}/wp-json/wp/v2/${endpoint}`);

  // Add _embed to get author, featured image, and terms in one request
  url.searchParams.set('_embed', 'true');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getPosts(options: {
  perPage?: number;
  page?: number;
  categories?: number[];
  tags?: number[];
  search?: string;
} = {}): Promise<WPPost[]> {
  const params: Record<string, string> = {
    per_page: String(options.perPage || 10),
    page: String(options.page || 1),
    orderby: 'date',
    order: 'desc',
  };

  if (options.categories?.length) {
    params.categories = options.categories.join(',');
  }

  if (options.tags?.length) {
    params.tags = options.tags.join(',');
  }

  if (options.search) {
    params.search = options.search;
  }

  return fetchAPI<WPPost[]>('posts', params);
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const posts = await fetchAPI<WPPost[]>('posts', { slug });
  return posts[0] || null;
}

export async function getAllPostSlugs(): Promise<string[]> {
  try {
    const posts = await fetchAPI<WPPost[]>('posts', {
      per_page: '100',
      _fields: 'slug',
    });
    return posts.map((post) => post.slug);
  } catch (error) {
    console.warn('Could not fetch post slugs from WordPress:', error);
    return [];
  }
}

export async function getCategories(): Promise<WPCategory[]> {
  return fetchAPI<WPCategory[]>('categories', {
    per_page: '100',
    hide_empty: 'true',
  });
}

export async function getCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const categories = await fetchAPI<WPCategory[]>('categories', { slug });
  return categories[0] || null;
}

// Helper to extract featured image URL
export function getFeaturedImageUrl(post: WPPost, size: string = 'large'): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;

  return media.media_details?.sizes?.[size]?.source_url || media.source_url;
}

// Helper to get author info
export function getAuthor(post: WPPost): WPAuthor | null {
  return post._embedded?.author?.[0] || null;
}

// Helper to get categories from embedded terms
export function getPostCategories(post: WPPost): WPTerm[] {
  const terms = post._embedded?.['wp:term'] || [];
  return terms.flat().filter((term) => term.taxonomy === 'category');
}

// Helper to get tags from embedded terms
export function getPostTags(post: WPPost): WPTerm[] {
  const terms = post._embedded?.['wp:term'] || [];
  return terms.flat().filter((term) => term.taxonomy === 'post_tag');
}

// Helper to format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to strip HTML and Markdown, then truncate for meta description
export function getExcerptText(excerpt: string, maxLength: number = 160): string {
  let text = excerpt
    .replace(/&#8211;/g, '–')          // Decode en-dash FIRST
    .replace(/&#8212;/g, '—')          // Decode em-dash
    .replace(/&#\d+;/g, '')            // Remove other numeric entities
    .replace(/&amp;/g, '&')            // Decode ampersand
    .replace(/&nbsp;/g, ' ')           // Decode non-breaking space
    .replace(/<[^>]+>/g, '')           // Strip HTML tags
    .replace(/^#{1,6}\s+/gm, '')       // Strip Markdown headers (## ) at line start only
    .replace(/\*\*(.+?)\*\*/g, '$1')   // Strip bold **text**
    .replace(/\*(.+?)\*/g, '$1')       // Strip italic *text*
    .replace(/`([^`]+)`/g, '$1')       // Strip inline code `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Strip links [text](url)
    .trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Process content - handles Markdown within WordPress content
export function processContent(content: string): string {
  let processed = content;

  // FIRST: Process inline code to protect content from emphasis processing
  // Replace backtick code with placeholder to protect underscores
  const codeBlocks: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_, code) => {
    codeBlocks.push(code);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Process Markdown headers inside <p> tags: <p>## Header</p> -> <h2>Header</h2>
  processed = processed.replace(/<p>#{6}\s*(.+?)<\/p>/g, '<h6>$1</h6>');
  processed = processed.replace(/<p>#{5}\s*(.+?)<\/p>/g, '<h5>$1</h5>');
  processed = processed.replace(/<p>#{4}\s*(.+?)<\/p>/g, '<h4>$1</h4>');
  processed = processed.replace(/<p>#{3}\s*(.+?)<\/p>/g, '<h3>$1</h3>');
  processed = processed.replace(/<p>#{2}\s*(.+?)<\/p>/g, '<h2>$1</h2>');
  processed = processed.replace(/<p>#{1}\s*(.+?)<\/p>/g, '<h1>$1</h1>');

  // Process bold: **text** or __text__ -> <strong>text</strong>
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Process italic: *text* -> <em>text</em>
  // Only process asterisk-based italics (not underscores which break filenames)
  processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Restore inline code blocks
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return `<code>${codeBlocks[parseInt(index)]}</code>`;
  });

  // Process code blocks wrapped in <p> tags
  processed = processed.replace(/<p>(```[\s\S]*?```)<\/p>/g, '$1');
  processed = processed.replace(/<p>(~~~[\s\S]*?~~~)<\/p>/g, '$1');

  // Process fenced code blocks: ```lang\ncode\n``` -> <pre><code>
  processed = processed.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'plaintext';
    const escapedCode = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code class="language-${language}">${escapedCode}</code></pre>`;
  });

  // Process blockquotes: <p>> quote</p> -> <blockquote><p>quote</p></blockquote>
  processed = processed.replace(/<p>&gt;\s*(.+?)<\/p>/g, '<blockquote><p>$1</p></blockquote>');

  // Process horizontal rules: <p>---</p> or <p>***</p> -> <hr>
  processed = processed.replace(/<p>[-*_]{3,}<\/p>/g, '<hr>');

  // Process ordered lists: <p>1. item<br>2. item</p> -> <ol><li>item</li></ol>
  processed = processed.replace(/<p>(\d+\.\s+[\s\S]*?)<\/p>/g, (match) => {
    const items = match
      .replace(/<\/?p>/g, '')
      .split(/<br\s*\/?>|\n/)
      .map(item => item.trim())
      .filter(item => /^\d+\.\s+/.test(item))
      .map(item => `<li>${item.replace(/^\d+\.\s+/, '')}</li>`)
      .join('\n');
    return items.length > 0 ? `<ol>${items}</ol>` : match;
  });

  // Process unordered lists: <p>- item<br>- item</p> -> <ul><li>item</li></ul>
  processed = processed.replace(/<p>([-*]\s+[\s\S]*?)<\/p>/g, (match) => {
    const items = match
      .replace(/<\/?p>/g, '')
      .split(/<br\s*\/?>|\n/)
      .map(item => item.trim())
      .filter(item => /^[-*]\s+/.test(item))
      .map(item => `<li>${item.replace(/^[-*]\s+/, '')}</li>`)
      .join('\n');
    return items.length > 0 ? `<ul>${items}</ul>` : match;
  });

  return processed;
}
