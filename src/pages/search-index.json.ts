import { getCollection } from 'astro:content';
import { entrySlug, noteSlug } from '../utils/content';
import { folderChain, notePath, type FolderRecord } from '../utils/note-tree';

export async function GET() {
  const [notes, writeups, categories, folderEntries] = await Promise.all([
    getCollection('notes', ({ data }) => data.published),
    getCollection('writeups', ({ data }) => data.published),
    getCollection('noteCategories'), getCollection('noteFolders')
  ]);
  const categoryNames = new Map(categories.map(category => [category.data.slug, category.data.name]));
  const folders = folderEntries.map(entry => entry.data as FolderRecord);
  const noteEntries = notes.map(entry => { const note = { category:entry.data.category,folder:entry.data.folder,slug:noteSlug(entry),title:entry.data.title,description:entry.data.description,order:entry.data.order,value:entry }; const category = categoryNames.get(entry.data.category) ?? entry.data.category; const chain=folderChain(folders.filter(folder=>folder.category===entry.data.category),entry.data.folder); return { type: 'notes', slug: note.slug, url: `/notes/${notePath(folders.filter(folder=>folder.category===entry.data.category),note)}/`, title: entry.data.title, description: entry.data.description, tags: entry.data.tags, category: ['Notes',category,...chain.map(folder=>folder.name)].join(' / '), body: (entry.body ?? '').slice(0, 12000) }; });
  const writeupEntries = writeups.map(entry => ({ type: 'writeups', slug: entrySlug(entry), url: `/writeups/${entrySlug(entry)}/`, title: entry.data.title, description: entry.data.description, tags: entry.data.tags, category: entry.data.category ?? '', body: (entry.body ?? '').slice(0, 12000) }));
  return new Response(JSON.stringify([...noteEntries, ...writeupEntries]), {
    headers: { 'Content-Type': 'application/json' }
  });
}
