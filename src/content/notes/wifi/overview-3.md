---
title: Overview
description: Overview
date: '2026-09-21'
tags: []
published: true
slug: overview
category: wifi
folder: wep-encryption-algorithm
order: 10
---
# WEP Encryption Algorithm: The Easy Guide

## The Core Problem

WEP combines a **40-bit or 104-bit key** with a **24-bit random value (IV)** to create a "seed" for encryption. Because the IV is so small, it eventually **repeats** — and that repetition is exactly what breaks WEP's security.

This flaw is what powers two famous attacks:

- **FMS attack** (Fluhrer, Mantin, and Shamir)
- **PTW attack** (Pyshkin, Tews, and Weinmann)

Both let attackers recover the WEP key just by collecting enough traffic. There's also a simpler brute-force approach that works on a packet-by-packet basis.

💡 To speed things up, attackers use **packet-building attacks** (like ARP replay and fragmentation — covered in earlier guides) to generate lots of IVs quickly, rather than waiting around for normal network traffic.

**The end goal:** Collect enough IVs to run probability-based math and crack the key.

---

## How WEP Encryption Actually Works (Step by Step)


![Pasted image 20260921232339](/images/notes/wifi/overview-3/pasted-image-20260921232339.png)


Here's the full process, from start to finish:

1. A **24-bit IV** (Initialization Vector) is randomly generated
2. The IV is combined with the **40-bit or 104-bit key** to form the **Seed**
3. That Seed goes through the **RC4 algorithm** (its two stages: KSA and PRGA) to produce a **Keystream**
4. Meanwhile, a **Cyclic Redundancy Check (CRC)** is calculated and attached to the original message — together these form the **ICV message**
5. The **Keystream** and the **ICV message** are combined using an **XOR operation**, producing the **Final Ciphertext** (the encrypted data)
6. Finally, the **IV is attached** (in plain, unencrypted form) to the ciphertext — this combo is what actually gets sent over the air

---

## Why This Breaks So Easily

Here's the key insight: **the IV is sent in cleartext** — completely unencrypted, right alongside the encrypted message.

This means attackers already know **one of the two ingredients** (the IV) that went into creating the keystream. Combined with the fact that IVs repeat due to their small 24-bit size, attackers can use probability and statistics to work backward and figure out the actual key.

**Bottom line:** This is exactly why WEP can be cracked _much_ faster than WPA, the math is stacked in the attacker's favor from the start.
