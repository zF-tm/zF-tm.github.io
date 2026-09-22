---
title: Seed Generation And RC4 Algorithm
description: Seed Generation And RC4 Algorithm
date: '2026-09-21'
tags: []
published: true
slug: seed-generation-and-rc4-algorithm
category: wifi
folder: wep-encryption-algorithm
order: 20
---
# Seed Generation and the RC4 Algorithm

## What Does RC4 Need to Work?

RC4 encryption needs two things:

1. **The message** you want to encrypt
2. **The key**

In normal RC4, the key goes straight into the algorithm. But WEP does something different — it builds a **"seed"** instead, by gluing together:

- A random **24-bit IV** (Initialization Vector)
- A **40-bit, 104-bit, or sometimes 232-bit key**

That combined seed is what actually gets fed into RC4.

---

## The Two Phases of RC4

RC4 works in two stages:

|Phase|What It Does|
|---|---|
|**KSA** (Key Scheduling Algorithm)|Takes the seed and shuffles an internal set of values around|
|**PRGA** (Pseudo-Random Generation Algorithm)|Uses that shuffled data to generate a **keystream** the same length as your message|

Once you have the keystream, it's XORed (a math operation) with your actual message to produce the final encrypted result (ciphertext).


![Pasted image 20260921233325](/images/notes/wifi/seed-generation-and-rc4-algorithm/pasted-image-20260921233325.png)


---

## Trying It Out in Python

You don't need to build RC4 from scratch — Python's **PyCryptodome** library already includes it (the `ARC4` module).

Here's an example script that encrypts the phrase **"Wired Equivalent Privacy"** using both a 64-bit and 128-bit seed:

```python
import Crypto
from Crypto.Random import get_random_bytes
import binascii
from Crypto.Cipher import ARC4

# Generating the 24-bit (3 byte) Initialization Vector
IV = get_random_bytes(3)

# Creating the 40-bit key (5 bytes)
key = b'\x01\x02\x03\x04\x05'
Seed64 = IV + key

# We can also use a 104-bit key (13 bytes) 
key104 = b'\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D'
Seed128 = IV + key104

print('Initialization Vector: ' + str(IV))
print('64-bit Seed: ' + str(Seed64))
print('128-bit Seed: ' + str(Seed128))

# We must use the RC4 cipher to encrypt the plain text. We will explore how to generate the CRC32 and ICV Message in the next session.
# The RC4 cipher consists of the Key-Scheduling Algorithm and the Pseudo-random Generation Algorithm, which outputs the keystream.

# Generating the keystream using RC4
keystream = ARC4.new(Seed64)
keystreamB = ARC4.new(Seed128)

# The plain text is XORed with the keystream to produce the ciphertext.
msg = keystream.encrypt(b'Wired Equivalent Privacy')
print(msg)
```

**What this script does, step by step:**

1. Generates a random 3-byte (24-bit) IV
2. Glues the IV to a 5-byte key → makes a 64-bit seed
3. Also builds a 128-bit seed using a longer, 13-byte key
4. Feeds the 64-bit seed into RC4 to create a keystream
5. XORs that keystream with the message to produce ciphertext

---

## Running the Script

```shellsession
iccys@htb[/htb]$ python3 SeedGen.py

Initialization Vector: b'y#K'
64-bit Seed: b'yK\x01\x02\x03\x04\x05'
128-bit Seed: b'yK\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r'
b')c\xe96\xf0\xab\x10\x9b\xa2\x9f\xdd\x19\xff\xf5\x81\xd5\xe2\xe9-x\x16\x96%n'
```

Run it again, and notice the output is completely different each time:

```shellsession
iccys@htb[/htb]$ python3 SeedGen.py

Initialization Vector: b'\xdb\x10o'
64-bit Seed: b'\xdb\x10o\x01\x02\x03\x04\x05'
128-bit Seed: b'\xdb\x10o\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r'
b'\xf4kR\x06/3\x08 O\x9a\xa2\x99\x9a\x93\xe5\x16\x89\x9f\x7f\x92\x1d\xd1\x1b\xb7'
```

**Why is it different each time?** Because the IV is randomly generated fresh every time, so even with the same key and same message, the output changes.

---

## Why This Matters (Security-Wise)

Normally, a stream cipher's key stays secret, that's what keeps the encryption safe. To decrypt, you'd need either the key or the original message.

But WEP does something risky: **it attaches the IV to every packet in plain, unencrypted form.** Without doing this, decryption would be genuinely impossible for the receiver. Unfortunately, this also means attackers get a piece of the puzzle for free every single time.

Combine this with the fact that the IV is only 24 bits (so it repeats often), and you get exactly the kind of pattern attackers can exploit to eventually crack the key — which is the whole reason WEP is considered broken today.
