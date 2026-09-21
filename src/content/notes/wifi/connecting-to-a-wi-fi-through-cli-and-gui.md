---
title: Connecting to a Wi-Fi through CLI and GUI
description: Connecting to a Wi-Fi through CLI and GUI
date: '2026-09-21'
tags: []
published: true
slug: connecting-to-a-wi-fi-through-cli-and-gui
category: wifi
folder: introduction-to-wi-fi-pentesting
order: 30
---
# Connecting to WiFi Networks (Linux)

## What's This About?

Once you've found a WiFi password (or already have one), you need to actually **connect** to the network. This guide covers two ways to do that:

1. Using a **graphical interface (GUI)** --> point and click
2. Using the **command line (CLI)** --> typing commands

---

## Method 1: Using a GUI

This is the easy, everyday way most people connect to WiFi. If you have the password, it's just 4 steps:

1. **Scan** for nearby networks
2. **Select** the one you want
3. **Enter** the password
4. **Connect**

That's it. Your system's network menu handles the rest.

---

## Method 2: Using the Command Line (CLI)

Sometimes you won't have a graphical menu --> maybe you're on a server, or working purely in the terminal. Here's how to connect using commands instead.

### Step 1: Scan for Networks

If your WiFi card doesn't support monitor mode (or you just don't need it), you can scan in regular mode using `iwlist`:

```shellsession
0x0w3@fedora[/htb]$ sudo iwlist wlan0 s | grep 'Cell\|Quality\|ESSID\|IEEE'

          Cell 01 - Address: D8:D6:3D:EB:29:D5
                    Quality=61/70  Signal level=-49 dBm  
                    ESSID:"HackMe"
                    IE: IEEE 802.11i/WPA2 Version 1
          Cell 02 - Address: 3E:C1:D0:F2:5D:6A
                    Quality=70/70  Signal level=-30 dBm  
                    ESSID:"HackTheBox"
          Cell 03 - Address: 9C:9A:03:39:BD:71
                    Quality=70/70  Signal level=-30 dBm  
                    ESSID:"HTB-Corp"
                    IE: IEEE 802.11i/WPA2 Version 1
```

**In this example**, there are 3 networks:

- **HackTheBox** : no encryption info shown, likely WEP
- **HackMe** : uses WPA2
- **HTB-Corp** : uses WPA2-Enterprise (business-style login)

We'll connect to each type one by one, starting with WEP.

---

### Connecting to a WEP Network

**Step 1:** Create a config file (e.g. `wep.conf`) with your network details:

```
network={
    ssid="HackTheBox"
    key_mgmt=NONE
    wep_key0=3C1C3A3BAB
    wep_tx_keyidx=0
}
```

📝 `key_mgmt=NONE` just means "no modern security" : used for WEP or open networks.

**Step 2:** Connect using `wpa_supplicant`:

```shellsession
0x0w3@fedora[/htb]$ sudo wpa_supplicant -c wep.conf -i wlan0

Successfully initialized wpa_supplicant
wlan0: SME: Trying to authenticate with 3e:c1:d0:f2:5d:6a (SSID='HackTheBox' freq=2412 MHz)
wlan0: Trying to associate with 3e:c1:d0:f2:5d:6a (SSID='HackTheBox' freq=2412 MHz)
wlan0: Associated with 3e:c1:d0:f2:5d:6a
wlan0: CTRL-EVENT-CONNECTED - Connection to 3e:c1:d0:f2:5d:6a completed [id=0 id_str=]
wlan0: CTRL-EVENT-SUBNET-STATUS-UPDATE status=0
```

**Step 3:** Get an IP address so you can actually use the internet:

```shellsession
0x0w3@fedora[/htb]$ sudo dhclient wlan0
```

**Step 4:** Confirm it worked:

```shellsession
0x0w3@fedora[/htb]$ ifconfig wlan0

wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.2.7  netmask 255.255.255.0  broadcast 192.168.2.255
        ether f6:65:bc:77:c9:21  txqueuelen 1000  (Ethernet)
        RX packets 7  bytes 1217 (1.2 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 14  bytes 3186 (3.1 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

You now have an IP address (`192.168.2.7`) : you're connected!

---

### Connecting to a WPA/WPA2 Personal Network

**Step 1:** Create a config file (e.g. `wpa.conf`):

```
network={
    ssid="HackMe"
    psk="password123"
}
```

**Step 2:** Connect:

```shellsession
0x0w3@fedora[/htb]$ sudo wpa_supplicant -c wpa.conf -i wlan0

