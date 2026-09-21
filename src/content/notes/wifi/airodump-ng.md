---
title: airodump-ng
description: Airodump-ng
date: '2026-09-21'
tags: []
published: true
slug: airodump-ng
category: wifi
folder: aircrack-ng-essentials
order: 20
---
# Airodump-ng

## What is it?

Airodump-ng is a tool that **listens to WiFi traffic**. It "sniffs" the air and captures wireless data packets.

People use it to:
- See what WiFi networks are nearby
- Capture special data (like WPA handshakes) needed for security testing with another tool called **aircrack-ng**

It also saves everything it finds into files you can look at later, or use in your own scripts.

---

## The Info Fields (What Each Column Means)

When you run airodump-ng, you get a table. Here's what each column means:

| Field   | Simple Meaning                                 |
| ------- | ---------------------------------------------- |
| BSSID   | The WiFi router's unique address (MAC address) |
| PWR     | Signal strength. Bigger number = better signal |
| Beacons | How many "I'm here!" signals the network sent  |
| #Data   | How many data packets were captured            |
| #/s     | Data packets captured in the last 10 seconds   |
| CH      | Which channel the network uses                 |
| MB      | Max speed the network supports                 |
| ENC     | Type of encryption (security) used             |
| CIPHER  | The specific encryption code used              |
| AUTH    | How devices log in to the network              |
| ESSID   | The WiFi network's name                        |
| STATION | A connected device's unique address            |
| RATE    | Speed between device and router                |
| LOST    | Data packets that got lost                     |
| Packets | Data packets sent by the device                |
| Notes   | Extra info, like captured passwords/keys       |
| PROBES  | Networks the device is searching for           |

---

## Step 1: Turn On Monitor Mode

Before scanning, you need "monitor mode" on your WiFi adapter. This lets it capture ALL nearby wireless traffic (not just traffic meant for you).

```shellsession
0x0w3@fedora[/htb]$ sudo airmon-ng start wlan0

Found 2 processes that could cause trouble.
Kill them using 'airmon-ng check kill' before putting
the card in monitor mode, they will interfere by changing channels
and sometimes putting the interface back in managed mode

    PID Name
    559 NetworkManager
    798 wpa_supplicant

PHY     Interface       Driver          Chipset

phy0    wlan0           rt2800usb       Ralink Technology, Corp. RT2870/RT3070
                (mac80211 monitor mode vif enabled for [phy0]wlan0 on [phy0]wlan0mon)
                (mac80211 station mode vif disabled for [phy0]wlan0)
```

This turns your `wlan0` interface into `wlan0mon` (monitor mode on). You can double check with `iwconfig`:

```shellsession
0x0w3@fedora[/htb]$ iwconfig

eth0      no wireless extensions.

wlan0mon  IEEE 802.11  Mode:Monitor  Frequency:2.457 GHz  Tx-Power=20 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Power Management:on
          
lo        no wireless extensions.
```

---

## Step 2: Start Scanning

Now run:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon

