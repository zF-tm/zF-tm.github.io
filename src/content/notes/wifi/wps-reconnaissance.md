---
title: WPS Reconnaissance
description: WPS Reconnaissance
date: '2026-09-21'
tags: []
published: true
slug: wps-reconnaissance
category: wifi
folder: wi-fi-protected-setup-wps-attacks
order: 20
---
# WPS Reconnaissance

## What's the Goal Here?

Before attacking a WPS network, we need to **scope it out first**. We want to find out:

- The router's **MAC address** (helps identify the vendor/brand)
- Which **WPS version** it's running (1.0 or 2.0)
- Which **WPS mode** it uses (button, PIN, label, etc.)

Why does this matter? Because some vendors and WPS versions are much easier to crack than others. For example, **WPS 2.0** usually has a "lockout" feature — after too many wrong PIN guesses, the router locks up and needs a reboot or timeout before you can try again. That makes brute-forcing painfully slow (or impossible).

📝 **Note:** All commands here should be run as root. Use `sudo -s` to switch to the root user first.

---

## Step 1: List Your WiFi Interfaces

```shellsession
iccys@htb[/htb]$ iwconfig

lo        no wireless extensions.

eth0      no wireless extensions.

wlan0     IEEE 802.11  ESSID:off/any  
          Mode:Managed  Access Point: Not-Associated   Tx-Power=20 dBm   
          Retry short  long limit:2   RTS thr:off   Fragment thr:off
          Encryption key:off
          Power Management:off
```

This just confirms your WiFi adapter (`wlan0`) is there and ready.

---

## Step 2: Turn On Monitor Mode

```shellsession
iccys@htb[/htb]$ airmon-ng start wlan0
```

Same as before — this lets your adapter capture all nearby wireless traffic.

---

## Step 3: Scan for WPS Networks with Airodump-ng

```shellsession
iccys@htb[/htb]$ airodump-ng --wps --ignore-negative-one wlan0mon

BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS    ESSID
XX:XX:XX:XX:XX:XX  -43        1        0    0   6  195   WPA2 CCMP   PSK  2.0 LAB   FakeNetwork
XX:XX:XX:XX:XX:XX  -43        1        0    0   6  195   WPA2 CCMP   PSK  1.0 USB   FakeNetwork
XX:XX:XX:XX:XX:XX  -43        1        0    0   6  195   WPA2 CCMP   PSK  1.0 DISP  FakeNetwork
XX:XX:XX:XX:XX:XX  -43        1        0    0   6  195   WPA2 CCMP   PSK  1.0 PBC   FakeNetwork
XX:XX:XX:XX:XX:XX  -43        1        0    0   6  195   WPA2 CCMP   PSK  2.0 PBC   FakeNetwork
60:38:E0:XX:XX:XX   -7   0   24        0    0   8  130   WPA2 CCMP   PSK  1.0 LAB   HTB-Wireless 
```

This shows you every nearby network **that has WPS enabled**, along with its version (1.0 or 2.0) and mode (like LAB, PBC, USB, etc.).

You can also narrow the scan to just one specific network, once you know its channel and MAC address:

```shellsession
iccys@htb[/htb]$ airodump-ng --wps --ignore-negative-one -c 8 --bssid 60:38:E0:XX:XX:XX wlan0mon
```

### WPS Mode Cheat Sheet

|Acronym|Meaning|
|---|---|
|DISP|PIN is shown in the router's admin settings page|
|ETHER|Setup happens over an Ethernet cable (rare)|
|EXTNFC / INTNFC / NFCINTF|Uses NFC (tap-to-connect)|
|KPAD|You type the PIN into a keypad on the device|
|LAB|PIN is printed on a sticker on the router itself|
|Locked|WPS is locked (usually from too many wrong guesses)|
|PBC|Push Button — press a button on both devices|
|USB|Settings transferred via USB drive|

---

## Step 4: Scan for WPS Networks with Wash

Wash is another tool built specifically for WPS scanning:

