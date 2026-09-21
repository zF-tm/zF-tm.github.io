---
title: Overview
description: Overview
date: '2026-09-21'
tags: []
published: true
slug: overview
category: wifi
folder: online-bruteforcing
order: 10
---
# Online PIN Brute-Forcing: The Easy Guide

## What is it?

Online PIN brute-forcing means guessing the WPS PIN **directly against the router**, one attempt at a time, until you find the right one.

The two most popular tools for this are **Reaver** and **Bully**.


![Pasted image 20260918000531](/images/notes/wifi/overview/pasted-image-20260918000531.png)


---

## How It Actually Works

For each guess, the tool goes through the full WPS message exchange (the M1–M8 messages you saw earlier).

The key moment happens at **message M4**: the tool sends the router some hash values (R-Hash1, R-Hash2) along with an encrypted secret number. The router checks these against the PIN guess.

- ✅ If the guess is correct → the exchange continues to the next messages
- ❌ If the guess is wrong → the router sends back a **NACK** (basically "nope, try again")

This repeats over and over until the right PIN is found (or the router locks up from too many wrong tries).

---

## What We Already Know vs. What We're Guessing

**Things we know or can generate ourselves:**

- The router's public key (PKe) — and we generate our own matching key (PKr)
- Our own secret random numbers (R-S1, R-S2)
- Two hash values sent to us by the router (E-Hash1, E-Hash2) during message M3

**Things we DON'T know (and need to figure out):**

- **The actual PIN** — this is the whole 11,000-combination guessing game
- **The router's secret random numbers** (E-S1, E-S2) — we only get these if we guess the PIN correctly
- **The real WiFi password (WPA-PSK)** — only revealed once the PIN is confirmed correct

---

## Why We Can't Just Skip the Guessing

Two of the missing pieces (E-S1 and E-S2) are 128-bit random numbers. Since they're supposed to be truly random and we never see them until _after_ a correct guess, there's no shortcut — we simply have to try PIN combinations one by one.

💡 **However:** Some router vendors don't generate these numbers randomly at all — they use predictable patterns. When that's the case, we can skip all the guessing entirely and use a much faster method called the **offline Pixie Dust attack** instead.
