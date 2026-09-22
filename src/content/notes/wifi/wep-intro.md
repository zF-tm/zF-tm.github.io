---
title: WEP Intro
description: WEP Intro
date: '2026-09-21'
tags: []
published: true
slug: wep-intro
category: wifi
folder: wep-attacks
order: 10
---
# Wired Equivalent Privacy (WEP)

## What is WEP?

Open WiFi networks (no password) are risky — anyone nearby can eavesdrop on the traffic since it's not encrypted. **WEP** was created back in **1997** to fix this by encrypting wireless traffic.

It's now outdated and mostly replaced by WPA, but you might still run into it on old routers or in some older business setups.

---

## What Makes Up WEP

WEP encryption relies on a few building blocks:

- **Initialization Vectors (IVs)** — small random-ish values used to keep encryption from repeating
- **A shared key** — either 40-bit or 104-bit (this is the actual "WEP password")
- **RC4** — the encryption algorithm that scrambles the data
- **CRC32** — a check used to catch data errors

---

## The IV Problem (Why WEP is Weak)

Here's the core flaw: **the IV is only 24 bits long — always**, no matter if you're using a 64-bit or 128-bit WEP key.

**Why does that matter?** 24 bits means there are only a limited number of possible IV values. Since networks are constantly sending traffic, the same IV values start repeating fairly quickly.

Once IVs repeat, attackers can collect enough of this repeated data to build **decryption tables** — letting them recover the WEP key with high accuracy, usually through packet capturing and replay techniques (like the aircrack-ng tools covered earlier).

📝 **Fun fact:** The original 24-bit IV size existed because of old U.S. government export restrictions on strong encryption. Even after those restrictions were lifted and WEP keys got bigger (128-bit), the 24-bit IV size was never fixed — leaving this vulnerability in place permanently.

---

## The RC4 Algorithm

WEP uses a cipher called **RC4** to actually scramble the data.

**Key facts about RC4:**

- Created in 1987 by Ron Rivest
- It's a **stream cipher** — meaning it generates a continuous stream of "random" bits
- It's **symmetric** — the same key is used to both encrypt and decrypt
- Encryption works by XOR-ing (a math operation) the data with this generated bit stream

**RC4 has two main parts:**

|Part|What It Does|
|---|---|
|**KSA** (Key Scheduling Algorithm)|Sets up the internal state using the WEP key + IV|
|**PRGA** (Pseudo Random Generation Algorithm)|Actually generates the keystream used for encrypting/decrypting|

---

## How WEP Authentication Works

WEP supports **two ways** for a device to connect:

### 1. Open Authentication

The device doesn't need to prove anything to connect. However, it still needs the correct WEP key to actually read/send encrypted data afterward.

### 2. Shared Authentication

This is a proper "prove you know the password" handshake:

1. **Authentication Request** — the device asks the router to connect
2. **Challenge** — the router sends back some random "challenge text"
3. **Challenge Response** — the device encrypts that challenge text using the WEP key and sends it back
4. **Verification** — the router decrypts it; if it matches the original text, the device is allowed to connect


![Pasted image 20260921231650](/images/notes/wifi/wep-intro/pasted-image-20260921231650.png)


---

## Why This Still Matters Today

WEP is rare in modern networks, but it still pops up in older systems that haven't been updated (sometimes due to old hardware compatibility needs). Knowing how to attack WEP remains a useful skill for wireless penetration testers.
