---
title: Introduction to Jailbreaking
description: Introduction to Jailbreaking
date: '2026-09-25'
tags: []
published: true
slug: introduction-to-jailbreaking
category: ai-security
folder: jailbreaking
order: 10
---
# Introduction to Jailbreaking

> Jailbreaking means bypassing an LLM's restrictions. Prompt injection is often the tool used to do it.

## Core Idea

**Jailbreaking** = getting an LLM to bypass restrictions placed on it.

These restrictions come from two places:

- The **system prompt**
- The model's **training process**

**Example of trained-in resilience:** LLMs usually refuse to write malware source code — even if the system prompt says nothing about it, and even if the system prompt explicitly *asks* for harmful content.

> [!IMPORTANT]
> This "built-in" resistance to generating harmful content is exactly what **universal jailbreaks** try to bypass. If successful, they let an attacker abuse the LLM for many different malicious purposes.

## Jailbreaking Isn't Only About Harmful Content

Jailbreaking can also just mean pushing the LLM off its **intended task** — even for something harmless.

**Example:** getting a translation bot to generate a pizza dough recipe instead of translating.

### 🧠 Remember This

- Jailbreak restrictions come from the system prompt **or** the model's training.
- A jailbreak isn't always about "harmful" content — it can just be forcing the LLM off-task.
- The overall goal: override the LLM's intended behavior, often by bypassing security restrictions.

---

## Types of Jailbreak Prompts

> [!TIP]
> This list is **not exhaustive**. New jailbreak types are discovered constantly, and this module only covers some of them in depth in later sections.

| Type | Main Idea |
|---|---|
| DAN (Do Anything Now) | A prompt style aiming to bypass **all** restrictions at once |
| Roleplay | Ask the question indirectly, through a fictional character or scenario |
| Fictional Scenarios | Convince the LLM the request is "just fiction" to lower its guard |
| Token Smuggling | Manipulate input tokens (splitting words, encodings) to hide a blocked word from detection |
| Suffix / Adversarial Suffix | Append text after the malicious prompt to nudge the model into completing it |
| Opposite / Sudo Mode | Convince the LLM it's in a special "mode" where restrictions don't apply |

### DAN (Do Anything Now)

Aims to bypass **all** LLM restrictions at once. Many versions and variants exist. The source material references a GitHub repository collecting DAN prompts (no URL was included in this material).

### Roleplay

**Idea:** don't ask the restricted question directly — get the LLM to answer it *as a character* in a roleplay or fictional scenario instead.

### Fictional Scenarios

**Idea:** convince the LLM that the request only matters within a fictional story. This can lower the model's guard against generating restricted info.

### Token Smuggling

**Token** = a chunk of text the model processes (a word, part of a word, or a symbol).

**Idea:** split a blocked word across multiple tokens, or encode it differently, so the LLM's filters don't recognize the word as blocked — but the model can still understand the intent.

### Suffix & Adversarial Suffix

> [!IMPORTANT]
> LLMs are fundamentally **text completion** algorithms — they predict what comes next.

**Suffix attack:** append extra text after a malicious prompt to nudge the model toward completing the harmful request.

**Adversarial suffix:** an advanced, specifically crafted version of this. It's designed to force the LLM to ignore its restrictions, and it often looks like nonsense to a human reader.

### Opposite / Sudo Mode

**Idea:** convince the LLM it's now running in a different "mode" (like a sudo/root mode) where the normal restrictions no longer apply.

### 🧠 Remember This

- Different jailbreak types use different tricks: hiding intent (token smuggling), reframing as fiction (roleplay/fictional scenario), exploiting text-completion behavior (suffixes), or claiming a special mode (sudo mode).
- DAN-style prompts try to bypass everything at once; others are narrower.

---

# Quick Review

## Key Things to Remember

- Jailbreaking = bypassing an LLM's restrictions, often via prompt injection.
- Restrictions can come from the system prompt or from training.
- LLMs resist generating harmful content even without an explicit system-prompt rule against it.
- Jailbreaking can also just mean pushing a model off its intended task, not just extracting harmful content.
- Six named types covered: DAN, Roleplay, Fictional Scenarios, Token Smuggling, Suffix/Adversarial Suffix, Opposite/Sudo Mode.
- The list of jailbreak types is not exhaustive — new ones keep appearing.

## Important Terms

| Term | Meaning |
|---|---|
| Jailbreaking | Bypassing restrictions imposed on an LLM |
| Universal jailbreak | A jailbreak aiming to bypass all of an LLM's core trained-in restrictions |
| Token | A chunk of text (word, part of a word, or symbol) the model processes |
| Token smuggling | Splitting/encoding blocked words to dodge filters |
| Adversarial suffix | Specially crafted trailing text designed to force restriction bypass |

## Test Yourself

1. What two sources typically enforce an LLM's restrictions?
2. Why does the pizza-dough-recipe example count as jailbreaking, even though it's harmless?
3. How does token smuggling try to get around content filters?
4. Why are LLMs described as "text completion algorithms," and how does that relate to suffix attacks?
5. What is the difference between a "universal" jailbreak and a narrower one, like getting a bot to go off-task?