```shellsession
iccys@htb[/htb]$ wash -i wlan0mon

BSSID               Ch  dBm  WPS  Lck  Vendor    ESSID
--------------------------------------------------------------------------------
60:38:E0:XX:XX:XX    3  -07  1.0  No   AtherosC  HTB-Wireless
XX:XX:XX:XX:XX:XX    1  -63  2.0  No   LantiqML  FakeNetwork
XX:XX:XX:XX:XX:XX    1  -63  2.0  No   Quantenn  FakeNetwork
XX:XX:XX:XX:XX:XX    1  -61  2.0  No   AtherosC  FakeNetwork
```

This gives you a clean table, including the **vendor name** and whether WPS is **locked** ("Lck" column).

For even more detail, add the `-j` flag for JSON-formatted output:

```shellsession
iccys@htb[/htb]$ wash -j -i wlan0mon

{"bssid" : "XX:XX:XX:XX:XX:XX", "essid" : "FakeNetwork", "channel" : 1, "rssi" : -61, "wps_version" : 32, "wps_state" : 2, "wps_locked" : 2, "wps_response_type" : "03", "wps_config_methods" : "0000", "wps_rf_bands" : "03", }
{"bssid" : "XX:XX:XX:XX:XX:XX", "essid" : "FakeNetwork", "channel" : 1, "rssi" : -61, "wps_version" : 32, "wps_state" : 2, "wps_locked" : 2, "wps_response_type" : "03", "wps_config_methods" : "0000", "wps_rf_bands" : "03", }
```

💡 **Important:** Check the `wps_locked` value. If it's **2**, WPS is **not locked** — meaning it's still a valid target.

---

## Step 5: Look Up the Router's Vendor

Once you have part of the MAC address, you can find out who made the router:

```shellsession
iccys@htb[/htb]$ grep -i "84-1B-5E" /var/lib/ieee-data/oui.txt

84-1B-5E   (hex)                NETGEAR
```

Knowing the vendor helps later — some vendors use predictable PIN patterns, which can speed up cracking.

---

## Things to Check Before Attacking WPS

Before moving forward, always confirm:

- ✅ **WPS version** (1.0 is generally weaker than 2.0)
- ✅ **wps_locked status** (must not be locked)
- ✅ **WPS mode** (if it's Push Button only, PIN cracking won't work)
- ✅ **Lockout behavior** (if it locks after a few wrong guesses, brute-forcing all 11,000 combos may not be realistic)

---

## Command Summary

```bash
iwconfig                                                          # List wireless interfaces
airmon-ng start wlan0                                             # Enable monitor mode
airodump-ng --wps --ignore-negative-one wlan0mon                  # Scan all nearby WPS networks
airodump-ng --wps --ignore-negative-one -c 8 --bssid <BSSID> wlan0mon   # Scan one specific WPS network
wash -i wlan0mon                                                  # Scan WPS networks (clean table view)
wash -j -i wlan0mon                                               # Scan WPS networks (detailed JSON view)
grep -i "<MAC prefix>" /var/lib/ieee-data/oui.txt                 # Look up a router's vendor by MAC
```

**What each argument means:**

| Argument                     | Used In           | Meaning                                                |
| ---------------------------- | ----------------- | ------------------------------------------------------ |
| `start wlan0`                | airmon-ng         | Turns on monitor mode for interface `wlan0`            |
| `--wps`                      | airodump-ng       | Shows WPS-specific info (version, mode) in the results |
| `--ignore-negative-one`      | airodump-ng       | Hides annoying "-1 PWR" error messages                 |
| `-c 8`                       | airodump-ng       | Only scan channel 8                                    |
| `--bssid 60:38:E0:XX:XX:XX`  | airodump-ng       | Only scan this specific access point                   |
| `wlan0mon`                   | airodump-ng, wash | The wireless interface (in monitor mode) to use        |
| `-i wlan0mon`                | wash              | Tells wash which interface to scan with                |
| `-j`                         | wash              | Output results in detailed JSON format                 |
| `-i "84-1B-5E"`              | grep              | Case-insensitive search for this MAC prefix            |
| `/var/lib/ieee-data/oui.txt` | grep              | The file that maps MAC prefixes to vendor names        |
