import type { CollectionEntry } from 'astro:content';

export const entrySlug = (entry: CollectionEntry<'notes'> | CollectionEntry<'writeups'>) =>
  entry.data.slug ?? entry.id.replace(/\.(md|mdx)$/, '');

export const noteSlug = (entry: CollectionEntry<'notes'>) =>
  entry.data.slug ?? entry.id.replace(/\.(md|mdx)$/, '').split('/').pop()!;

export const byNewest = <T extends { data: { date: Date } }>(a: T, b: T) =>
  b.data.date.getTime() - a.data.date.getTime();

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
