---
title: Finding the Initialization Vector with Wireshark
description: Finding the Initialization Vector with Wireshark
date: '2026-09-21'
tags: []
published: true
slug: finding-the-initialization-vector-with-wireshark
category: wifi
folder: wep-encryption-algorithm
order: 50
---
# Finding the Initialization Vector with Wireshark

## What's the Goal?

We now know the IV is sent unencrypted with every WEP packet. This guide shows you **how to actually capture that IV** and view it, using the Aircrack suite to capture traffic and Wireshark to inspect it.

---

## Step 1: List Your Wireless Interfaces

```shellsession
iccys@htb[/htb]$ iwconfig

lo        no wireless extensions.

eth0      no wireless extensions.

wlan0     IEEE 802.11  ESSID:off/any  
         Mode:Managed  Access Point: Not-Associated   Tx-Power=20 dBm   
         Retry short  long limit:2   RTS thr:off   Fragment thr:off
         Power Management:off
```

---

## Step 2: Enable Monitor Mode

```shellsession
iccys@htb[/htb]$ sudo airmon-ng start wlan0

Found 4 processes that could cause trouble.
Kill them using 'airmon-ng check kill' before putting
the card in monitor mode, they will interfere by changing channels
and sometimes putting the interface back in managed mode

   PID Name
   602 avahi-daemon
   614 avahi-daemon
   700 NetworkManager
   701 wpa_supplicant

PHY     Interface       Driver          Chipset

phy0    wlan0           rt2800usb       Ralink Technology, Corp. RT****
```

If any conflicting processes are listed (like `wpa_supplicant` above), kill them so they don't interfere:

```shellsession
iccys@htb[/htb]$ sudo airmon-ng check kill

Killing these processes:

   PID Name
   701 wpa_supplicant
```

---

## Step 3: Scan for WEP Networks

```shellsession
iccys@htb[/htb]$ sudo airodump-ng wlan0mon

CH 11 ][ Elapsed: 0 s ][ 2022-12-28 17:37 

BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

60:38:E0:71:E9:DC   -3        2        0    0   3   54e. WEP  WEP         HTB-Wireless                            
7C:XX:XX:XX:XX:XX  -41        1        0    0   6  130   WPA2 CCMP   PSK  FakeNetwork
7C:XX:XX:XX:XX:XX  -46        1        0    0  10  130   WPA2 CCMP   PSK  FakeNetwork
7C:XX:XX:XX:XX:XX  -48        1        0    0  11  130   WPA2 CCMP   PSK  FakeNetwork
7C:XX:XX:XX:XX:XX  -42        1        0    0  11  130   WPA2 CCMP   PSK  FakeNetwork
7C:XX:XX:XX:XX:XX  -45        1        0    0  11  130   WPA2 CCMP   PSK  FakeNetwork
7C:XX:XX:XX:XX:XX  -44        1        0    0  11  130   WPA2 CCMP   PSK  FakeNetwork
```

Look for **`WEP`** in the `ENC` column — that's our target: **HTB-Wireless**, on channel 3.

---

## Step 4: Capture Traffic From the Target

Now narrow the scan to just this network and save the traffic to a file:

```shellsession
iccys@htb[/htb]$ sudo airodump-ng -c 3 --bssid 60:38:E0:71:E9:DC wlan0mon -w WEP

  CH  3 ][ Elapsed: 48 s ][ 2022-12-28 17:40 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 60:38:E0:71:E9:DC   -3 100      445      731   28   3   54e. WEP  WEP    OPN  HTB-Wireless                        

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 60:38:E0:71:E9:DC  2C:6D:C1:XX:XX:XX  -22   54e-54e     2      464
```

Let this run for a bit to collect packets, then stop it (Ctrl+C). This saves a `.cap` file (named `WEP-01.cap` or similar).

---

## Step 5: Open the Capture in Wireshark

1. Open the saved `.cap` file in Wireshark
2. Click on any **IEEE 802.11 Data** packet
3. Expand the **"IEEE 802.11 Data"** section, then the **"WEP Parameters"** section

You'll now see the actual **Initialization Vector** for that packet, right there in plain view — something like:

```
Initialization Vector: 0x131000
Key Index: 0
WEP ICV not verified
```

🎉 That's it — the IV, sitting completely unencrypted, ready to be read by anyone capturing the traffic. This confirms exactly what earlier guides explained: the IV travels in plaintext alongside the encrypted message.


![Pasted image 20260922000958](/images/notes/wifi/finding-the-initialization-vector-with-wireshark/pasted-image-20260922000958.png)


---

## Why This Matters

The more packets you capture, the more IVs you collect. And the more IVs you have, the easier it becomes to feed them into **aircrack-ng** and statistically work out the actual WEP key (as covered in the very first aircrack-ng guide).

This is exactly why WEP attacks focus so heavily on **generating traffic** (like ARP replay attacks) — more traffic means more IVs, and more IVs means a faster crack.

---

## Command Summary

```bash
iwconfig                                                          # List wireless interfaces
sudo airmon-ng start wlan0                                        # Enable monitor mode
sudo airmon-ng check kill                                         # Kill processes that could interfere
sudo airodump-ng wlan0mon                                         # Scan broadly for nearby networks (look for WEP)
sudo airodump-ng -c 3 --bssid <BSSID> wlan0mon -w WEP             # Capture traffic from one target and save to a file
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`start wlan0`|Enable monitor mode on `wlan0`|
|`check kill`|Kill any processes that might interfere with monitor mode|
|`-c 3`|Focus the scan on channel 3|
|`--bssid <BSSID>`|Only capture traffic from this specific access point|
|`wlan0mon`|The monitor-mode interface to use|
|`-w WEP`|Save captured traffic to files starting with "WEP"|

