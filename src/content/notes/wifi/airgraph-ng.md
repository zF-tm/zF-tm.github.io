---
title: airgraph-ng
description: airgraph-ng
date: '2026-09-21'
tags: []
published: true
slug: airgraph-ng
category: wifi
folder: aircrack-ng-essentials
order: 30
---
# Airgraph-ng

## What is it?

Airgraph-ng is a tool that turns airodump-ng's CSV files into **pictures (graphs)**. It shows you how WiFi devices and networks connect to each other, in visual form.

It can make **two types of graphs**:

1. **Clients to AP Graph** — shows which devices are connected to which WiFi networks
2. **Clients Probe Graph** — shows which networks devices are searching for (even if not connected)

This makes it much easier to understand a wireless network at a glance, instead of reading raw text data.

---

## Graph 1: Clients to AP (CAPR)

This graph shows **connections between devices and WiFi networks (APs)**.

⚠️ Note: it only shows APs that have at least one connected device. Empty APs won't appear.

**Color code for networks:**
- 🟢 Green = WPA (stronger security)
- 🟡 Yellow = WEP (weak/old security)
- 🔴 Red = Open network (no password)
- ⚫ Black = Unknown security type

**Command to create it:**

```shellsession
0x0w3@fedora[/htb]$ sudo airgraph-ng -i HTB-01.csv -g CAPR -o HTB_CAPR.png

 WARNING Images can be large, up to 12 Feet by 12 Feet
Creating your Graph using, HTB-01.csv and writing to, HTB_CAPR.png
Depending on your system this can take a bit. Please standby......
```

This reads your `HTB-01.csv` file (created earlier using `airodump-ng -w HTB`) and saves a picture called `HTB_CAPR.png`.

⚠️ Heads up: as the warning says, these images can be huge — up to 12 feet by 12 feet! It may take a little time to generate.

---

## Graph 2: Common Probe Graph (CPG)

This graph shows **which networks each device is searching for**, even if it isn't connected to anything right now.

This is useful for spotting devices that are "looking" for a specific WiFi network — even from a distance.

**Command to create it:**

```shellsession
0x0w3@fedora[/htb]$ sudo airgraph-ng -i HTB-01.csv -g CPG -o HTB_CPG.png

 WARNING Images can be large, up to 12 Feet by 12 Feet
Creating your Graph using, HTB-01.csv and writing to, HTB_CPG.png
Depending on your system this can take a bit. Please standby......
```

Same as before: it reads the CSV file and saves a picture, this time named `HTB_CPG.png`.

---

## Why This Matters

These graphs help you:
- Quickly see how a network is structured
- Spot which devices connect to which networks
- Find weak spots for security testing
- Plan next steps in a security assessment

