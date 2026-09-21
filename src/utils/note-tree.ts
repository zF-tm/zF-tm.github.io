export type FolderRecord = { category: string; name: string; slug: string; description?: string; parent: string | null; order: number };
export type NoteRecord<T = unknown> = { category: string; folder: string | null; slug: string; title: string; description: string; order: number; value: T };
export type TreeFolder<T = unknown> = FolderRecord & { type: 'folder'; children: TreeNode<T>[]; descendantNotes: number };
export type TreeNote<T = unknown> = NoteRecord<T> & { type: 'note' };
export type TreeNode<T = unknown> = TreeFolder<T> | TreeNote<T>;

export function validateFolderGraph(folders: FolderRecord[]) {
  const errors: string[] = [];
  const map = new Map(folders.map(folder => [folder.slug, folder]));
  if (map.size !== folders.length) errors.push('Folder slugs must be unique inside a category.');
  for (const folder of folders) {
    if (folder.parent && !map.has(folder.parent)) errors.push(`Folder “${folder.slug}” references a missing parent.`);
    const visited = new Set<string>(); let current: FolderRecord | undefined = folder;
    while (current?.parent) {
      if (visited.has(current.slug) || current.parent === folder.slug) { errors.push(`Folder “${folder.slug}” creates a circular hierarchy.`); break; }
      visited.add(current.slug); current = map.get(current.parent);
    }
  }
  return [...new Set(errors)];
}

export function folderChain(folders: FolderRecord[], slug: string | null) {
  if (!slug) return [];
  const map = new Map(folders.map(folder => [folder.slug, folder]));
  const chain: FolderRecord[] = []; const visited = new Set<string>(); let current = map.get(slug);
  while (current) {
    if (visited.has(current.slug)) throw new Error('Circular folder hierarchy.');
    visited.add(current.slug); chain.unshift(current); current = current.parent ? map.get(current.parent) : undefined;
  }
  return chain;
}

export function folderPath(folders: FolderRecord[], slug: string | null) { return folderChain(folders, slug).map(folder => folder.slug).join('/'); }
export function notePath<T>(folders: FolderRecord[], note: NoteRecord<T>) { return [note.category, folderPath(folders, note.folder), note.slug].filter(Boolean).join('/'); }

export function buildNoteTree<T>(folders: FolderRecord[], notes: NoteRecord<T>[]): TreeNode<T>[] {
  const errors = validateFolderGraph(folders); if (errors.length) throw new Error(errors.join(' '));
  const folderNodes = new Map(folders.map(folder => [folder.slug, { ...folder, type: 'folder' as const, children: [] as TreeNode<T>[], descendantNotes: 0 }]));
  const roots: TreeNode<T>[] = [];
  for (const node of folderNodes.values()) (node.parent ? folderNodes.get(node.parent)?.children : roots)?.push(node);
  for (const note of notes) { const node: TreeNote<T> = { ...note, type: 'note' }; (note.folder ? folderNodes.get(note.folder)?.children : roots)?.push(node); }
  const sort = (nodes: TreeNode<T>[]): number => {
    nodes.sort((a, b) => a.order - b.order || (a.type === b.type ? ('name' in a ? a.name : a.title).localeCompare('name' in b ? b.name : b.title) : a.type === 'folder' ? -1 : 1));
    let count = 0; for (const node of nodes) count += node.type === 'note' ? 1 : (node.descendantNotes = sort(node.children)); return count;
  };
  sort(roots); return roots;
}

export function flattenNotes<T>(tree: TreeNode<T>[]): TreeNote<T>[] {
  const result: TreeNote<T>[] = [];
  for (const node of tree) node.type === 'note' ? result.push(node) : result.push(...flattenNotes(node.children));
  return result;
}

export function isDescendant(folders: FolderRecord[], candidate: string, ancestor: string) { return folderChain(folders, candidate).some(folder => folder.slug === ancestor); }
