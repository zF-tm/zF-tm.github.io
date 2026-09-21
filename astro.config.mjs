import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const configuredBase = process.env.SITE_BASE ?? (repository ? `/${repository}` : '/');
const base = configuredBase || '/';
const basePrefix = base === '/' ? '' : base.replace(/\/$/, '');

function basePublicImages() {
  return (tree) => {
    const visit = (node) => {
      if (node?.tagName === 'img' && typeof node.properties?.src === 'string' && node.properties.src.startsWith('/images/')) node.properties.src = `${basePrefix}${node.properties.src}`;
      if (Array.isArray(node?.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://username.github.io',
  base,
  output: 'static',
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: true },
    processor: unified({ remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug, basePublicImages] })
  }
});
