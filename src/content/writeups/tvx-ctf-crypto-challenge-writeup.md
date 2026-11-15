---
title: TVX CTF CRYPTO CHALLENGE WRITEUP
description: TVX CTF CRYPTO CHALLENGE WRITEUP
date: '2026-11-15'
tags:
  - crypto
  - ctf
  - tvxctf
published: true
slug: tvx-ctf-crypto-challenge-writeup
category: Crypto
platform: TVX
difficulty: Easy
---
# Creeper Vault Writeup

## Challenge Files

The challenge gives us 2 files, those are the contents of those files:

```
c = 1574928985319013777436289945491687612751672976588545303342361399014858100334313795739

The ciphertext belongs to Vault A.
```

```
=== Creeper Vault A ===
n = 1942668892225729070919461906823520455305416829490420089422957436437580309796491507761
e = 65537

=== Creeper Vault B ===
n = 1942668892225729070919461906823519371241578281403951004079222153957205455266330293941
e = 65537

Both vaults were assembled by the same careless Creeper.
```

## Analysis

If we look at the `n_a` and `n_b`, they look alike, and also looking at the hint **"Both vaults were assembled by the same careless Creeper."** we can comprehend that both `n` values are using a **shared prime**.

We can find that prime by finding the **greatest common divisor** between them two.

## Solution

```python
from math import gcd
from Crypto.Util.number import long_to_bytes

n_a = 1942668892225729070919461906823520455305416829490420089422957436437580309796491507761

n_b = 1942668892225729070919461906823519371241578281403951004079222153957205455266330293941

e = 65537

# consyutrcitng p

p = gcd(n_a,n_b)
q = n_a // p

phi = (p-1) * (q-1)

d = pow(e,-1,phi)

c = 1574928985319013777436289945491687612751672976588545303342361399014858100334313795739

m = pow(c,d,n_a)

print(long_to_bytes(m))
```

## Flag

And we get:

```
TVXCTF{the_creeper_reused_a_prime}
```

---

*Very simple, very easy.*
