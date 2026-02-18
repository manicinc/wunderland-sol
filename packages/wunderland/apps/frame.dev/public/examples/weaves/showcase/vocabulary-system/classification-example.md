---
id: vocabulary-classification-example
slug: vocabulary-classification-example
title: "Classification Examples"
version: "1.0.0"
difficulty: beginner
taxonomy:
  subjects:
    - technology
    - ai
  topics:
    - nlp
    - examples
tags:
  - vocabulary
  - classification
  - examples
  - practical
relationships:
  references:
    - vocabulary-system-intro
    - vocabulary-api-usage
publishing:
  status: published
  lastUpdated: "2025-01-02"
summary: Real-world examples of the vocabulary system classifying different types of content.
---

# Classification Examples

See the dynamic vocabulary system in action with real text samples. Each example shows the input text and the resulting classification with confidence scores.

---

## Example 1: Technical Blog Post

### Input Text
```
Getting Started with Docker Containers

Docker revolutionized how we deploy applications. This beginner's guide
covers the basics of containerization, including:
- Writing your first Dockerfile
- Building and running containers
- Docker Compose for multi-container apps

Prerequisites: Basic command line knowledge
```

### Classification Result

| Category | Top Matches | Score |
|----------|-------------|-------|
| **Subject** | technology | 0.94 |
| **Topic** | getting-started | 0.91 |
| **Skill** | docker | 0.97 |
| **Difficulty** | beginner | 0.89 |

**Why it works:**
- "Docker" directly matches the `docker` skill term
- "Getting Started", "beginner's guide", "basics" all signal beginner difficulty
- "Dockerfile", "containers", "deploy" connect to technology subject
- "first", "guide", "basics" trigger getting-started topic

---

## Example 2: Research Paper Abstract

### Input Text
```
Attention Is All You Need

We propose a new architecture called the Transformer, based solely on
attention mechanisms. Experiments on machine translation tasks show the
model achieves state-of-the-art results while being more parallelizable
and requiring significantly less time to train.
```

### Classification Result

| Category | Top Matches | Score |
|----------|-------------|-------|
| **Subject** | ai | 0.96 |
| **Subject** | science | 0.82 |
| **Topic** | architecture | 0.88 |
| **Topic** | performance | 0.71 |
| **Skill** | transformer | 0.94 |
| **Difficulty** | advanced | 0.85 |

**Why it works:**
- "Transformer", "attention mechanisms", "machine translation" → AI subject
- "experiments", "results" → science subject
- "architecture" literally matches the topic
- "state-of-the-art", "parallelizable" → advanced difficulty
- WordNet expands "experiments" to find "research", "study"

---

## Example 3: Troubleshooting Guide

### Input Text
```
Fixing Memory Leaks in Node.js Applications

If your Node.js app's memory usage keeps growing, you likely have a memory
leak. Common causes include:
- Unclosed database connections
- Global variable accumulation
- Event listener buildup

Use heap snapshots and the --inspect flag to identify the source.
```

### Classification Result

| Category | Top Matches | Score |
|----------|-------------|-------|
| **Subject** | technology | 0.91 |
| **Topic** | troubleshooting | 0.95 |
| **Topic** | performance | 0.84 |
| **Skill** | nodejs | 0.93 |
| **Difficulty** | intermediate | 0.77 |

**Why it works:**
- "Fixing", "problem", "causes", "identify" → troubleshooting topic
- "Memory leaks", "heap snapshots" → performance topic
- The technical nature (heap, connections) signals intermediate
- Synonym expansion: "fixing" → "repair", "solve", "debug"

---

## Example 4: Philosophy Discussion

### Input Text
```
The Ethics of Artificial General Intelligence

As AI systems approach human-level intelligence, we must grapple with
fundamental questions of consciousness, moral status, and rights. If an
AGI can suffer, does it deserve moral consideration? The answers require
deep engagement with epistemology and philosophy of mind.
```

### Classification Result

| Category | Top Matches | Score |
|----------|-------------|-------|
| **Subject** | philosophy | 0.94 |
| **Subject** | ai | 0.89 |
| **Topic** | security | 0.62 |
| **Difficulty** | advanced | 0.91 |

**Why it works:**
- "Ethics", "consciousness", "epistemology", "philosophy of mind" → philosophy
- "Artificial General Intelligence", "AI systems" → ai subject
- "fundamental questions", "deep engagement" → advanced difficulty
- WordNet hypernyms: "ethics" → "moral philosophy" → "philosophy"

---

## Example 5: Beginner Tutorial

### Input Text
```
Your First React Component

Let's build a simple counter! Create a new file called Counter.jsx:

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}

That's it! You've created your first React component.
```

### Classification Result

| Category | Top Matches | Score |
|----------|-------------|-------|
| **Subject** | technology | 0.88 |
| **Topic** | getting-started | 0.93 |
| **Skill** | react | 0.97 |
| **Skill** | javascript | 0.79 |
| **Difficulty** | beginner | 0.95 |

**Why it works:**
- "First", "simple", "Let's build" → getting-started + beginner
- "React", "useState", "component" → react skill
- JSX syntax recognized as JavaScript variant
- "That's it!" signals simplicity → beginner

---

## How Scoring Works

Classification scores combine multiple signals:

| Signal Type | Weight | Description |
|-------------|--------|-------------|
| **Direct match** | 1.0 | Exact vocabulary term found |
| **Embedding similarity** | 0.3-0.9 | Cosine similarity of vectors |
| **Synonym match** | 0.8 | WordNet synonym found |
| **Hypernym match** | 0.6 | WordNet hypernym chain |
| **Fuzzy match** | 0.5 | Soundex/Metaphone similarity |

Final scores are normalized to 0-1 range after combining weighted signals.

---

## Try It Yourself

Paste any text into a strand in Quarry and check the auto-generated taxonomy in the metadata panel. The vocabulary system runs automatically on save!

---

> The classification happens entirely offline. No text is sent to any server. All processing uses pre-computed embeddings and local WordNet data.
