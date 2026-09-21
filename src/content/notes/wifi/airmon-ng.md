---
title: airmon-ng
description: airmon-ng
date: '2026-09-21'
tags: []
published: true
slug: airmon-ng
category: wifi
folder: aircrack-ng-essentials
order: 10
---
# Aircrack-ng Notes

*A simple, no-fluff guide to the Aircrack-ng suite and Airmon-ng.*

---

## What Is Aircrack-ng?

A full toolkit for testing WiFi security. Everything is command-line, so it's easy to script (a lot of GUIs out there are just wrappers around it).

**Runs on:** Linux (primary), Windows, macOS, and a few BSDs/Solaris.

It covers 4 jobs:

| Job | What it means |
|---|---|
| **Monitoring** | Capture packets, export to files for other tools |
| **Attacking** | Replay attacks, deauth, fake APs, packet injection |
| **Testing** | Check if your card/driver can capture and inject |
| **Cracking** | Break WEP and WPA/WPA2 PSK passwords |

---

## Airmon-ng: The Monitor-Mode Tool

Handles switching your card into monitor mode (or back to managed), and can kill processes that get in the way.

### 1. Check your interface

> Shows your interface's current state: name, driver, chipset. No parameters needed.

```shell
sudo airmon-ng
```

### 2. Turn on monitor mode

> Switches your card into monitor mode.

```shell
sudo airmon-ng start wlan0
```

> **Verify it worked**: look for `Mode: Monitor`.

```shell
iwconfig
```

### 3. Deal with interfering processes

> Some background processes (like network managers) can mess with monitor mode.

**Step A: Find them**

```shell
sudo airmon-ng check
```
> Lists any processes that might interfere, along with their PIDs.

**Step B: Kill them**

```shell
sudo airmon-ng check kill
```
> Kills those interfering processes.

### 4. Lock monitor mode to one channel

**Step A: Find the channel you need**

```shell
sudo airodump-ng wlan0mon
```
> Shows nearby networks and what channel each one is on.

**Step B: Lock onto it** (example: channel 11)

```shell
sudo airmon-ng start wlan0 11
```
> Puts `wlan0` into monitor mode specifically on channel 11.

### 5. Turn monitor mode off

```shell
sudo airmon-ng stop wlan0mon
```
> Stops monitor mode.

> **Confirm it's off**: should now show `Mode: Managed` (sometimes `Auto`, depends on setup).

```shell
sudo iwconfig
```

---

## Airmon-ng: Quick Reference Cheatsheet

| Command | What it does |
|---|---|
| `sudo airmon-ng` | View interface name, driver, and chipset |
| `sudo airmon-ng start wlan0` | Enter monitor mode |
| `sudo airmon-ng check` | Check for interfering processes |
| `sudo airmon-ng check kill` | Kill interfering processes |
| `sudo airodump-ng wlan0mon` | Get available networks and their channel numbers |
| `sudo airmon-ng start wlan0 11` | Turn on monitor mode locked to channel 11 (swap for any channel) |
| `sudo airmon-ng stop wlan0mon` | Stop monitor mode |
| `sudo iwconfig` | Shows several fields, including `Mode`, used to confirm current state |

---

### Quick Recap

1. Check interface: `airmon-ng`
2. Kill interfering processes: `airmon-ng check kill`
3. Start monitor mode: `airmon-ng start wlan0 [channel]`
4. Do your thing
5. Stop monitor mode: `airmon-ng stop wlan0mon`
