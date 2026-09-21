---
title: Introduction To Wi-Fi
description: Introduction To Wi-Fi
date: '2026-09-21'
tags: []
published: true
slug: introduction-to-wi-fi
category: wifi
folder: introduction-to-wi-fi-pentesting
order: 10
---
# WiFi Pentesting Notes (Simplified)

## Wireshark Filters for Management Frames

```shell
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 8) # Beacon frames 
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 4) # Request frames
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 5) # Response frames
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 11) # Authentication
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 0) # Association request (after authentication process)
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 1) # Association response (from access point)
(wlan.fc.type == 0) && (wlan.fc.type_subtype == 12) or (wlan.fc.type_subtype == 10) # When the connection process is complete, we can view who initiated the termination process, either Disassociation (10) or Deauthentication (12)

eapol # used to view EAPOL frames when WPA2 is in action
```

---

## Two Ways to Authenticate to WiFi

- **Open System Authentication** → no password, connect straight away.
- **Shared Key Authentication** → client and AP prove they both know a shared key using a challenge-response.

Newer stuff (Enterprise, WPA3, Enhanced Open) exists too, but these two are the classics.

### Open System Authentication (no password)

1. Client → AP: "let's authenticate"
2. AP → Client: "ok / not ok"
3. Client → AP: "let's associate"
4. AP → Client: "ok, you're connected / not ok"

Not secure, but easy — good for public/guest WiFi.

> **Note:** AP can also reject you for non-password reasons — MAC filtering, config rules, or the AP being full. The status code tells you why.

### Shared Key Authentication (needs a password)

Both sides need to prove they know the key. Common in WEP and WPA.

#### WEP Authentication (old, broken)

1. Client asks AP to authenticate
2. AP sends back a random 128-byte challenge (sent in plaintext — that's fine, it's not secret)
3. Client encrypts that challenge using the shared key (the WiFi password) and sends it back
4. AP decrypts it with the same key — if it matches the original challenge, client is legit → authenticated. If not → denied.

**Quick facts:**
```
1. Encryption used = RC4 (WEP's standard)
2. The challenge must change every time — if it doesn't, an attacker can replay a captured request/response
3. The WEP key isn't always literally the WiFi password — sometimes it's a passphrase converted into a key. But usually it IS the password.
```

#### WPA Authentication (modern-ish)

Uses a **4-way handshake** instead of the simple association step. WPA3 makes the key exchange even more complex.

1. Client → AP: authentication request
2. AP → Client: "ready to authenticate"
3. Both sides calculate the **PMK** (Pairwise Master Key) from the **PSK** (the password) — separately, using the same math. Password itself is never sent over the air.
4. **4-Way Handshake**: nonces get exchanged, keys get derived, and both sides prove they know the PSK without ever saying it out loud.

---

## Interfaces — Command Cheatsheet

Format below: **command** → what it does, in plain English.

### Checking the interface & driver

```bash
iwconfig
```
→ Shows current state: name, mode, association, Tx-Power.

```bash
iw list
```
→ Full card capabilities. Run this **before** attacking, not after.

```bash
iw list | grep -A 10 "Supported interface modes"
```
→ Checks if `monitor` mode is listed. If it's not there, wrong card for the job.

### Regulatory domain

```bash
iw reg get
```
→ Shows why you might be capped at 20 dBm or why some channels are disabled.

```bash
sudo iw reg set US
```
→ Unlocks more power and more channels by setting the regulatory domain.

### Changing TX power

```bash
sudo ifconfig wlan0 down
```
→ Radio must be down before you can reconfigure it.

```bash
sudo iwconfig wlan0 txpower 30
```
→ Sets power to 30 dBm (= 1 Watt = 10x of 20 dBm power, but only ~3x more range).

```bash
sudo ifconfig wlan0 up
```
→ Brings the interface back up.

```bash
iwconfig
```
→ Verify the change took. If it didn't, it's likely regdomain, chipset, or a patched kernel blocking it.

### Scanning for networks

```bash
sudo iwlist wlan0 scan
```
→ Active scan. Note: you're transmitting probes, so you're visible while doing this.

```bash
iwlist wlan0 scan | grep 'Cell\|Quality\|ESSID\|IEEE'
```
→ Cleaner output: just BSSID + signal + SSID + encryption type.

### Channels & frequency

```bash
iwlist wlan0 channel
```
→ Shows what channels this card can tune to, and which one you're on now.

```bash
iwlist wlan0 frequency | grep Current
```
→ Confirms your current channel. Run this if your captures are coming up empty.

