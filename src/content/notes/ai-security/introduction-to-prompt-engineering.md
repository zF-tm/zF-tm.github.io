---
title: Introduction to Prompt Engineering
description: Introduction to Prompt Engineering
date: '2026-09-25'
tags: []
published: true
slug: introduction-to-prompt-engineering
category: ai-security
folder: prompt-injection-attacks
order: 10
---
# Introduction to Prompt Engineering

> Prompt engineering is how you write the input to an LLM so it produces the output you want. It matters for security because weak or manipulable prompts lead to prompt injection and data leaks.

## Core Idea

**LLM (Large Language Model)** = an AI model trained on large amounts of text that generates text based on an input.

That input is called the **prompt**.

- The prompt is the **only text-based way** to steer an LLM.
- Better prompts give more relevant, accurate, and creative answers.
- Bad prompts give vague or wrong answers.

**Prompt Engineering** = designing the input prompt so the LLM generates the desired output.

> [!IMPORTANT]
> The prompt is the LLM's main control surface. If someone can influence the prompt, they can influence the model's behavior. This is the root of the attacks in this module.

---

## What Makes a Good Prompt?

A well-engineered prompt usually contains:

- **Clear instructions** — what the model should do
- **Context** — background the model needs
- **Constraints** — limits or format rules for the output

Good prompts also reduce misinformation and make the answer more usable.

### Wording Changes the Result

| Prompt | Result |
|---|---|
| `Write a short paragraph about HackTheBox Academy` | A paragraph |
| `Write a short poem about HackTheBox Academy` | A poem |

It goes beyond the instruction itself. **Phrasing, clarity, context, and tone** all change the output. If a response is poor, small tweaks to these can nudge the model toward what you want.

> [!WARNING]
> LLMs are **not deterministic**. The same prompt can give **different responses each time**. Never assume one test result is the final behavior.

**Deterministic** = the same input always gives the same output. LLMs don't work this way.

---

## Best Practices

### 1. Clarity

Be clear, unambiguous, and concise. Give enough detail so the model can't misinterpret you.

| Vague | Better |
|---|---|
| `How do I get all table names in SQL` | `How do I get all table names in a MySQL database` |

**Why it's better:** SQL has many dialects. Naming **MySQL** removes the guesswork.

### 2. Context and Constraints

Give as much context as possible. Add constraints, and include examples when you can.

| Vague | Better |
|---|---|
| `Provide a list of OWASP Top 10 web vulnerabilities` | `Provide a CSV-formatted list of OWASP Top 10 web vulnerabilities, including the columns 'position','name','description'` |

**Why it's better:** the model knows the exact **format** and **columns** to return.

### 3. Experimentation

Small prompt changes can strongly affect quality.

1. Write a prompt.
2. Note the quality of the response.
3. Tweak the wording slightly.
4. Compare the results.
5. Keep the version that works best.

### 🧠 Remember This

- The prompt is the only text-based way to steer an LLM.
- Prompt engineering covers instructions **and** phrasing, context, and tone.
- LLM output is non-deterministic, so test more than once.
- Good prompts are **clear, contextual, constrained, and tested**.

---

## Where This Fits in Security Frameworks

Before learning attack techniques, see where prompt-related vulnerabilities sit in the main AI security frameworks.

### OWASP Top 10 for LLM Applications

**OWASP (Open Worldwide Application Security Project)** publishes lists of the most common security risks. This module covers two entries from the **2025** list:

| ID | Name | Meaning |
|---|---|---|
| **LLM01:2025** | Prompt Injection | Manipulating the LLM's input prompt, including forcing it to behave in an unintended way |
| **LLM02:2025** | Sensitive Information Disclosure | Any vulnerability that leaks sensitive information |

In this module, the focus for LLM02 is leakage caused by **improper prompt engineering** or **manipulation of the input prompt**.

### Google SAIF

**SAIF (Secure AI Framework)** is Google's framework. It gives broader guidance on building secure AI systems that resist threats.

The attacks in this module map to two SAIF risks:

- **Prompt Injection**
- **Sensitive Data Disclosure**

### Quick Mapping

| Attack Type | OWASP LLM Top 10 (2025) | Google SAIF Risk |
|---|---|---|
| Manipulating the prompt to change behavior | LLM01 Prompt Injection | Prompt Injection |
| Leaking sensitive data via the prompt | LLM02 Sensitive Information Disclosure | Sensitive Data Disclosure |

---

## Security Impact

Why a security person should care:

- The prompt is the entry point for controlling the LLM.
- Poorly designed prompts can be overridden or manipulated.
- Manipulated prompts can cause unintended behavior or leak sensitive data.

### 🔴 Attacker View

The attacker wants to craft input that changes the model's intended behavior or makes it reveal information it shouldn't.

### 🔵 Defender View

The defender wants to write robust prompts and design the application so untrusted input can't take control of the model.

### 🧠 Remember This

- Prompt manipulation maps to **LLM01** (Prompt Injection).
- Prompt-related data leaks map to **LLM02** (Sensitive Information Disclosure).
- Both appear in Google SAIF as Prompt Injection and Sensitive Data Disclosure.

---

# Quick Review

## Key Things to Remember

- The prompt is the LLM's only text-based input, so it steers the output.
- Good prompts have clear instructions, context, and constraints.
- Wording, phrasing, and tone all change the response.
- LLMs are non-deterministic, so the same prompt can give different results.
- Best practices: **clarity**, **context and constraints**, **experimentation**.
- LLM01:2025 is Prompt Injection. LLM02:2025 is Sensitive Information Disclosure.
- Google SAIF covers the same risks as Prompt Injection and Sensitive Data Disclosure.

## Important Terms

| Term | Meaning |
|---|---|
| LLM | Large Language Model, an AI that generates text from an input |
| Prompt | The input given to an LLM |
| Prompt Engineering | Designing prompts so the LLM gives the desired output |
| Deterministic | Same input always gives the same output |
| OWASP | Open Worldwide Application Security Project |
| LLM01:2025 | Prompt Injection |
| LLM02:2025 | Sensitive Information Disclosure |
| SAIF | Google's Secure AI Framework |

## Test Yourself

1. Why is the prompt so important from a security point of view?
2. What is the difference between prompt engineering and just "asking a question"?
3. Why should you test a prompt more than once?
4. Why is `How do I get all table names in a MySQL database` better than `How do I get all table names in SQL`?
5. Which OWASP LLM Top 10 entries relate to prompt manipulation and prompt-based data leaks?
