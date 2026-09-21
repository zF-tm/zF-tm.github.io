import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const shared = {
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.coerce.date(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  published: z.boolean().default(true)
};

const notes = defineCollection({
  loader: glob({
    pattern: '**/[^_]*.{md,mdx}',
    base: './src/content/notes',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, '')
  }),
  schema: z.object({
    ...shared,
    category: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    folder: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable().default(null),
    order: z.number().int().min(0).default(100)
  })
});

const noteCategories = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/note-categories' }),
  schema: z.object({
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1),
    icon: z.string().max(40).optional(),
    order: z.number().int().default(100)
  })
});

const noteFolders = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/note-folders' }),
  schema: z.object({
    category: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().max(320).optional(),
    parent: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable().default(null),
    order: z.number().int().min(0).default(100)
  })
});

const writeups = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/writeups' }),
  schema: z.object({
    ...shared,
    platform: z.string().optional(),
    difficulty: z.string().optional()
  })
});

export const collections = { notes, noteCategories, noteFolders, writeups };