Successfully initialized wpa_supplicant
wlan0: SME: Trying to authenticate with d8:d6:3d:eb:29:d5 (SSID='HackMe' freq=2412 MHz)
wlan0: Trying to associate with d8:d6:3d:eb:29:d5 (SSID='HackMe' freq=2412 MHz)
wlan0: Associated with d8:d6:3d:eb:29:d5
wlan0: CTRL-EVENT-SUBNET-STATUS-UPDATE status=0
wlan0: WPA: Key negotiation completed with d8:d6:3d:eb:29:d5 [PTK=CCMP GTK=CCMP]
wlan0: CTRL-EVENT-CONNECTED - Connection to d8:d6:3d:eb:29:d5 completed [id=0 id_str=]
```

**Step 3:** If you already have an old IP address from a different network, release it first:

```shellsession
0x0w3@fedora[/htb]$ sudo dhclient wlan0 -r

Killed old client process
```

**Step 4:** Now get a fresh IP:

```shellsession
0x0w3@fedora[/htb]$ sudo dhclient wlan0 
```

**Step 5:** Confirm it worked:

```shellsession
0x0w3@fedora[/htb]$ ifconfig wlan0

wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.7  netmask 255.255.255.0  broadcast 192.168.1.255
        ether f6:65:bc:77:c9:21  txqueuelen 1000  (Ethernet)
        RX packets 37  bytes 6266 (6.2 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 41  bytes 6967 (6.9 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

💡 **WPA3 networks?** Just add `key_mgmt=SAE` to your config file. SAE is the special login method WPA3 uses.

---

### Connecting to a WPA/WPA2 Enterprise Network

Enterprise networks (common in offices) need a **username and password**, not just a shared passphrase.

**Step 1:** Create a config file:

```
network={
  ssid="HTB-Corp"
  key_mgmt=WPA-EAP
  identity="HTB\Administrator"
  password="Admin@123"
}
```

**Step 2:** Connect:

```shellsession
0x0w3@fedora[/htb]$ sudo wpa_supplicant -c wpa_enterprise.conf -i wlan0

Successfully initialized wpa_supplicant
wlan0: SME: Trying to authenticate with 9c:9a:03:39:bd:71 (SSID='HTB-Corp' freq=2412 MHz)
wlan0: Trying to associate with 9c:9a:03:39:bd:71 (SSID='HTB-Corp' freq=2412 MHz)
wlan0: Associated with 9c:9a:03:39:bd:71
wlan0: CTRL-EVENT-SUBNET-STATUS-UPDATE status=0
wlan0: CTRL-EVENT-EAP-STARTED EAP authentication started
wlan0: CTRL-EVENT-EAP-PROPOSED-METHOD vendor=0 method=25
wlan0: CTRL-EVENT-EAP-METHOD EAP vendor 0 method 25 (PEAP) selected
wlan0: CTRL-EVENT-EAP-PEER-CERT depth=0 subject='/C=US/ST=California/L=San Fransisco/O=HTB/CN=htb.com' hash=46b80ecdee1a588b1fed111307a618b8e4429d7cb9e639fe976741e1a1e2b7ae
wlan0: CTRL-EVENT-EAP-PEER-CERT depth=0 subject='/C=US/ST=California/L=San Fransisco/O=HTB/CN=htb.com' hash=46b80ecdee1a588b1fed111307a618b8e4429d7cb9e639fe976741e1a1e2b7ae
EAP-MSCHAPV2: Authentication succeeded
wlan0: CTRL-EVENT-EAP-SUCCESS EAP authentication completed successfully
wlan0: PMKSA-CACHE-ADDED 9c:9a:03:39:bd:71 0
wlan0: WPA: Key negotiation completed with 9c:9a:03:39:bd:71 [PTK=CCMP GTK=CCMP]
wlan0: CTRL-EVENT-CONNECTED - Connection to 9c:9a:03:39:bd:71 completed [id=0 id_str=]
```

**Step 3:** Release any old IP:

```shellsession
0x0w3@fedora[/htb]$ sudo dhclient wlan0 -r

Killed old client process
```

**Step 4:** Get a new IP:

```shellsession
0x0w3@fedora[/htb]$ sudo dhclient wlan0 
```

**Step 5:** Confirm:

```shellsession
0x0w3@fedora[/htb]$ ifconfig wlan0

wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.3.7  netmask 255.255.255.0  broadcast 192.168.3.255
        ether f6:65:bc:77:c9:21  txqueuelen 1000  (Ethernet)
        RX packets 66  bytes 10226 (10.2 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 77  bytes 11532 (11.5 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

---

## Method 3: Using nmtui (Text-Based Network Manager)

If you want something more visual than raw commands, but still text-based, try `nmtui`:

```shellsession
0x0w3@fedora[/htb]$ sudo nmtui
```

This opens a simple menu with options like:

- Edit a connection
- Activate a connection
- Set system hostname
- Quit

Selecting **"Activate a connection"** shows you a list of WiFi networks to choose from. You'll be prompted for a password if needed. Easy!
