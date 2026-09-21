---
title: airdecap-ng
description: airdecap-ng
date: '2026-09-21'
tags: []
published: true
slug: airdecap-ng
category: wifi
folder: aircrack-ng-essentials
order: 50
---
# Airdecap-ng

## What is it?

Airdecap-ng **decrypts** WiFi capture files — but only if you already have the network's key or password.

It can:
- Decrypt WEP-protected captures
- Decrypt WPA/WPA2-protected captures
- Clean up unencrypted captures by removing extra WiFi header info

This makes captured data much easier to read and analyze.

---

## Basic Command Format

```
airdecap-ng [options] <capture-file>
```

**Options you can use:**

| Option | What It Does |
|---|---|
| `-l` | Keep the WiFi header (don't remove it) |
| `-b` | Filter by access point address |
| `-k` | WPA/WPA2 key, in hex format |
| `-e` | Network name (ESSID) |
| `-p` | WPA/WPA2 passphrase |
| `-w` | WEP key, in hex format |

**Output:** Airdecap-ng always creates a new file ending in `-dec.cap`. So `HTB-01.cap` becomes `HTB-01-dec.cap`.

---

## Why Decrypt at All?

Without decryption, tools like Wireshark only show generic "802.11" wireless info — not the actual useful data (like which website was visited, or what device talked to what).

After decrypting, Wireshark can show real protocols like **TCP, ARP, DHCP, HTTP** — plus actual IP addresses instead of just MAC addresses. Much more useful for analysis.

---

## Option 1: Clean Up an Unencrypted Capture

Even open (no-password) networks create messy capture files full of extra WiFi header info. You can strip that out:

```
sudo airdecap-ng -b 00:14:6C:7A:41:81 opencapture.cap
```

Replace the MAC address with the target access point's address, and the filename with your capture file.

**Result:** A cleaner file named `opencapture-dec.cap`.

---

## Option 2: Decrypt a WEP Capture

If you have the WEP key, you can fully decrypt the capture:

```
sudo airdecap-ng -w 1234567890ABCDEF HTB-01.cap
```

Replace the key with your actual WEP key (in hex), and the filename with your capture file.

**Result:** A decrypted file named `HTB-01-dec.cap`.

---

## Option 3: Decrypt a WPA/WPA2 Capture

If you have the WPA passphrase, use this:

```
sudo airdecap-ng -p 'abdefg' HTB-01.cap -e "Wireless Lab"
```

Replace:
- `'abdefg'` with the actual passphrase
- `HTB-01.cap` with your capture file
- `"Wireless Lab"` with the network's name (ESSID)

**Result:** A decrypted file named `HTB-01-dec.cap`.

