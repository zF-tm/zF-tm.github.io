---
title: My Own CPTC Simulation Findings Pro
description: My Own CPTC Simulation Findings Pro
date: '2026-11-03'
tags:
  - pentesting
  - CPTC
published: true
slug: my-own-cptc-simulation-findings-pro
category: CPTC
---

# My Own CPTC Simulation — Findings & Walkthrough

A self-built CPTC-style environment I attacked for practice. The target exposes several services on localhost, ranging from a classic web app to an OT/ICS HMI controlling a PLC. This post walks the full chain in the order I actually worked it, with each issue called out as a numbered finding.

> **Note on severities:** Severity ratings below are my own assessment using CVSS-style reasoning (impact + exploitability). They are judgment calls for this lab context, not authoritative scores. CWE/OWASP references are included per finding so each issue can be verified independently.

---

## Scope / Target Map

| Service | Port | Description |
|---|---|---|
| Ticketing web app | 7001 (HTTP) | Login, admin area, SQL-backed |
| OT/PLC HMI | 7002 (HTTP) | Human-Machine Interface controlling a PLC via API |
| Admin / backup web app | 7003 (HTTP) | Runs a custom backup binary |
| SSH | 2222 | `pondtech` user (unprivileged foothold) |
| Android app | — | Out of scope for this run (not tested) |

---

## Findings Summary

Ordered by severity. IDs are stable; the detailed walkthrough that follows is in chronological (attack-chain) order.

| ID | Finding | Severity | Target |
|---|---|---|---|
| F-04 | IDOR on PLC control API → unauthorized physical register writes (safety) | Critical | 7002 |
| F-01 | OS command injection → remote code execution | Critical | 7003 |
| F-02 | Time-based blind SQL injection on `/login` | Critical | 7001 |
| F-13 | JWT admin forgery via `.env` secret disclosed post-RCE → full OT control (safety) | Critical | 7002 (via 7003) |
| F-03 | Insecure SUID binary (`cp`) → root privilege escalation | High | Host (post-RCE) |
| F-05 | Plaintext password storage in database | High | 7001 |
| F-06 | Weak / guessable credentials (username = password) on HMI | High | 7002 |
| F-07 | Credential reuse across services | Medium | 7001 → 7003 |
| F-08 | Sensitive data exposure (SSH key + ops info disclosed) | Medium | 7001 |
| F-09 | Weak encryption password on protected admin archive | Medium | 7001 |
| F-10 | Weak password policy (trivial passwords accepted) | Medium | 7001 |
| F-11 | Client-side-only input validation | Medium | 7002, 7003 |
| F-12 | Cleartext HTTP (no TLS) | Low | All web services |

**Informational / open items:** Unprivileged SSH foothold (`pondtech`); email/article content-injection vector used for the username handoff (needs confirmation — see notes).

---

## 1. Reconnaissance & Transport

Every web service is served over plain **HTTP**, with no TLS anywhere in scope.

> ### F-12 — Cleartext HTTP (no TLS) · *Low*
> **Target:** 7001 / 7002 / 7003
> **Description:** All traffic — including the login on 7001 and the HMI session on 7002 — is transmitted in cleartext. Credentials, session tokens, and PLC control commands are exposed to any on-path attacker.
> **Impact:** Credential and session-token interception, and tampering with OT control messages in transit. This is especially serious for the HMI, where injected/modified traffic can affect physical process state.
> **Remediation:** Enforce HTTPS (TLS) on all services, redirect HTTP→HTTPS, enable HSTS. For OT, isolate the HMI on a segmented network in addition to TLS.
> **Reference:** [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)

---

## 2. Port 7001 — Ticketing Web Application

### 2.1 Weak password policy

The registration/password flow accepts trivially weak passwords, e.g. `123456789`.

![Weak password accepted](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-17-49-12.png)

> ### F-10 — Weak Password Policy · *Medium*
> **Target:** 7001
> **Description:** The application permits trivial passwords (purely numeric, common sequences) with no complexity, length, or breach-list enforcement.
> **Impact:** Accounts become trivially brute-forceable / guessable.
> **Remediation:** Enforce a modern password policy — minimum length (≥12), block common/breached passwords (e.g. HaveIBeenPwned list), and rate-limit authentication. Follow [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) rather than legacy complexity rules.
> **Reference:** [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)

