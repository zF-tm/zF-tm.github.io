# Signal Notes

A polished, static-first personal knowledge base for computer science notes and cybersecurity writeups. The public site is built with Astro and deploys as plain HTML, CSS, and small client-side scripts. A separate localhost-only admin app manages Markdown, images, and Git publishing.

The production content collections intentionally start empty. The finished empty states are part of the site design.

## Architecture

- **Public site:** Astro static output in `dist/`; no server, database, credentials, or admin code is shipped.
- **Content:** versioned category JSON, recursive note-folder JSON, category-scoped note Markdown, and flat writeup Markdown under `src/content/`.
- **Admin:** Express plus a dependency-light vanilla browser interface. It binds to `127.0.0.1:4322` and writes only to approved content and image directories.
- **Publishing:** The admin stages content and article images, commits with Git, and pushes the current branch to `origin` using your existing local authentication.
- **Deployment:** GitHub Actions builds the site and deploys only `dist/` to GitHub Pages.

## Prerequisites

- Node.js 22.12 or newer
- npm
- Git
- A GitHub account and repository for deployment

Check your tools:

```bash
node --version
npm --version
git --version
```

## Initial setup

Clone your repository, enter it, and install dependencies:

```bash
git clone git@github.com:YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
npm install
```

If these files are not in a Git repository yet, create one:

```bash
git init
git branch -M main
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPOSITORY.git
git add .
git commit -m "Build personal knowledge base"
git push -u origin main
```

Never place a GitHub token in this project. The admin invokes your installed `git` command and relies on the authentication already configured on your computer.

## Run locally

Public site only:

```bash
npm run dev
```

Open the URL Astro prints, normally `http://localhost:4321`.

Local admin only:

```bash
npm run admin
```

Open `http://127.0.0.1:4322`. The server intentionally listens only on localhost.

Run both together:

```bash
npm run local
```

Other useful commands:

```bash
npm run check       # Type-check Astro and TypeScript
npm run build       # Validate and create the static dist/ output
npm run preview     # Preview the production build
npm run test:admin  # Exercise the admin content lifecycle API
```

## Customize the site

Edit [`src/config.ts`](src/config.ts) to change:

- `siteName`
- `siteDescription`
- `author`
- `github`
- primary navigation

The color, typography, spacing, and Markdown presentation tokens live near the top of [`src/styles/global.css`](src/styles/global.css). The default identity values are placeholders and are the only values you must replace for your own name and GitHub profile.

Astro determines the GitHub Pages base path automatically in Actions from `GITHUB_REPOSITORY`. Locally it uses `/`. To test a repository subpath locally, create an untracked `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Then set:

```dotenv
SITE_BASE=/your-repository-name
SITE_URL=https://your-username.github.io
```

`SITE_BASE=/` is correct for `username.github.io` repositories and custom domains. The `.env` file is ignored so machine-specific settings and future secrets cannot be committed accidentally.

## Create and manage content

1. Run `npm run admin` and open `http://127.0.0.1:4322`.
2. In **Notes**, choose **New Category**, enter one name, and press Enter. The category opens immediately; its slug and order are generated automatically.
3. Use the compact New Note and New Folder buttons. Creation asks only for a name and uses the current category or selected folder as the location.
4. Paste or type raw Markdown in the full-height editor. It autosaves after a short pause; `Ctrl/Cmd + S` saves immediately. Edit, Split, and Preview modes are available above the editor.
5. Organize the tree with drag-and-drop. The item menu also provides keyboard-accessible **Move up**, **Move down**, and **Move…** actions. A folder selected when you create another folder becomes its parent.
6. Click a note title to rename it. The note slug, Markdown filename, image location, and generated URL update together while its Markdown body is preserved.
7. Use the settings button only when you need optional metadata such as description, tags, slug, date, or public visibility. The editor itself always shows only the Markdown body.
8. Use **Import Markdown** or **Add Image** from the compact editor toolbar. Images are validated, stored in the correct static image folder, and inserted as Markdown.
9. Switch to **Writeups** for the separate flat writeup list and the same raw Markdown editor. New writeups ask for the category and comma-separated tags used by public filters; platform and difficulty remain optional settings.
10. Start or refresh `npm run dev`. Content marked visible appears automatically; hidden content remains out of public lists, routes, and search.

Existing articles appear in the admin library. Editing preserves the file. Changing the slug renames the Markdown file and its image directory. Delete requires confirmation and removes the Markdown file; its image directory is deliberately retained to avoid accidental image loss.

### Content filesystem

```text
src/content/note-categories/<category-slug>.json
src/content/note-folders/<category-slug>/<folder-slug>.json
src/content/notes/<category-slug>/<storage-key>.md
src/content/writeups/<slug>.md
public/images/notes/<category-slug>/<storage-key>/<image>
public/images/writeups/<slug>/<image>
```

Each note has exactly one category, an optional folder, and an explicit order in frontmatter. Folder metadata stores `parent` recursively, so a URL such as `/notes/wifi/attacks/wps/pixie-dust/` is generated entirely at build time. Markdown stays in its category directory; moving between folders updates metadata and the generated URL without a risky physical rewrite. Moving between categories still moves the Markdown and images.

