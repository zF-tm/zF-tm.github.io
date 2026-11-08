---
title: Marshal MetaCTF Writeup
description: Marshal MetaCTF Writeup
date: '2026-11-08'
tags:
  - OSINT
published: true
slug: marshal-metactf-writeup
category: OSINT
---
# Marshal CTF Writeup

> **Event:** MetaCTF
> **Category:** OSINT
> **Flag:** `MetaCTF{S!lv3rst0n3_Scrut1ny#1950$Kx9}`

---

## Overview

In this challenge we were only given a name, **Saleh Prost**, who is an FIA employee.

We were asked to wrap his password in the flag format:

```
MetaCTF{<PASSWORD>}
```

---

## Solution

### Step 1: Google dork the name

Starting first of all by google dorking the name. Googling literally `"Saleh prost"` with the double quotes returned these results:

![Screenshot From 2026-11-08 17-34-56](/images/writeups/marshal-metactf-writeup/screenshot-from-2026-11-08-17-34-56.png)

Let's go to the first link:

![Screenshot From 2026-11-08 17-35-26](/images/writeups/marshal-metactf-writeup/screenshot-from-2026-11-08-17-35-26.png)

### Step 2: Find the GitHub repo

Opening the post, this was written:

```
<SNIP>
The source is up at github.com/SalehProst/marshal . It's rough, it's opinionated, and the docs assume you already know what a plank-wear log looks like — but if you work anywhere near timing or scrutineering, I'd genuinely love a second pair of eyes on the plugin loader.
<SNIP>
```

We found the github:

```
github.com/SalehProst/marshal
```

![Screenshot From 2026-11-08 17-36-58](/images/writeups/marshal-metactf-writeup/screenshot-from-2026-11-08-17-36-58.png)

### Step 3: Dig through the pull requests

Then I navigated to the repo's pull requests, and I can see that it's closed:

![Screenshot From 2026-11-08 17-37-57](/images/writeups/marshal-metactf-writeup/screenshot-from-2026-11-08-17-37-57.png)

![Screenshot From 2026-11-08 17-38-34](/images/writeups/marshal-metactf-writeup/screenshot-from-2026-11-08-17-38-34.png)

### Step 4: Recover the deleted password

We can navigate to the commit in the pull request, and we can find that the guy uploaded his `marshal.ini` **containing his password**, and then he deleted it.

![Screenshot From 2026-11-08 17-39-04](/images/writeups/marshal-metactf-writeup/screenshot-from-2026-11-08-17-39-04.png)

But we can see the password there:

```
S!lv3rst0n3_Scrut1ny#1950$Kx9
```

---

## Flag

```
MetaCTF{S!lv3rst0n3_Scrut1ny#1950$Kx9}
```
