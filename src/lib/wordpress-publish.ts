// WordPress REST API - Publishing Functions
// Used by Claude to create/update blog posts

import 'dotenv/config';

const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'http://localhost:8080';
const WORDPRESS_USER = process.env.WORDPRESS_USER || 'admin';
const WORDPRESS_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD || '';

interface CreatePostOptions {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'publish' | 'draft' | 'pending';
  categories?: number[];
  tags?: number[];
  featured_media?: number;
}

interface UpdatePostOptions extends Partial<CreatePostOptions> {
  id: number;
}

interface WPPostResponse {
  id: number;
  slug: string;
  link: string;
  status: string;
  title: { rendered: string };
}

function getAuthHeader(): string {
  const credentials = `${WORDPRESS_USER}:${WORDPRESS_APP_PASSWORD.replace(/\s/g, '')}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function wpFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${WORDPRESS_API_URL}/wp-json/wp/v2/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create a new blog post
 */
export async function createPost(options: CreatePostOptions): Promise<WPPostResponse> {
  return wpFetch<WPPostResponse>('posts', {
    method: 'POST',
    body: JSON.stringify({
      title: options.title,
      content: options.content,
      excerpt: options.excerpt || '',
      status: options.status || 'draft',
      categories: options.categories || [],
      tags: options.tags || [],
      featured_media: options.featured_media || 0,
    }),
  });
}

/**
 * Update an existing blog post
 */
export async function updatePost(options: UpdatePostOptions): Promise<WPPostResponse> {
  const { id, ...data } = options;
  return wpFetch<WPPostResponse>(`posts/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Publish a draft post
 */
export async function publishPost(id: number): Promise<WPPostResponse> {
  return updatePost({ id, status: 'publish' });
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Array<{ id: number; name: string; slug: string }>> {
  return wpFetch('categories?per_page=100');
}

/**
 * Create a new category
 */
export async function createCategory(name: string): Promise<{ id: number; name: string; slug: string }> {
  return wpFetch('categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Get or create a category by name
 */
export async function getOrCreateCategory(name: string): Promise<number> {
  const categories = await getCategories();
  const existing = categories.find(
    (cat) => cat.name.toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    return existing.id;
  }

  const newCategory = await createCategory(name);
  return newCategory.id;
}

// CLI usage for testing
const args = process.argv.slice(2);
if (args[0] === 'test') {
  console.log('Testing WordPress API connection...');
  getCategories()
    .then((cats) => {
      console.log('✓ Connection successful!');
      console.log('Categories:', cats.map((c) => c.name).join(', '));
    })
    .catch((err) => {
      console.error('✗ Connection failed:', err.message);
    });
}
