---
title: Putting It All Together
description: Putting It All Together
date: '2026-09-21'
tags: []
published: true
slug: putting-it-all-together
category: wifi
folder: wep-encryption-algorithm
order: 40
---
# Putting It All Together: The Full WEP Mockup Algorithm

## What's Happening in This Guide?

Time to combine everything from the last two guides — **seed generation** and **CRC32 checksums** — into one complete script that mimics the entire WEP encryption process, start to finish.

**Here's the full flow, in order:**

1. Build the seed (IV + key)
2. Use the seed to create a keystream
3. Calculate a CRC32 checksum for the message, and attach it to the message
4. Encrypt that combined block (message + checksum) using the keystream
5. Attach the IV to the front of the encrypted result — this final output is what actually gets transmitted

---

## The Full Script

```python
import Crypto
from Crypto.Random import get_random_bytes
from Crypto.Cipher import ARC4
import binascii
import zlib

# First we declare our packet plain text, this is the unencrypted message that we need to pass through our mock WEP algorithm
packetplaintext = b'Something Sensitive'

# Then we calculate the CRC32 checksum (32-bit integer) of our packet plain text
crc32 = zlib.crc32(packetplaintext)

# Generating the 24-bit Initialization Vector (3 bytes)
IV = get_random_bytes(3)

# Declaring our 40-bit key (5 bytes) and 64-bit seed (8 bytes)
key = b'\x01\x02\x03\x04\x05'
Seed64 = IV + key 

# Declaring our 104-bit key (13 bytes) and 128-bit seed
key104 = b'\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D'
Seed128 = IV + key104 

# Generating the keystreams
keystream = ARC4.new(Seed64)
keystreamB = ARC4.new(Seed128)

# Constructing our ICV Message
crc32byte = crc32.to_bytes(4, 'big')  # Convert CRC32 checksum from integer to bytes
ICVMessage = packetplaintext + crc32byte # Concatenate the packet plaintext and CRC32 checksum

# Final Ciphertext, made by XORing the ICV Message and keystream
msg = keystream.encrypt(ICVMessage)
msgB = keystreamB.encrypt(ICVMessage) 

# Final Message, formed by concatenating the Initialization Vector with the Final Cipher Text
finalmsg = IV + msg
finalmsgb = IV + msgB


print('-------------')
print('CRC32 Checksum: ' + str(crc32))
print('Initialization Vector: ' + str(IV))
print('64-bit Seed: ' + str(Seed64))
print('128-bit Seed: ' + str(Seed128))
print('-------------')
print('ICV Message: ' + str(ICVMessage))
print('Cipher Text 64-bit Seed: ' + str(msg))
print('Cipher Text 128-bit Seed: ' + str(msgB))
print('-------------')
print('Final Message 64-bit Seed: ' + str(finalmsg))
print('Final Message 128-bit Seed: ' + str(finalmsgb))
```

**Breaking down what each part does:**

|Section|What It Does|
|---|---|
|`packetplaintext`|The original message we want to encrypt|
|`crc32 = zlib.crc32(...)`|Calculates the checksum for error-checking|
|`IV = get_random_bytes(3)`|Generates a fresh random 24-bit IV|
|`Seed64` / `Seed128`|Combines the IV with a 40-bit or 104-bit key|
|`keystream` / `keystreamB`|Runs each seed through RC4 to produce a keystream|
|`ICVMessage`|Combines the plaintext message + CRC32 checksum together|
|`msg` / `msgB`|Encrypts the ICV message using the keystream (this is XOR happening under the hood)|
|`finalmsg` / `finalmsgb`|Attaches the IV to the front of the encrypted result — this is the final transmitted message|

---

## Running the Script (First Time)

```shellsession
iccys@htb[/htb]$ python3 mockcipher.py

-------------
CRC32 Checksum: 2950664974
Initialization Vector: b']~\xb7'
64-bit Seed: b']~\xb7\x01\x02\x03\x04\x05'
128-bit Seed: b']~\xb7\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r'
-------------
ICV Message: b'Something Sensitive\xaf\xdf\x93\x0e'
Cipher Text 64-bit Seed: b"y\x12uhO\x0e\x99\xa0\xd5\xe08\x11\xc6+O'\x81%\xf6\x9a\x89\xa8\x13"
Cipher Text 128-bit Seed: b'\x12u\x96\x0bA\xc1\x07\xe5a-Wt\x84\x14/\x1d\xa6oJ\x1d\x16_\xdb'
-------------
Final Message 64-bit Seed: b"]~\xb7y\x12uhO\x0e\x99\xa0\xd5\xe08\x11\xc6+O'\x81%\xf6\x9a\x89\xa8\x13"
Final Message 128-bit Seed: b']~\xb7\x12u\x96\x0bA\xc1\x07\xe5a-Wt\x84\x14/\x1d\xa6oJ\x1d\x16_\xdb'
```

---

## Running It Again — Notice the Difference

```shellsession
iccys@htb[/htb]$ python3 mockcipher.py

-------------
CRC32 Checksum: 2950664974
Initialization Vector: b'`\x8a\xa6'
64-bit Seed: b'`\x8a\xa6\x01\x02\x03\x04\x05'
128-bit Seed: b'`\x8a\xa6\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r'
-------------
ICV Message: b'Something Sensitive\xaf\xdf\x93\x0e'
Cipher Text 64-bit Seed: b'\xe4\xaa\xa3n\xb5\x9e\xc0\xd4P=L\xcc\x9c\xb6\xb7?\xbfB\xcd\xf1HR\xa6'
Cipher Text 128-bit Seed: b'\x10\xbb\x86\x89E\x9b\xe0HLf\xb6\xeb\x1e\xf6_j\xe6n,\xb0\xdd\xd0\x08'
-------------
Final Message 64-bit Seed: b'`\x8a\xa6\xe4\xaa\xa3n\xb5\x9e\xc0\xd4P=L\xcc\x9c\xb6\xb7?\xbfB\xcd\xf1HR\xa6'
Final Message 128-bit Seed: b'`\x8a\xa6\x10\xbb\x86\x89E\x9b\xe0HLf\xb6\xeb\x1e\xf6_j\xe6n,\xb0\xdd\xd0\x08'
```

**Notice:** The **CRC32 checksum stays exactly the same** both times (`2950664974`) — makes sense, since the message itself didn't change.

But the **IV, seeds, ciphertext, and final message are all completely different** each run. That's because a fresh, random IV gets generated every single time — even though the message and key stayed identical.

---

## Why This Matters

This little experiment shows exactly how WEP is supposed to work: **the same message never produces the same encrypted output twice**, thanks to the random IV. In theory, that's good security practice.

But remember — that IV is only 24 bits, and it's sent in plaintext with every message. That's the crack in the armor that makes WEP so vulnerable, as covered in earlier guides.

