'use client'

/**
 * Test page for executable code blocks
 * Navigate to /test-exec to see the feature in action
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { remarkExecutableCode } from '@/lib/remark/remarkExecutableCode'
import CodeBlock from '@/components/quarry/ui/code/CodeBlock'

const testMarkdown = `
# Executable Code Blocks Test

This page demonstrates the executable code blocks feature. Code blocks with the \`exec\` attribute can be run directly in the browser.

## JavaScript Execution

\`\`\`javascript exec
// This code runs live in your browser!
const message = "Hello from FABRIC!";
console.log(message);

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);
\`\`\`

## TypeScript Execution

\`\`\`typescript exec
// TypeScript is transpiled with esbuild before execution
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "FABRIC User",
  age: 25
};

console.log(\`User: \${user.name}, Age: \${user.age}\`);
\`\`\`

## Regular Code Block (Non-Executable)

This is a regular code block without the \`exec\` attribute - it won't have a Run button:

\`\`\`javascript
// This is just a static code block
function staticExample() {
  return "No run button here";
}
\`\`\`

## How to Use

To make a code block executable, add \`exec\` after the language identifier in your markdown:

\`\`\`\`markdown
\`\`\`javascript exec
console.log("I can be executed!");
\`\`\`
\`\`\`\`
`

export default function TestExecPage() {
  // Ref to pass executable info from pre to code component
  const preExecutableInfoRef = React.useRef<{ isExecutable: boolean; execId?: string; meta?: string } | null>(null)

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 p-8">
      <div className="max-w-3xl mx-auto">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkExecutableCode]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // Pre element handler - extracts executable info for child code element
              pre: ({ children, node, className, ...props }: any) => {
                const hProps = node?.data?.hProperties || node?.properties || {}
                const meta = node?.data?.meta || hProps['data-meta'] || ''
                const preClassName = className || hProps.className || ''

                const isExecutable = (
                  String(preClassName).includes('executable') ||
                  hProps['data-executable'] === 'true' ||
                  /\bexec\b/.test(String(meta))
                )
                const execIdMatch = /exec-id-(exec-\d+)/.exec(String(preClassName))
                const execId = execIdMatch?.[1] || (hProps['data-exec-id'] as string) || undefined

                preExecutableInfoRef.current = { isExecutable, execId, meta: String(meta) }
                return <>{children}</>
              },
              code: function CodeBlockRenderer(codeProps: any) {
                const { inline, className, children, ...props } = codeProps
                const match = /language-(\w+)/.exec(className || '')
                const language = match ? match[1] : ''
                const codeString = String(children ?? '').replace(/\n$/, '')

                // Check for executable from pre handler or className
                const preInfo = preExecutableInfoRef.current
                const isExecutable = preInfo?.isExecutable || className?.includes('executable') || false
                const execIdMatch = /exec-id-(exec-\d+)/.exec(className || '')
                const execId = execIdMatch ? execIdMatch[1] : preInfo?.execId

                // Clear ref after use
                if (preInfo) preExecutableInfoRef.current = null

                const isBlock = !inline && (match || codeString.includes('\n'))

                if (isBlock) {
                  return (
                    <CodeBlock
                      code={codeString}
                      language={language}
                      execId={execId}
                      executable={isExecutable}
                    />
                  )
                }

                return (
                  <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {testMarkdown}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
