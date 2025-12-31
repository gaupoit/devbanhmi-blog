import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, getExcerptText } from '../lib/wordpress';

export async function GET(context: APIContext) {
  const posts = await getPosts({ perPage: 20 });

  return rss({
    title: 'devbanhmi',
    description: 'CODE. CREATE. CRUNCH. Personal blog by Paul - documenting lessons learned in software engineering, AI, and startups.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title.rendered,
      pubDate: new Date(post.date),
      description: getExcerptText(post.excerpt.rendered),
      link: `/blog/${post.slug}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
