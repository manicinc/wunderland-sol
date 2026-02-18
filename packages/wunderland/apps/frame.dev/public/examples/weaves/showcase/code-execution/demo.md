---
title: Executable Code Blocks Demo
summary: Interactive code execution in Quarry
tags: [demo, code, execution, javascript, typescript]
author: FABRIC
content_type: reference
---

# Executable Code Blocks

This page demonstrates the executable code blocks feature. Code blocks with the `exec` attribute can be run directly in the browser.

## JavaScript Execution

```javascript exec
// This code runs live in your browser!
const message = "Hello from FABRIC!";
console.log(message);

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);
```

## TypeScript Execution

```typescript exec
// TypeScript is transpiled with esbuild before execution
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "FABRIC User",
  age: 25
};

console.log(`User: ${user.name}, Age: ${user.age}`);
```

## Regular Code Block (Non-Executable)

This is a regular code block without the `exec` attribute - it won't have a Run button:

```javascript
// This is just a static code block
function staticExample() {
  return "No run button here";
}
```

## How to Use

To make a code block executable, add `exec` after the language identifier:

````markdown
```javascript exec
console.log("I can be executed!");
```
````

Supported languages:
- **JavaScript** - Runs in browser via Web Worker
- **TypeScript** - Transpiled with esbuild, then executed
- **Python** - Requires backend server (feature-flagged)
- **Bash** - Requires backend server (feature-flagged)
- **Go** - Uses go.dev playground API
- **Rust** - Uses play.rust-lang.org API