### 2.2 Time-based blind SQL injection on `/login`

The `username` parameter on the login endpoint is injectable. Confirmed with sqlmap:

```bash
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username \
  --ignore-code 401 \
  --batch
```

Result:

```
Parameter: username (POST)
    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: username=dsadas' AND (SELECT 7416 FROM (SELECT(!SLEEP(5)))uDpa) AND 'IjrG'='IjrG&password=dsadsa
```

Enumerating databases:

```bash
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username --ignore-code 401 --batch --dbs
```

```
available databases [2]:
[*] information_schema
[*] ticketing
```

Tables in `ticketing`:

```bash
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username --ignore-code 401 --batch \
  -D ticketing --tables
```

```
Database: ticketing
[5 tables]
+---------------+
| gift_orders   |
| products      |
| sessions      |
| ticket_orders |
| users         |
+---------------+
```

Dumping `users` (run in a separate terminal while enumerating the rest):

```bash
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username --ignore-code 401 --batch \
  -D ticketing -T users --dump
```

Admin record recovered:

```
admin
[INFO] retrieved: Omar Haddad
[INFO] retrieved: 1
[INFO] retrieved: TidalRidge!84
[INFO] retrieved: 9250
[INFO] retrieved: admin
```

> ### F-02 — Time-Based Blind SQL Injection · *Critical*
> **Target:** 7001 — `POST /login`, `username` parameter
> **Description:** The `username` field is concatenated into a SQL query without parameterization, allowing boolean/time-based blind injection and full read access to the `ticketing` database.
> **Impact:** Full database disclosure (all users, credentials, orders). Depending on DB privileges this can extend to write access or further host compromise. Directly yielded the admin credentials used for the rest of the engagement.
> **Remediation:** Use parameterized queries / prepared statements everywhere; apply least-privilege to the DB account; add a WAF as defense-in-depth (not a fix). Never build SQL via string concatenation of user input.
> **Reference:** [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html) · [OWASP: SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

Logging in with `admin` / `TidalRidge!84` succeeds.

### 2.3 Plaintext password storage

The dumped `users` table reveals that passwords are stored in **cleartext** — no hashing.

![Users table dumped in plaintext](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-26-47.png)

> ### F-05 — Plaintext Password Storage · *High*
> **Target:** 7001 (database)
> **Description:** User passwords are stored in plaintext in the `users` table. Any database read (such as via F-02) immediately discloses every credential.
> **Impact:** Total credential compromise with no cracking required. Amplifies the SQLi impact and enables credential reuse against other services (see F-07).
> **Remediation:** Store only salted hashes using a slow, memory-hard algorithm — **argon2id** (preferred), or bcrypt/scrypt. Never store or log plaintext passwords. Re-hash on next login during migration.
> **Reference:** [CWE-256: Plaintext Storage of a Password](https://cwe.mitre.org/data/definitions/256.html) · [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html) · [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### 2.4 Admin area & protected archive

Content discovery (fuzzing) reveals `/admin`:

![Fuzzing reveals /admin](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-07-57.png)

The admin area hosts a password-protected archive available for download:

![Protected archive in admin area](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-08-52.png)

Cracking the archive password:

```bash
zip2john protected.zip > hash.txt
~/john/run/john --wordlist=/home/nabil/tools/SecLists/Passwords/Leaked-Databases/rockyou.txt hash.txt
```

![Archive password cracked](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-19-47.png)

> ### F-09 — Weak Encryption Password on Protected Archive · *Medium*
> **Target:** 7001 — `/admin`
> **Description:** The sensitive archive is protected by a password present in `rockyou.txt`, so it is recovered offline in seconds with `zip2john` + John the Ripper.
> **Impact:** The "protection" provides no real confidentiality. Combined with F-08, it exposed an SSH private key and operational documents.
> **Remediation:** Don't rely on ZIP passwords for confidentiality. Avoid storing secrets/keys in downloadable archives; if archives are necessary, use strong, randomly generated passphrases and proper access control + encryption at rest.
> **Reference:** [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html) · [CWE-326: Inadequate Encryption Strength](https://cwe.mitre.org/data/definitions/326.html)

### 2.5 Sensitive data exposure (SSH key + ops info)

The archive and the site's articles disclose a lot:

- An **SSH private key** (but no username at first).
- A user, **`maya.chen`** (OT/ICS employee), found by reading the articles.
- Details of how **backups** are taken on the site.

![SSH key and files from archive](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-22-58.png)

![Article disclosing maya.chen](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-24-52.png)

![Article disclosing backup process](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-28-22.png)

From this, the SSH username is **`pondtech`** on port **2222**.

> ### F-08 — Sensitive Data Exposure · *Medium*
> **Target:** 7001
> **Description:** An SSH private key and operational details (backup process, employee identities/usernames) are exposed via the admin archive and published articles. These feed directly into the OT compromise later.
> **Impact:** Leaked secrets and recon (usernames, backup internals, SSH key) materially lower the bar for lateral movement and OT access.
> **Remediation:** Keep private keys out of web-accessible content entirely; rotate any exposed key; scrub operational/internal details from public articles; apply least privilege to what the admin area exposes.
> **Reference:** [CWE-200: Exposure of Sensitive Information to an Unauthorized Actor](https://cwe.mitre.org/data/definitions/200.html) · [CWE-312](https://cwe.mitre.org/data/definitions/312.html)

### 2.6 SSH foothold (unprivileged)

Using the recovered key as `pondtech`:

![SSH as pondtech](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-34-37.png)

The `pondtech` user is unprivileged — no immediate escalation path from here, so this is a foothold only (tracked under *Informational*).

---

## 3. Port 7002 — OT/PLC HMI

The HMI controls OT/PLC operations and is behind a login.

![HMI login](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-38-51.png)

### 3.1 Guessable HMI credentials

Recalling the OT/ICS employee `maya.chen`, a username-as-password guess works:

- **username:** `maya.chen`
- **password:** `maya.chen`

![Logged into HMI](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-40-46.png)

> ### F-06 — Weak / Guessable Credentials on OT HMI · *High*
> **Target:** 7002
> **Description:** An OT operator account uses the username as its password. On an interface that controls physical process equipment, this is a critical weakness.
> **Impact:** Direct access to PLC control functions by any attacker who knows (or enumerates) an operator username — and usernames are disclosed via F-08.
> **Remediation:** Enforce strong unique passwords and MFA for OT access; disable username-based defaults; restrict HMI access to a segmented OT network; monitor/alert on OT logins. Reference the [ISA/IEC 62443](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) series for OT security controls.
> **Reference:** [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html) · [CWE-1393: Use of Default Password](https://cwe.mitre.org/data/definitions/1393.html)

### 3.2 IDOR + client-side-only validation on the PLC API

The UI only lets you control a single register. Intercepting the request in Burp shows the coil value is set via an API call that includes the target PLC name in the path: `/api/v1/plc/{name}`.

![Coil change via API](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-42-39.png)

Testing carefully (setting on→on / off→off to avoid changing real state) confirms the server honors a client-supplied target it should not permit — the UI restriction is enforced only on the client side.

![IDOR confirmed on PLC API](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-44-29.png)

> ### F-04 — IDOR on PLC Control API · *Critical (Safety)*
> **Target:** 7002 — `/api/v1/plc/{name}`
> **Description:** The server trusts the client-supplied PLC/register target in the request and does not enforce authorization server-side. The "one register" restriction exists only in the UI. This is an Insecure Direct Object Reference (the API-specific term is Broken Object Level Authorization, BOLA) combined with client-side-only access control, on an interface that writes directly to a PLC. The authorization boundary is confirmed by the existence of a separate `admin` role intended to control *all* coils (see F-13): an operator reaching other coils via the API is exceeding its intended object scope, not exercising a capability it was granted.
> **Impact — Critical (safety):** Unauthorized write access to physical process registers can drive equipment into unsafe states (opening/closing valves, starting/stopping pumps, tripping breakers, overriding setpoints). Depending on the process controlled, consequences range from process disruption and equipment damage to injury or loss of life. For OT/ICS, human safety and availability outweigh confidentiality, so this rates above a comparable IT data-access IDOR. CVSS v4.0 added explicit **Safety** metrics for exactly this case — the provider-assessed **Safety (S)** supplemental metric and the consumer-assessed modified subsequent-system safety values (**MSI:S / MSA:S**) in the environmental group let a scorer express impact to human life, which CVSS v3.1 could not. *(This rating assumes the PLC governs a real physical process — the correct default for a pentest unless proven otherwise. If a given register only drives a harmless indicator, downgrade that case accordingly.)*
> **Remediation:** Enforce authorization server-side for every PLC/register a request targets; map each user to an allow-list of permitted objects; never rely on the UI to constrain actions; log and alert on all PLC writes. Segment the OT network and apply defense-in-depth per ISA/IEC 62443; where safety is in scope, ensure an independent Safety Instrumented System (SIS) cannot be overridden from the HMI.
> **Reference:** [CWE-639: Authorization Bypass Through User-Controlled Key (IDOR)](https://cwe.mitre.org/data/definitions/639.html) · [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html) · [CVSS v4.0 Specification (Safety metrics)](https://www.first.org/cvss/v4-0/specification-document) · [ISA/IEC 62443](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) · [CISA: Industrial Control Systems](https://www.cisa.gov/topics/industrial-control-systems)

*(F-04's client-side-validation aspect is the same root cause tracked generally as **F-11**, which also appears on 7003.)*

### 3.3 Content discovery & JWT

Fuzzing reveals `robots.txt`:

![Fuzzing 7002](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-45-33.png)

![robots.txt entry](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-46-15.png)

![robots.txt contents](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-46-51.png)

A **JWT** is in use on the site:

![JWT present](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-47-54.png)

Initial attempts to crack the signing key (unsuccessful) and to downgrade to `alg:none` (rejected) both failed, so the token is **not forgeable yet**. Parked pending a signing secret — and one does turn up later: the `.env` secret recovered *after* the 7003 RCE lets the token be forged with `role=admin`. Because that step depends on first compromising 7003, it's covered in **§6 (Post-Exploitation)**.

---

## 4. Port 7003 — Admin / Backup Web Application

### 4.1 Credential reuse

The admin credentials from 7001 (`admin` / `TidalRidge!84`) also work here.

![Logged into 7003 with reused creds](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-50-49.png)

To answer the note in the original ("not sure if this is password reuse") — **yes**, this is credential reuse: the same secret authenticates to two independent services.

> ### F-07 — Credential Reuse Across Services · *Medium*
> **Target:** 7001 → 7003
> **Description:** The admin credential recovered from the ticketing DB is valid on the separate backup application. Compromise of one service immediately compromised another.
> **Impact:** Expands blast radius — one leaked credential (via F-02/F-05) grants admin on multiple systems and set up the RCE below.
> **Remediation:** Unique credentials per service; centralized SSO/IdP with MFA; detect and prevent password reuse; rotate shared/admin credentials.
> **Reference:** [CWE-521](https://cwe.mitre.org/data/definitions/521.html) · [OWASP: Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)

### 4.2 Client-side-only validation on the backup date field

A date field is validated only on the client:

![Client-side date validation](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-53-17.png)

![Date field](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-54-00.png)

Submitting a valid date and then editing the request in Burp bypasses the check entirely.

> ### F-11 — Client-Side-Only Input Validation · *Medium*
> **Target:** 7002 and 7003
> **Description:** Input restrictions (register selection on 7002; date format on 7003) are enforced only in the browser. Intercepting proxies bypass them trivially. On 7003 this directly enabled the command injection below.
> **Impact:** Any client-side-only control is not a security control. Here it is the gateway to both the IDOR (F-04) and the RCE (F-01).
> **Remediation:** Re-validate and sanitize all input server-side; treat all client input as untrusted; use strict allow-list validation on the server.
> **Reference:** [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html) · [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

### 4.3 OS command injection → RCE

The articles mentioned a **custom backup binary** run on the system. The date field (once past client validation) is passed into a shell command. Testing with a shell metacharacter:

Payload (URL-encoded): `12-30-1990+%3b+ls` → decodes to `12-30-1990 ; ls`

Response:

```
Backup done at 12-30-1990 ; ls
snapshot queued: 12-30-1990
node_modules
package-lock.json
package.json
public
server.js
views
```

![Command injection confirmed](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-57-18.png)

Command execution is confirmed. Escalating to a reverse shell:

![Reverse shell setup 1](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-04-56.png)

![Reverse shell setup 2](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-05-37.png)

![Reverse shell obtained](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-06-01.png)

> ### F-01 — OS Command Injection → RCE · *Critical*
> **Target:** 7003 — backup date parameter
> **Description:** User input from the backup date field is passed into a shell command without sanitization. A `;`-separated payload runs arbitrary commands on the host, yielding a reverse shell.
> **Impact:** Full remote code execution as the web service user — the most severe issue in scope and the pivot to full host compromise (see F-03). It also exposed the OT HMI's JWT signing secret from the host's `.env`, which chains into full OT admin (see F-13).
> **Remediation:** Never pass user input to a shell. Use parameterized APIs / `execve`-style calls with argument arrays (no shell interpretation); strictly allow-list the date format server-side; run the service with least privilege. See the OWASP OS Command Injection guidance.
> **Reference:** [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html) · [OWASP: OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)

---

## 5. Privilege Escalation → root

Enumerating SUID binaries on the compromised host shows `cp` with the SUID bit set:

![cp has SUID bit](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-07-16.png)

A SUID `cp` runs with the file owner's (root's) privileges and **does not drop them**, so it can read or write any file as root — the standard [GTFOBins `cp`](https://gtfobins.github.io/gtfobins/cp/) technique. Typical escalation paths:


This yields root.

![Privilege escalation to root](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-10-06.png)

> ### F-03 — Insecure SUID Binary (`cp`) → Root · *High*
> **Target:** Host (post-RCE from F-01)
> **Description:** `cp` carries the SUID root bit, giving any local user an arbitrary file read/write primitive as root, which is leveraged to escalate to full root.
> **Impact:** Complete host compromise (root) from the unprivileged RCE foothold.
> **Remediation:** Remove the SUID bit (`chmod u-s /bin/cp`); audit all SUID/SGID binaries against GTFOBins and remove any unnecessary ones; prefer capabilities or sudo rules scoped tightly instead of broad SUID.
> **Reference:** [GTFOBins: cp](https://gtfobins.github.io/gtfobins/cp/) · [CWE-250: Execution with Unnecessary Privileges](https://cwe.mitre.org/data/definitions/250.html) · [CWE-732: Incorrect Permission Assignment for Critical Resource](https://cwe.mitre.org/data/definitions/732.html)

---

## 6. Post-Exploitation — `.env` Secret Disclosure → OT Admin

The 7003 command-injection RCE (F-01), escalated to root via the SUID `cp` abuse (F-03), gives filesystem access to the host. The JWT signing secret used by the OT HMI (7002) is sitting in a `.env` file and is read straight off disk — this is what resolves the JWT item parked back in §3.3.

> *The secret was never brute-forceable; it was obtained by reading it from the compromised host. That distinction matters — the root cause is secret exposure across a trust boundary, not weak cryptography.*

With the genuine secret in hand, the HMI's session token is re-signed with `role=admin` and accepted as valid:

![Forging the admin JWT with the recovered .env secret](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-34-29.png)

![Admin token accepted by the HMI](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-35-13.png)

With an admin token, **all PLC coils can be controlled directly from the UI** — the per-request API tampering from F-04 is no longer needed — and the admin-only API endpoint disclosed earlier in `robots.txt` becomes accessible:

![Admin-only API from robots.txt now accessible](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-36-03.png)

This closes the loop: a weakness on the *backup* app (7003) ends in full administrative control of the *safety-critical OT* system (7002).

> ### F-13 — JWT Admin Forgery via `.env` Secret Disclosed Post-RCE → Full OT Control · *Critical (Safety)*
> **Target:** 7002 — session JWT · **Prerequisite:** F-01 (RCE on 7003), aided by F-03 (root)
> **Description:** The OT HMI derives authorization from a `role` claim inside an HMAC-signed JWT. The signing secret was **not weak** — brute-force and the `alg:none` downgrade both failed (§3.3). It was recovered by reading the application's `.env` file once the 7003 RCE gave filesystem access. With the genuine secret, a token re-signed with `role=admin` passes signature verification. The weakness is twofold: (1) the OT system's admin authority rests on a secret that becomes readable the moment a co-located service is compromised — a cross-trust-boundary secret-exposure / blast-radius problem, not weak crypto; and (2) authorization is taken from a self-asserted `role` claim, so any secret compromise converts directly into full admin.
> **Impact — Critical (safety):** Full control of every PLC coil from the HMI, plus access to the admin-only API from `robots.txt`. Because it chains off a confirmed, trivial RCE (F-01) that also yields root (F-03), the end-to-end path is reliable — and it terminates at the safety-critical OT system, with the physical-harm consequences described in F-04.
> **Remediation:** Isolate secrets so one service's compromise cannot expose another's signing key (per-service secrets, separate trust zones, a secrets manager with scoped access rather than a shared or world-readable `.env`); rotate the exposed secret and invalidate outstanding tokens; prefer asymmetric signing (RS256/ES256) so the HMI holds only a *public* verification key, never a forging key; and don't derive authorization solely from a client-presented `role` claim — check entitlements server-side per action. Network-segment the OT HMI from IT services (ISA/IEC 62443) so 7003 cannot reach 7002's trust domain at all.
> **Reference:** [CWE-522: Insufficiently Protected Credentials](https://cwe.mitre.org/data/definitions/522.html) · [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html) · [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html) · [OWASP API2:2023 Broken Authentication](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/) · [OWASP WSTG: Testing JSON Web Tokens](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens) · [PortSwigger: JWT attacks](https://portswigger.net/web-security/jwt)

---

## 7. Out of Scope / Not Tested

- **Android app** — not attacked in this run.

---

## 8. Notes & Open Items

- **JWT on 7002:** resolved — the signing secret was read from `.env` after the 7003 RCE (F-01) and used to forge an `admin`-role token (**F-13**, Critical). This is an IT→OT lateral-movement chain, and it also confirms the authorization boundary behind **F-04**.
- **`pondtech` SSH foothold:** valid but unprivileged; no local escalation path found from that entry point.
- **Email / article content-injection (username handoff):** In the original notes you mention passing the username via an "email inject" because the AD-pentester handoff wasn't possible against a single machine. **This needs your confirmation before I write it as a finding** — I couldn't tell from the notes whether this is (a) a genuine HTML/content-injection vulnerability you discovered in the app, or (b) a simulation-design workaround you used to seed the `maya.chen` username. If it's (a), tell me the injection point and I'll write it up as its own finding (likely [CWE-79: XSS](https://cwe.mitre.org/data/definitions/79.html) or a content/HTML-injection finding). If it's (b), it stays as a lab-design note.

---

## Attack Chain (one-line summary)

HTTP recon → **SQLi on 7001** → admin creds + **plaintext passwords** → **/admin archive** cracked → **SSH key + ops disclosure** → **weak HMI creds on 7002** → **IDOR on PLC API** (operator-scoped foothold) → **creds reused on 7003** → **command injection → RCE** → **SUID `cp` → root** → **read JWT secret from `.env` → forge admin token → full OT/coil control on 7002**.

## References (verified)

- GTFOBins — cp: https://gtfobins.github.io/gtfobins/cp/
- CWE-256 Plaintext Storage of a Password: https://cwe.mitre.org/data/definitions/256.html
- CWE-312 Cleartext Storage of Sensitive Information: https://cwe.mitre.org/data/definitions/312.html
- OWASP Password Plaintext Storage: https://owasp.org/www-community/vulnerabilities/Password_Plaintext_Storage
- CWE-89 SQL Injection: https://cwe.mitre.org/data/definitions/89.html
- CWE-78 OS Command Injection: https://cwe.mitre.org/data/definitions/78.html
- CWE-319 Cleartext Transmission: https://cwe.mitre.org/data/definitions/319.html
- CWE-521 Weak Password Requirements: https://cwe.mitre.org/data/definitions/521.html
- CWE-639 IDOR: https://cwe.mitre.org/data/definitions/639.html
- CWE-602 Client-Side Enforcement of Server-Side Security: https://cwe.mitre.org/data/definitions/602.html
- CWE-250 Execution with Unnecessary Privileges: https://cwe.mitre.org/data/definitions/250.html
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- CWE-347 Improper Verification of Cryptographic Signature: https://cwe.mitre.org/data/definitions/347.html
- CWE-798 Use of Hard-coded Credentials: https://cwe.mitre.org/data/definitions/798.html
- OWASP API Security Top 10 — API2:2023 Broken Authentication: https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/
- OWASP WSTG — Testing JSON Web Tokens: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens
- PortSwigger — JWT attacks: https://portswigger.net/web-security/jwt
- CVSS v4.0 (Safety metrics): https://www.first.org/cvss/v4-0/specification-document