```bash
sudo ifconfig wlan0 down
sudo iwconfig wlan0 channel 64
sudo ifconfig wlan0 up
```
→ Down → set channel to 64 (5.32 GHz, target's channel) → back up.

```bash
sudo ifconfig wlan0 down
sudo iwconfig wlan0 freq "5.52G"
sudo ifconfig wlan0 up
```
→ Same idea, but setting by frequency instead of channel number (5.52 GHz = channel 104).

```bash
sudo ifconfig wlan0 down
sudo iwconfig wlan0 mode managed
sudo ifconfig wlan0 up
```
→ Down → switch mode to managed → back up.

```bash
sudo iwconfig wlan0 essid Nabil-WiFi
```
→ Connects to a WiFi network by name.

### Modern `iw` equivalents (the old tools above are deprecated)

```bash
ip link set wlan0 down
```
→ Replaces `ifconfig wlan0 down`.

```bash
ip link set wlan0 up
```
→ Replaces `ifconfig wlan0 up`.

```bash
iw dev wlan0 set channel 64
```
→ Replaces `iwconfig wlan0 channel`.

```bash
iw dev wlan0 set txpower fixed 3000
```
→ Replaces the old txpower command. Note: units are mBm here, not dBm — 3000 mBm = 30 dBm.

```bash
sudo iw dev wlan0 scan
```
→ Replaces `iwlist wlan0 scan`.

---

## Interface Modes — Quick Rundown

### Managed Mode (default / normal)
The mode your card starts in. Lets you search for and connect to APs like a normal device.

Set it manually:
```shell
sudo ifconfig wlan0 down
sudo iwconfig wlan0 mode managed
``` 
Connect to a network:
```shell
sudo iwconfig wlan0 essid HTB-Wifi
```

### Ad-Hoc Mode (device-to-device, no AP)
Two wireless devices talk directly — no router/AP needed. This is basically the "backhaul" link used between mesh WiFi units to talk to each other.

⚠️ Not the same as extender mode (which just bridges two interfaces). Ad-Hoc = true peer-to-peer.

```shell 
sudo iwconfig wlan0 mode ad-hoc
```
→ Enters ad-hoc mode.

```shell
sudo iwconfig wlan0 essid Nabil-Mesh
```
→ Names the ad-hoc network so peers can join the same one.

Verify:
```shell
sudo iwconfig
```
Look for `Mode: Ad-Hoc` and the right `ESSID`.

### Master Mode (become the AP)
Opposite of managed — your device becomes the AP/router that others connect to.

Ad-Hoc vs Master → Ad-Hoc = no boss (peer-to-peer). Master = you're the boss (centralized AP).

Can't set with `iwconfig` — needs a daemon like `hostapd`.

Create `open.conf`:
```shell
interface=wlan0
driver=nl80211
ssid=Nabil-Wifi
channel=2
hw_mode=g
```
This makes an open (no password) network called `Nabil-Wifi`.

Start it:
```shell
sudo hostapd open.conf
```
Success looks like one of these:
- `AP-ENABLED` 
- `authenticated` 
- `associated` 
- `AP-STA-CONNECTED` 

### Mesh Mode (self-building network)
No central AP — devices build and route the network themselves. Good for warehouses, campuses, big spaces. Your interface becomes a relay node.

Configure with `iw` (not `iwconfig`):
```shell
sudo iw dev wlan0 set type mesh
```
Verify:
```shell
sudo iwconfig
```
Look for `Mode: Auto`.

### Monitor Mode (see everything)
Also called promiscuous mode. Instead of only grabbing packets meant for you, you capture **all** wireless traffic in range. Needs root. Steps vary by OS/chipset.

```shell
sudo ifconfig wlan0 down
```
→ Turn the interface down.

```shell
sudo iw wlan0 set monitor control
```
→ Set monitor mode.

```shell
sudo ifconfig wlan0 up
```
→ Bring the interface back up.

```shell
sudo iwconfig
```
→ Verify — look for `Mode: Monitor`.

---

## Which Mode Do I Need?

- **Cracking WEP/WPA/WPA2/WPA3/Enterprise** → just `monitor mode` + packet injection is enough.
- **Rogue AP / Evil Twin attack** → need `master mode` + a daemon like `hostapd`, `hostapd-mana`, `hostapd-wpe`, `airbase-ng`, etc.
- **Attacking mesh/backhaul systems** → need `ad-hoc` + `mesh` mode support. Monitor mode + injection is usually enough, but extra capability lets you do things like node impersonation.