Category and folder slugs are read-only after creation because they define published URLs. Note slugs are unique among siblings, so different folders may each contain a note such as `overview`; an internal storage key prevents file and image collisions without appearing in the public URL. Names, descriptions, parents, and order remain editable. The admin prevents cycles, missing parents, sibling slug collisions, and accidental overwrites. Deleting a nonempty folder requires explicitly moving its direct notes and child folders to the parent. Categories cannot be deleted while notes or folders remain.

Note frontmatter supports `title`, `description`, `date`, `category`, `folder`, `order`, `tags`, `slug`, and `published`. `folder: null` places a note at the category root. Writeups continue to support free-text `category`, `platform`, and `difficulty` without adopting the Notes hierarchy.

You can still edit files manually. A typical note begins like this:

```yaml
---
title: OSPF Basics
description: My notes about OSPF fundamentals.
date: 2026-09-21
tags:
  - networking
  - ccna
category: networking
folder: routing
order: 20
slug: ospf-basics
published: true
---
```

Markdown supports tables, task lists, footnotes supported by Astro, fenced code with syntax highlighting, heading anchors, images, links, blockquotes, and inline code. Public code blocks receive a copy button.

## Publish changes from the admin

Click **Publish changes** in the admin top bar. The review dialog shows the current branch, `origin`, and changed files. Enter a commit message and choose **Publish**.

The server uses argument-array process calls rather than shell strings. It stages only:

- `src/content/notes/`
- `src/content/note-categories/`
- `src/content/note-folders/`
- `src/content/writeups/`
- `public/images/notes/`
- `public/images/writeups/`

It does not force-push, pull, merge, or resolve conflicts. Unrelated repository edits remain unstaged. A successful push triggers the Pages workflow.

### GitHub authentication

GitHub CLI is the simplest HTTPS option:

```bash
gh auth login
gh auth status
```

Or configure an SSH key with GitHub and use an SSH remote:

```bash
git remote set-url origin git@github.com:YOUR-USERNAME/YOUR-REPOSITORY.git
ssh -T git@github.com
```

Both keep credentials outside the codebase. See GitHub's current authentication documentation if your organization requires SSO.

## Enable GitHub Pages

1. Push this project to a GitHub repository whose default branch is `main`.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**. Do not choose “Deploy from a branch.”
4. Open the repository's **Actions** tab and allow workflows if GitHub prompts you.
5. Push to `main`, or run **Deploy static site to GitHub Pages** manually from the Actions tab.
6. After the build and deploy jobs succeed, the Pages settings screen shows the public URL.

For a project repository, the URL is normally `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. The workflow exposes the repository name to Astro, which builds every internal link and asset URL with that subpath.

### Custom domain

Configure the domain in **Settings → Pages → Custom domain** and follow GitHub's DNS instructions. Then set `SITE_BASE=/` and `SITE_URL=https://your-domain.example` for the workflow. The simplest permanent setup is to add repository variables and adapt the build step:

```yaml
env:
  SITE_BASE: /
  SITE_URL: ${{ vars.SITE_URL }}
```

Add `SITE_URL` under **Settings → Secrets and variables → Actions → Variables**. If you want GitHub to retain domain configuration reliably, add a `public/CNAME` file containing only the domain name.

## Search, filters, and themes

Astro generates `search-index.json` during the static build from published Markdown. The browser searches titles, descriptions, tags, categories, and article bodies without an external service. Collection pages filter locally by text and metadata; clicking a tag filters the current collection. Search data and public pages never include drafts.

The theme toggle follows the operating-system preference on first visit and stores later choices in browser local storage. No analytics, cookies, or remote search services are included. Google Fonts are currently loaded from Google; replace the `@import` rules with self-hosted font files if you require a fully third-party-free site.

## Troubleshooting

### `git` command not found

Install Git using your operating system's official package or installer, restart the terminal, and confirm `git --version` works.

### Git remote is missing

Check and add `origin`:

```bash
git remote -v
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPOSITORY.git
```

### GitHub authentication failed

Run `gh auth status` if you use GitHub CLI, or `ssh -T git@github.com` for SSH. The admin never asks for or stores a token.

### Push rejected because the remote has commits

The admin refuses to force-push. In a terminal, fetch and integrate the remote changes normally:

```bash
git pull --rebase origin main
```

Resolve any conflict, run the site checks, and publish again. Use a merge instead if that is your repository policy.

### GitHub Pages shows 404

Confirm the workflow succeeded, **Settings → Pages → Source** is **GitHub Actions**, and the repository is public or your GitHub plan permits private Pages. Project Pages URLs require the repository-name suffix.

### CSS or links are missing on Pages

Do not hard-code the deployed subpath. Remove an incorrect `SITE_BASE` secret or variable; by default the Actions build derives `/<repository-name>` automatically. User sites named `username.github.io` and custom domains should use `SITE_BASE=/`.

### Markdown build fails

The build output names the invalid file and field. Open it in the admin, correct required metadata, or fix malformed YAML delimiters. Dates should use `YYYY-MM-DD`, tags should be a YAML list, and slugs should contain only lowercase letters, numbers, and hyphens.

### Node version errors

Run `node --version`. Upgrade to Node 22.12 or newer, remove `node_modules`, and run `npm install` again. Node 22 matches the deployment workflow.

### Admin port is occupied

Choose a different localhost port:

```bash
ADMIN_PORT=4330 npm run admin
```

Then open `http://127.0.0.1:4330`.
