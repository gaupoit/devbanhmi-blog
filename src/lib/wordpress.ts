// WordPress REST API integration
// Update WORDPRESS_API_URL with your WordPress site URL

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

// Helper to strip HTML and truncate for meta description
export function getExcerptText(excerpt: string, maxLength: number = 160): string {
  const text = excerpt.replace(/<[^>]+>/g, '').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
