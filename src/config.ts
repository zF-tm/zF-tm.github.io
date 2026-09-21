export const siteConfig = {
  siteName: "Nabil's Personal Website",
  siteDescription: 'A personal field guide to computer science and cybersecurity.',
  author: 'Your Name',
  github: 'https://github.com/username',
  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Notes', href: '/notes/' },
    { label: 'Writeups', href: '/writeups/' },
    { label: 'Search', href: '/search/' }
  ]
} as const;

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}` || '/';
}
