---
title: Vaultkeeper CSCTF 2026 Writeup
description: Vaultkeeper CSCTF 2026 Writeup
date: '2026-11-08'
tags:
  - Mobile
  - CTF
  - CSCTF
published: true
slug: vaultkeeper-csctf-2026-writeup
category: Mobile
---
# VaultKeeper CTF Writeup

> **Event:** Chronos Security CTF 2026
> **Category:** Mobile
> **Difficulty:** Easy
> **Flag:** `CSCTF{intent_uri_and_a_broadcast_unlock_the_vault}`

---

## Overview

This challenge was on Chronos Security CTF 2026, it's a mobile easy challenge.

**Challenge description:**

> Responders seized a field handset during coordinated attacks on emergency communications.
>
> Recover that note from the APK. The surviving handover card carries authorization code `ZHUU-SANS-9XJN-QPCQ`. Analyze the package offline; you do not need to install it or complete its UI workflow. Attachment: `vaultkeeper.apk`, 2,413,853 bytes, SHA-256 `79559746ad419b219c88b362ff89b667993bad726e3b7109501b075c007de2ed`.
>
> Submit the recovered `CSCTF{...}` note exactly.
>
> Flag format: `CSCTF{...}`

---

## Unpacking and Decompiling the APK

Let's use jadx to decompile the apk:

```bash
jadx -d jadx_out vaultkeeper.apk
```

and we get a folder of readable java files.

---

## Solution

Let's read the `AndroidManifest.xml` file. The manifest lists the app's screens, and these stood out:

| Component | Role |
|---|---|
| `MainActivity` | the lock screen |
| `ArchiveActivity` | derives some "archive key" |
| `RecoveryDiagnosticsActivity` | exported, talks about "stage 1" |
| `RecoveryStage2Receiver` | a broadcast receiver, "stage 2" |
| `VaultDiagnosticsProvider` | a content provider that hands out a "recovery_token" |

Let's search for any cryptography in the `MainActivity.java` file. Upon reading, we find this interesting piece of code:

```java
boolean z2 = prefs.getBoolean("stage1_complete", false);
boolean z3 = prefs.getBoolean("stage2_complete", false);
if (z2 && z3) {
    String a02    = A.c.a0(mainActivity);
    String string = prefs.getString("archive_digits_cache", null);
    String obj    = binding.g.getText().toString();

    byte[] key = sha256( a02.getBytes() + string.getBytes() + obj.getBytes() );

    byte[] blob = Base64.decode(getString(R.string.flag_ciphertext_b64), 0);
    byte[] iv   = blob[0..12];
    byte[] ct   = blob[12..end];
    Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
    c.init(DECRYPT, new SecretKeySpec(key,"AES"), new GCMParameterSpec(128, iv));
    String note = new String(c.doFinal(ct));
}
```

We can see that the encryption key is the hash of the `recovery_token` + `digits` + `passcode`. So we need to find those.

### Ingredient 1: the recovery_token

Let's go to the `a02` variable, which leads to `A.c.a0(mainActivity)`. Let's go read that function in the `A` class:

```java
public static String a0(Context context) {
    byte[] digest = SHA-256( signatures[0].toByteArray() );
    String hex = toHex(digest).substring(0, 8).toUpperCase();
    return "KJSC-" + hex + "-RECOVERY";
}
```

It returns the hex value of the hash of the signing cert, which we can recover offline:

```python
from androguard.core.apk import APK
import hashlib
a = APK("vaultkeeper.apk")
der = a.get_certificates_der_v2()[0]
h = hashlib.sha256(der).hexdigest()
token = "KJSC-" + h[:8].upper() + "-RECOVERY"
```

This is our recovery token, first one down. Now let's get the other stuff.

### Ingredient 2: the 4 digits

Let's go check our first code from `MainActivity.java` again. `prefs.getString("archive_digits_cache")` comes from the `ArchiveActivity` when you type 4 digits. The receiver `RecoveryStage2Receiver` only accepts stage 2 if a derived "archive_key" equals `3778F16D`.

`ArchiveActivity` builds that archive_key like this:

```java
archive_key = HMAC-SHA256(key = archive_session, msg = the 4 digits)
              -> hex -> first 8 chars -> UPPERCASE
```

The string resources gave me `archive_session = "VK-7F42"`.

There are only 10000 possible 4-digit PINs, so I just try them all until one produces `3778F16D`:

```python
import hmac, hashlib
for n in range(10000):
    pin = f"{n:04d}"
    k = hmac.new(b"VK-7F42", pin.encode(), hashlib.sha256).hexdigest()[:8].upper()
    if k == "3778F16D":
        print(pin)
```

Which gives us: `4972`

2 out of 3 down. Now for the last thing needed to get our key.

### Ingredient 3: the passcode

Which is basically given in the challenge description:

```
ZHUU-SANS-9XJN-QPCQ
```

### Putting it together

Now let's decrypt exactly like the app does. Before I can decrypt, I need the encrypted blob itself. The code reads it by name:

```java
Base64.decode(getString(R.string.flag_ciphertext_b64), 0)
```

So the encrypted note is a string resource baked into the app, named `flag_ciphertext_b64`, found in `resources/res/values/strings.xml`.

Let's put it all together and write the same logic as the `MainActivity.java` code:

```python
import hashlib, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

recovery_token = "KJSC-1C28DC7E-RECOVERY"
digits = "4972"
passcode = "ZHUU-SANS-9XJN-QPCQ"

key = hashlib.sha256((recovery_token + digits + passcode).encode()).digest()

b64  = "5oQUos5iza6li4FHm+nyC2yzGTGaAhTT7DHZLsCW3khsXZn3fzyUW7eZj+8ZMOeKW99f/ONroSPFdDxSni70Celag2Hvw4sYVFcXdqM/"
blob = base64.b64decode(b64 + "=" * ((-len(b64)) % 4))
iv, ct = blob[:12], blob[12:]

note = AESGCM(key).decrypt(iv, ct, None)
print(note.decode())
```

And we get the flag:

```
CSCTF{intent_uri_and_a_broadcast_unlock_the_vault}
```
