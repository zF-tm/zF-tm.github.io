---
title: CRC32 Generation (WEP's ICV Algorithm)
description: CRC32 Generation (WEP's ICV Algorithm)
date: '2026-09-21'
tags: []
published: true
slug: crc32-generation-wep-s-icv-algorithm
category: wifi
folder: wep-encryption-algorithm
order: 30
---
# CRC32 Generation (WEP's ICV Algorithm)

## What is CRC32 Doing Here?

WEP uses a **CRC32 checksum** to help detect errors in transmitted data. Here's the flow:

1. The checksum is calculated over the actual message (plaintext)
2. It gets **attached** to the message
3. This combined block (message + checksum) is then encrypted using the RC4 keystream (from the previous guide) via XOR

This combined, encrypted result is the final data that actually gets sent.

---

## The Famous Weakness: KoreK Chop Chop Attack

CRC32 isn't just used for error-checking here — it's also a **major security hole**.

The **KoreK Chop Chop Attack** exploits it like this:

1. Remove one byte from the end of the encrypted packet
2. Recalculate what the checksum _should_ be for the modified packet
3. Send this modified packet back to the network
4. Watch how the network responds — **accepted or rejected?**
5. That response tells the attacker whether their guess for that byte was correct
6. Repeat this process, one byte at a time, until the **entire packet is decrypted**

No need to know the actual WEP key at all — just by watching how the network reacts to modified packets, the whole message can be decrypted piece by piece. (We'll cover this attack in full detail in a later guide.)

---

## The Math Behind CRC32

For those curious, CRC32 is based on this formula:

```
g(x) = x32 + x26 + x23 + x22 + x16 + x12 + x11 + x10 + x8 + x7 + x5 + x4 + x2 + x + 1
```

You don't need to memorize this, just know it's a standardized error-checking formula, not something WEP invented itself.

---

## Calculating CRC32 in Python

Python makes this easy with the built-in **zlib** library:

```python
import zlib

# First we declare our packet plaintext. In normal communications this is the actual plaintext data.
packetplaintext = b'Something Sensitive'

# We then use the zlib library to calculate the CRC32.
crc32 = zlib.crc32(packetplaintext)

print(crc32)
```

**What this does:**

1. Defines a sample message: `"Something Sensitive"`
2. Runs it through `zlib.crc32()` to calculate the checksum
3. Prints the result

---

## Running the Script

```shellsession
iccys@htb[/htb]$ python3 CRC32.py

2950664974
```

That number (`2950664974`) is the CRC32 checksum for the phrase "Something Sensitive."

---

## Putting It All Together

At this point, you now have **both pieces** needed for the full RC4 encryption process:

1. **The keystream** (from the previous guide, using the seed/RC4)
2. **The plaintext + CRC32 checksum** (the ICV message, from this guide)

With both of these, the next step is combining them to build a complete working mockup of the entire WEP encryption algorithm.