CH  9 ][ Elapsed: 1 min ][ 2007-04-26 17:41 ][
                                                                                                            
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH  MB   ENC  CIPHER AUTH ESSID
                                                                                                            
 00:09:5B:1C:AA:1D   11  16       10        0    0  11  54.  OPN              NETGEAR                         
 00:14:6C:7A:41:81   34 100       57       14    1  48  11e  WEP  WEP         bigbear 
 00:14:6C:7E:40:80   32 100      752       73    2   9  54   WPA  TKIP   PSK  teddy                             
                                                                                                            
 BSSID              STATION            PWR   Rate   Lost  Frames   Notes  Probes
                                
 00:14:6C:7A:41:81  00:0F:B5:32:31:31   51   36-24    2       14           bigbear 
 (not associated)   00:14:A4:3F:8D:13   19    0-0     0        4           mossy 
 00:14:6C:7A:41:81  00:0C:41:52:D1:D1   -1   36-36    0        5           bigbear 
 00:14:6C:7E:40:80  00:0F:B5:FD:FB:C2   35   54-54    0       99           teddy
```

You'll see a live table showing nearby networks and connected devices.

**In this example:** There are 3 networks: **NETGEAR** (open, no password), **bigbear** (WEP — weak security), and **teddy** (WPA — stronger security). Below that, you can see which devices are connected to which network — for example, the device `00:0F:B5:FD:FB:C2` is connected to **teddy**.

---

## Scan Just One Channel

Instead of scanning everything, you can focus on one WiFi channel:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng -c 11 wlan0mon

CH  11 ][ Elapsed: 1 min ][ 2024-05-18 17:41 ][
                                                                                                            
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH  MB   ENC  CIPHER AUTH ESSID
                                                                                                            
 00:09:5B:1C:AA:1D   11  16       10        0    0  11  54.  OPN              NETGEAR                         

 BSSID              STATION            PWR   Rate   Lost  Frames  Notes  Probes
                                
 (not associated)   00:0F:B5:32:31:31  -29    0      42        4
 (not associated)   00:14:A4:3F:8D:13  -29    0       0        4            
 (not associated)   00:0C:41:52:D1:D1  -29    0       0        5
 (not associated)   00:0F:B5:FD:FB:C2  -29    0       0       22           
```

This only checks channel 11. Good for busy areas with lots of networks.

💡 Want multiple channels? `airodump-ng -c 1,6,11 wlan0mon`

---

## Scan 5GHz Networks

By default, airodump-ng only checks the 2.4GHz band. To check 5GHz too, add `--band`:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon --band a

CH  48 ][ Elapsed: 1 min ][ 2024-05-18 17:41 ][ 
                                                                                                            
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH  MB   ENC  CIPHER AUTH ESSID
                                                                                                            
 00:14:6C:7A:41:81   34 100       57       14    1  48  11e  WPA  TKIP        HTB                         

BSSID              STATION            PWR   Rate   Lost  Frames  Notes  Probes
                                
 (not associated)   00:0F:B5:32:31:31  -29    0      42        4
 (not associated)   00:14:A4:3F:8D:13  -29    0       0        4            
 (not associated)   00:0C:41:52:D1:D1  -29    0       0        5
 (not associated)   00:0F:B5:FD:FB:C2  -29    0       0       22           
```

**Band cheat sheet:**
- `a` = 5 GHz
- `b` = 2.4 GHz
- `g` = 2.4 GHz

Want everything at once? Use `--band abg`

---

## Save Results to a File

Add `-w` (write) and a name to save your scan:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon -w HTB

11:32:13  Created capture file "HTB-01.cap".

CH  9 ][ Elapsed: 1 min ][ 2007-04-26 17:41 ][
                                                                                                            
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH  MB   ENC  CIPHER AUTH ESSID
                                                                                                            
 00:09:5B:1C:AA:1D   11  16       10        0    0  11  54.  OPN              NETGEAR                         
 00:14:6C:7A:41:81   34 100       57       14    1  48  11e  WEP  WEP         bigbear 
 00:14:6C:7E:40:80   32 100      752       73    2   9  54   WPA  TKIP   PSK  teddy                             
                                                                                                            
 BSSID              STATION            PWR   Rate   Lost  Frames   Notes  Probes
                                
 00:14:6C:7A:41:81  00:0F:B5:32:31:31   51   36-24    2       14           bigbear 
 (not associated)   00:14:A4:3F:8D:13   19    0-0     0        4           mossy 
 00:14:6C:7A:41:81  00:0C:41:52:D1:D1   -1   36-36    0        5           bigbear 
 00:14:6C:7E:40:80  00:0F:B5:FD:FB:C2   35   54-54    0       99           teddy
```

This creates several files, like:
- `HTB-01.cap` — the raw capture
- `HTB-01.csv` — spreadsheet-friendly data
- `HTB-01.kismet.csv` / `.kismet.netxml` — for other analysis tools
- `HTB-01.log.csv` — a log file

You can confirm they were created with `ls`:

```shellsession
0x0w3@fedora[/htb]$ ls

HTB-01.csv   HTB-01.kismet.netxml   HTB-01.cap   HTB-01.kismet.csv   HTB-01.log.csv 
```

These files let you review your scan later or open it in other tools.

