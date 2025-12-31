import { createPost, getOrCreateCategory } from "../src/lib/wordpress-publish.ts";

// Category IDs (production):
// 2 = Lessons Learned
// 3 = Dev Tutorials
// 4 = Vibe Coding

async function publish() {
  const categoryId = 4; // Vibe Coding

  const content = `<p>I've been meaning to start a blog for years. Like most developers, I kept overthinking the tech stack and never shipped anything.</p>

<p>Last week, I finally did it. One afternoon. Zero to deployed.</p>

<p>Here's exactly how it went down.</p>

<h2>The Stack Decision</h2>

<p>I started by telling Claude Code: "I want to build a blog for devbanhmi.com."</p>

<p>Instead of jumping into code, Claude asked the right questions. Static or dynamic? Where am I hosting? Do I want a CMS or markdown files?</p>

<p>After evaluating options (Hugo, Next.js, Ghost), we landed on:</p>

<p><strong>Astro</strong> for the frontend. Static site generator with fast builds.</p>

<p><strong>WordPress</strong> as a headless CMS via REST API. I already know WP inside out from building plugins for 10+ years.</p>

<p><strong>Cloudflare Pages</strong> for hosting. Free, global CDN, zero config.</p>

<h2>The Pixel Art Theme</h2>

<p>The bánh mì branding wasn't planned. I had a rough idea for a pixel art aesthetic, uploaded a brand guidelines mockup, and Claude implemented it:</p>

<pre><code>.pixel-border {
  border: 4px solid #8B4513;
  box-shadow: 4px 4px 0 #5D3A1A;
}</code></pre>

<p>Press Start 2P font. Cream backgrounds. Chunky borders. Floating coffee cup animations.</p>

<p>It's ridiculous and I love it.</p>

<h2>The Workflow That Actually Works</h2>

<p>Here's the part that surprised me. I set up WordPress Application Passwords, gave Claude API access, and now my writing workflow is:</p>

<ol>
<li>Tell Claude what to write about</li>
<li>Review the draft</li>
<li>Say "publish it"</li>
<li>Claude hits the WordPress API</li>
<li>Deploy to Cloudflare when ready</li>
</ol>

<p>No wp-admin. No copy-pasting. Just conversation to published post.</p>

<h2>What I Learned</h2>

<p><strong>Claude Code is a force multiplier.</strong> I didn't write most of this code. I described what I wanted, reviewed what Claude produced, and course-corrected when needed. The pixel art SVGs? Claude generated those too.</p>

<p><strong>Start with constraints.</strong> Picking Cloudflare Pages early eliminated a bunch of decisions. Static output only. Environment variables for config. Simple.</p>

<p><strong>Ship first, polish later.</strong> The placeholder SVGs are basic. The mobile menu is minimal. Doesn't matter. It's live, it works, and I can iterate.</p>

<h2>The Numbers</h2>

<p>Time to first deploy: ~4 hours</p>

<p>Lines of code I wrote manually: Maybe 20</p>

<p>Total files: 15</p>

<p>Hosting cost: $0</p>

<h2>What's Next</h2>

<p>Replace placeholder pixel art with proper assets. Set up automatic deploys on git push. Actually write content (this is the hard part).</p>

<p>The blog is live at <a href="https://devbanhmi.com">devbanhmi.com</a>. The code is on <a href="https://github.com/gaupoit/devbanhmi-blog">GitHub</a>.</p>

<p>If you're still overthinking your blog setup, stop. Pick a stack. Ship it. Iterate.</p>`;

  const post = await createPost({
    title: "I Built This Blog in One Afternoon with Claude Code",
    excerpt: "How I went from zero to deployed pixel art blog using Astro, headless WordPress, and Cloudflare Pages, all orchestrated by Claude.",
    content,
    status: "publish",
    categories: [categoryId],
  });

  console.log("✓ Post published!");
  console.log("ID:", post.id);
  console.log("URL:", post.link);
  console.log("Slug:", post.slug);
}

publish().catch(console.error);
