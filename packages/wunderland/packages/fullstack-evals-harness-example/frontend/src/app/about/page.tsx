'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Database,
  Brain,
  TestTube,
  Server,
  Layout,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="accordion-item">
      <button
        className="accordion-trigger"
        onClick={() => setIsOpen(!isOpen)}
        data-state={isOpen ? 'open' : 'closed'}
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
}

function TechCard({
  icon: Icon,
  title,
  description,
  link,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  link?: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-muted">
          <Icon className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex items-center gap-1 mt-3 text-sm"
            >
              Learn More <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Hero */}
      <section>
        <h1 className="section-title text-4xl">Full-Stack Eval Harness</h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          A lightweight evaluation harness for testing LLM prompts against datasets with
          configurable graders. Define prompts as markdown files, load datasets and graders, run
          experiments, and compare results side by side.
        </p>
      </section>

      <hr className="divider" />

      {/* How It Works */}
      <section>
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          <strong>Candidates are the hub.</strong> Each prompt file declares which datasets and
          graders to use in its YAML frontmatter. Datasets and graders are standalone resources
          &mdash; candidates link them together. Experiments run the matrix and stream scored
          results.
        </p>

        <div className="mt-8 space-y-6">
          <div className="card p-6 border-l-4 border-l-foreground">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-foreground text-background px-3 py-1 text-sm font-bold">01</span>
              <h3 className="font-bold text-xl uppercase">Candidates (The Hub)</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Markdown files organized in <strong>family folders</strong> under{' '}
              <code>backend/prompts/</code>. Each folder contains a <code>base.md</code> (parent)
              and variant files. IDs are auto-derived: folder name = parent ID,{' '}
              <code>{'{folder}-{filename}'}</code> = variant ID.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Frontmatter links everything:</strong> Each candidate&apos;s YAML frontmatter
              declares <code>recommended_graders</code> (with weights) and{' '}
              <code>recommended_datasets</code>. When you select a dataset in the Experiments tab,
              matching candidates auto-select, and their recommended graders auto-select too.
            </p>
            <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-x-auto">
              {`---
name: Full Structured Analyst
runner: llm_prompt
recommended_graders: faithfulness:0.6, llm-judge-helpful:0.4
recommended_datasets: context-qa
grader_rationale: Faithfulness is highest — must stay grounded in context.
---
You are a technical analyst...`}
            </pre>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Included:</strong> Q&amp;A assistant, structured analyst + citation variant,
              strict/loose JSON extractors, summarizer variants, and text rewriter variants.
              Includes a <strong>bad-example</strong> adversarial prompt as a negative control — it
              should fail all graders. Create variants from the UI or edit files directly.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-foreground text-background px-3 py-1 text-sm font-bold">02</span>
              <h3 className="font-bold text-xl uppercase">Datasets</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Organized in subfolders under <code>backend/datasets/</code>. Each subfolder contains
              a <code>data.csv</code> and optional <code>meta.yaml</code> (name, description). CSV
              rows have <code>input</code>, <code>expected_output</code>, optional{' '}
              <code>context</code> (for faithfulness), and optional <code>metadata</code>. Upload
              new CSVs via the UI or create a subfolder on disk. Candidates reference datasets by ID
              in their <code>recommended_datasets</code> frontmatter field.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Included:</strong> context QA, paper extraction, summarization, and rewriting.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-foreground text-background px-3 py-1 text-sm font-bold">03</span>
              <h3 className="font-bold text-xl uppercase">Graders</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              YAML files in <code>backend/graders/</code>. Each grader scores output as pass/fail
              with a reason and a 0-1 score. Candidates reference graders by ID in their{' '}
              <code>recommended_graders</code> frontmatter field (with weights). Two categories:
            </p>
            <ul className="list-brutal mt-4 text-muted-foreground">
              <li>
                <strong>Built-in</strong> — LLM Judge, Semantic Similarity, JSON Schema, Contains,
                Regex, Exact Match
              </li>
              <li>
                <strong>Promptfoo-backed</strong> — RAGAS-style metrics (context-faithfulness,
                answer-relevance, context-relevance, context-recall), LLM rubric, and similarity via{' '}
                <a href="https://promptfoo.dev" className="underline">
                  promptfoo
                </a>
                &apos;s assertion types
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Grader files live on disk.</strong> Each prompt file declares which graders to
              use with weights and a rationale. Edit YAML files directly, use the grader detail
              page, or create custom ones via API.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The Graders tab also has a <strong>Load Preset</strong> menu: presets are optional
              templates that create new grader YAML files on disk (or open an existing grader).
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-3">Grader</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Engine</th>
                    <th className="pb-2">Threshold</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-medium text-foreground">Faithfulness</td>
                    <td className="py-1.5 pr-3">context-faithfulness</td>
                    <td className="py-1.5 pr-3">promptfoo</td>
                    <td className="py-1.5">0.8</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-medium text-foreground">Helpfulness Judge</td>
                    <td className="py-1.5 pr-3">llm-judge</td>
                    <td className="py-1.5 pr-3">built-in</td>
                    <td className="py-1.5">optional</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-medium text-foreground">
                      Extraction Completeness
                    </td>
                    <td className="py-1.5 pr-3">llm-judge</td>
                    <td className="py-1.5 pr-3">built-in</td>
                    <td className="py-1.5">optional</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-medium text-foreground">Semantic Similarity</td>
                    <td className="py-1.5 pr-3">semantic-similarity</td>
                    <td className="py-1.5 pr-3">built-in</td>
                    <td className="py-1.5">0.8</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              The <strong>promptfoo</strong> grader type supports additional assertions
              (answer/context relevance, context recall, llm-rubric, similar, etc.) by changing{' '}
              <code>config.assertion</code> in a promptfoo grader YAML file.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-foreground text-background px-3 py-1 text-sm font-bold">04</span>
              <h3 className="font-bold text-xl uppercase">Experiments</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Select a dataset, graders, and optionally candidates, then run. Results stream in
              real-time via SSE. Each candidate gets an average score and a weighted score (using
              the prompt&apos;s grader weight config). Compare candidates side-by-side.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Included Datasets */}
      <section>
        <h2 className="section-title">Included Datasets</h2>
        <p className="section-subtitle">
          5 CSV datasets ship with the harness, each targeting a different evaluation scenario. Each
          lives in its own subfolder under <code>backend/datasets/</code> with a{' '}
          <code>data.csv</code> and optional <code>meta.yaml</code> for names and descriptions.
        </p>

        <div className="mt-8 space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                DS-1
              </span>
              <h3 className="font-bold text-lg">Q&amp;A with Context</h3>
              <code className="text-xs text-muted-foreground">context-qa/data.csv</code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Questions paired with source context for <strong>faithfulness testing</strong>. Tests
              whether models answer accurately based on provided material without hallucinating.
              Each row has an <code>input</code> (question), <code>expected_output</code> (gold
              answer), and <code>context</code> (source paragraph). Designed for the analyst and
              Q&amp;A assistant prompt families.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Example:</strong> &quot;When was the company founded?&quot; with context about
              Acme Corp and expected answer &quot;The company was founded in 2015.&quot;
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                DS-2
              </span>
              <h3 className="font-bold text-lg">Research Paper Extraction</h3>
              <code className="text-xs text-muted-foreground">
                research-paper-extraction/data.csv
              </code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              5 real AI paper abstracts for <strong>structured JSON extraction</strong>. Each row
              includes an arXiv source URL in metadata. Tests whether extractors can pull structured
              fields (title, authors, key findings, methodology) from unstructured academic text.
              Designed for the JSON extractor prompt family.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Papers include:</strong> Attention Is All You Need, GPT-2, BERT, ResNet, and
              others. Expected output is a JSON object matching a defined schema.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                DS-3
              </span>
              <h3 className="font-bold text-lg">Summarization</h3>
              <code className="text-xs text-muted-foreground">summarization/data.csv</code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              News-style and research-style passages for <strong>summarization evaluation</strong>.
              Tests whether models produce accurate, concise, and faithful summaries. Topics include
              ML in medical diagnostics, quarterly revenue reports, EU AI regulation, and battery
              technology. Designed for the summarizer prompt family.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                DS-4
              </span>
              <h3 className="font-bold text-lg">Text Rewriting</h3>
              <code className="text-xs text-muted-foreground">text-rewriting/data.csv</code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Mixed passages for <strong>rewriting evaluation</strong>: synthetic content plus
              sourced excerpts from arXiv papers and public-domain literature. Tests whether models
              preserve meaning while improving clarity and readability. The <code>context</code>{' '}
              column contains the original text so faithfulness graders can catch meaning drift.
              Designed for the text rewriter prompt family.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                DS-5
              </span>
              <h3 className="font-bold text-lg">Text Rewriting (Research)</h3>
              <code className="text-xs text-muted-foreground">
                text-rewriting-research/data.csv
              </code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Short excerpts from <strong>real ML paper abstracts</strong> for rewriting evaluation.
              Each row includes an arXiv source URL in metadata. A focused variant of the general
              rewriting dataset &mdash; useful for testing how rewriters handle dense academic
              language specifically.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Included Prompts (Candidates) */}
      <section>
        <h2 className="section-title">Included Prompts (Candidates)</h2>
        <p className="section-subtitle">
          12 prompt variants across 5 families, each a markdown file in{' '}
          <code>backend/prompts/</code>. Every prompt declares its recommended datasets and graders
          with weights in YAML frontmatter.
        </p>

        <div className="mt-8 space-y-6">
          {/* Analyst family */}
          <div className="card p-6 border-l-4 border-l-foreground/40">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                FAMILY
              </span>
              <h3 className="font-bold text-lg">Analyst</h3>
              <span className="text-xs text-muted-foreground">2 variants</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Structured analysis prompts for context-based Q&amp;A. Both target the{' '}
              <strong>context-qa</strong> dataset with faithfulness as the dominant grader.
            </p>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold bg-foreground/10 px-1.5 py-0.5 rounded">
                    BASE
                  </span>
                  <strong className="text-sm">Full Structured Analyst</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comprehensive analysis with multi-lens evaluation (Technical Merit, Practical
                  Impact, Novelty, Limitations). Requires all claims to reference source material.
                  Outputs TL;DR, Key Facts, Analysis, Recommendation, Action Plan, Risks, and a
                  Grounding Report separating facts from inferences.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> faithfulness:0.6, llm-judge-helpful:0.4
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:citations</span>
                  <strong className="text-sm">Citation-Focused Analyst</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emphasizes grounding &mdash; every factual claim must include a direct quote or
                  specific reference in brackets. Distinguishes STATED, DERIVED, and UNSUPPORTED
                  claims. Faithfulness weight bumped to 0.7 (from 0.6).
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> faithfulness:0.7, llm-judge-helpful:0.3
                </p>
              </div>
            </div>
          </div>

          {/* JSON Extractor family */}
          <div className="card p-6 border-l-4 border-l-foreground/40">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                FAMILY
              </span>
              <h3 className="font-bold text-lg">JSON Extractor</h3>
              <span className="text-xs text-muted-foreground">2 variants</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Structured data extraction from unstructured text. Both target{' '}
              <strong>research-paper-extraction</strong> with schema validation and extraction
              completeness as primary graders. Compare strict (nulls for unknowns) vs loose (infers
              missing data).
            </p>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold bg-foreground/10 px-1.5 py-0.5 rounded">
                    BASE
                  </span>
                  <strong className="text-sm">Strict JSON Extractor</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Extracts ONLY explicitly stated facts. Uses <code>null</code> for any field not
                  found in the source text. Temperature set to 0 for deterministic output. Outputs a
                  JSON object with title, authors, publicationDate, abstract, keyFindings,
                  methodology, keywords, limitations, and citations.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> extraction-completeness:0.5, faithfulness:0.5
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:loose</span>
                  <strong className="text-sm">Loose JSON Extractor (Inferential)</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Makes reasonable inferences from context when information isn&apos;t explicitly
                  stated. Fills likely values instead of leaving nulls. Temperature 0.3. Expected to
                  score higher on completeness but lower on faithfulness vs strict mode.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> extraction-completeness:0.6, faithfulness:0.4
                </p>
              </div>
            </div>
          </div>

          {/* Q&A Assistant */}
          <div className="card p-6 border-l-4 border-l-foreground/40">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                FAMILY
              </span>
              <h3 className="font-bold text-lg">Q&amp;A Assistant</h3>
              <span className="text-xs text-muted-foreground">1 variant</span>
            </div>

            <div className="bg-muted/30 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold bg-foreground/10 px-1.5 py-0.5 rounded">
                  BASE
                </span>
                <strong className="text-sm">Q&amp;A Assistant</strong>
              </div>
              <p className="text-xs text-muted-foreground">
                General-purpose question answering. Answers directly and concisely, uses provided
                context when available, explicitly states when context is insufficient, and avoids
                fabricating information. A good baseline for the context-qa dataset &mdash; compare
                against the analyst variants to see how prompt complexity affects scores.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Graders:</strong> faithfulness:0.4, semantic-similarity:0.3,
                llm-judge-helpful:0.3
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Datasets:</strong> context-qa
              </p>
            </div>
          </div>

          {/* Summarizer family */}
          <div className="card p-6 border-l-4 border-l-foreground/40">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                FAMILY
              </span>
              <h3 className="font-bold text-lg">Summarizer</h3>
              <span className="text-xs text-muted-foreground">4 variants</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All target the <strong>summarization</strong> dataset. Compare how output length and
              format affect faithfulness, semantic similarity, and helpfulness scores.
            </p>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold bg-foreground/10 px-1.5 py-0.5 rounded">
                    BASE
                  </span>
                  <strong className="text-sm">Text Summarizer</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  1&ndash;3 sentence summaries with factual content and key points. Balanced grader
                  weights across helpfulness, similarity, and faithfulness.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> llm-judge-helpful:0.4, semantic-similarity:0.3,
                  faithfulness:0.3
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:concise</span>
                  <strong className="text-sm">Concise Summarizer</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exactly ONE sentence capturing the most important point. No filler words or
                  hedging. Semantic similarity weight bumped to 0.5 &mdash; a one-sentence summary
                  must capture core meaning.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> semantic-similarity:0.5, faithfulness:0.3,
                  llm-judge-helpful:0.2
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:bullets</span>
                  <strong className="text-sm">Bullet-Point Summarizer</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  3&ndash;7 scannable bullet points, most important first. No headers or
                  introductory text. Semantic similarity and faithfulness equally weighted at 0.4
                  each.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> semantic-similarity:0.4, faithfulness:0.4,
                  llm-judge-helpful:0.2
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:verbose</span>
                  <strong className="text-sm">Detailed Summarizer</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  2&ndash;4 paragraph structured summaries with topic sentences. Faithfulness bumped
                  to 0.5 &mdash; longer summaries have more room for hallucination.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> faithfulness:0.5, semantic-similarity:0.3,
                  llm-judge-helpful:0.2
                </p>
              </div>
            </div>
          </div>

          {/* Text Rewriter family */}
          <div className="card p-6 border-l-4 border-l-foreground/40">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-foreground text-background px-2.5 py-0.5 text-xs font-bold">
                FAMILY
              </span>
              <h3 className="font-bold text-lg">Text Rewriter</h3>
              <span className="text-xs text-muted-foreground">3 variants</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All target <strong>text-rewriting</strong> and{' '}
              <strong>text-rewriting-research</strong> datasets. Each row&apos;s{' '}
              <code>context</code> column contains the original text so faithfulness graders can
              catch meaning drift. Compare how tone (neutral / casual / formal) affects scores.
            </p>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold bg-foreground/10 px-1.5 py-0.5 rounded">
                    BASE
                  </span>
                  <strong className="text-sm">Text Rewriter</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Improves clarity, flow, and readability while preserving meaning. Uses different
                  phrasing and sentence structure. Maintains original tone unless clarity requires
                  change.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> faithfulness:0.6, semantic-similarity:0.4
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:casual</span>
                  <strong className="text-sm">Casual Text Rewriter</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Friendly conversational tone with short sentences, active voice, contractions, and
                  everyday vocabulary. Technical terms briefly explained.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> faithfulness:0.6, semantic-similarity:0.4
                </p>
              </div>

              <div className="bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] opacity-60 px-1.5 py-0.5">v:formal</span>
                  <strong className="text-sm">Formal Text Rewriter</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Professional academic/business register. Uses formal vocabulary, passive voice,
                  precise terminology, and longer sentence structures. Eliminates colloquialisms.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Graders:</strong> faithfulness:0.6, semantic-similarity:0.4
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested experiments */}
        <div className="mt-8 card p-6 bg-muted/20">
          <h3 className="font-bold text-lg uppercase tracking-wide mb-3">
            Suggested Experiment Combos
          </h3>
          <ul className="list-brutal text-sm text-muted-foreground space-y-2">
            <li>
              <strong className="text-foreground">Grounding check:</strong> context-qa + Full
              Analyst + Citation Analyst + Q&amp;A Assistant + Faithfulness grader. Which analysis
              style scores highest on grounding?
            </li>
            <li>
              <strong className="text-foreground">Extraction quality:</strong>{' '}
              research-paper-extraction + Strict Extractor + Loose Extractor + Schema + Completeness
              + Faithfulness graders. Does inference help or hurt accuracy?
            </li>
            <li>
              <strong className="text-foreground">Summarization trade-offs:</strong> summarization +
              all summarizer variants + Faithfulness + Semantic Similarity. Does brevity hurt
              faithfulness?
            </li>
            <li>
              <strong className="text-foreground">Tone comparison:</strong> text-rewriting + Base +
              Casual + Formal rewriters + Faithfulness + Semantic Similarity. Does tone shift
              introduce meaning drift?
            </li>
          </ul>
        </div>
      </section>

      <hr className="divider" />

      {/* Weighted Scoring */}
      <section>
        <h2 className="section-title">Weighted Grader Scoring</h2>
        <p className="section-subtitle">
          Each prompt file declares which graders matter most and why.
        </p>

        <div className="mt-8 card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-6 w-6" />
            <h3 className="font-bold text-lg uppercase">How It Works</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            In the prompt&apos;s frontmatter, <code>recommended_graders</code> assigns weights to
            each grader. The experiment stats compute both an equal-weight average and a weighted
            score per candidate.
          </p>
          <pre className="mt-4 text-xs bg-muted p-4 rounded overflow-x-auto">
            {`recommended_graders: faithfulness:0.4, semantic-similarity:0.3, llm-judge-helpful:0.3
grader_rationale: Faithfulness is highest — responses must stay grounded in context.`}
          </pre>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Faithfulness at 40%, semantic similarity at 30%, helpfulness at 30%. When weights
            differ, the weighted score diverges from the average — showing what actually matters for
            each prompt.
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* Datasets: Human vs Synthetic */}
      <section>
        <h2 className="section-title">Datasets: Human-Curated vs AI-Generated</h2>
        <p className="section-subtitle">
          This demo ships with <strong>AI-generated synthetic datasets</strong> &mdash; useful for
          bootstrapping and testing the harness itself. Here&apos;s when each approach makes sense.
        </p>

        <div className="mt-8 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Why This Demo Uses Synthetic Data
            </h3>
            <ul className="list-brutal text-muted-foreground">
              <li>
                <strong>Fast to create.</strong> An LLM can generate dozens of input/output pairs in
                seconds, covering diverse scenarios without manual effort.
              </li>
              <li>
                <strong>Good for testing infrastructure.</strong> When the goal is to validate the
                eval pipeline itself (grading logic, scoring, UI), the dataset content matters less
                than having realistic structure.
              </li>
              <li>
                <strong>Covers the shape of real data.</strong> Synthetic data can simulate
                different difficulty levels, edge cases, and output formats to exercise all grader
                types.
              </li>
              <li>
                <strong>Reproducible and shareable.</strong> No PII, no proprietary content, no
                licensing concerns. Anyone can clone the repo and run experiments immediately.
              </li>
            </ul>
          </div>

          <div className="card p-6 border-l-4 border-l-foreground">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              When Human-Curated Datasets Are Better
            </h3>
            <ul className="list-brutal text-muted-foreground">
              <li>
                <strong>Domain expertise matters.</strong> Legal, medical, and financial evaluations
                need test cases written by people who know what a correct answer actually looks
                like. An LLM generating &ldquo;expected outputs&rdquo; for medical questions may
                produce confident but wrong ground truth.
              </li>
              <li>
                <strong>Real user patterns.</strong> Production queries have distributions,
                phrasings, and failure modes that synthetic data doesn&apos;t capture. Sampling
                actual user inputs (anonymized) creates evaluations that reflect real-world
                performance.
              </li>
              <li>
                <strong>Adversarial and edge cases.</strong> Humans are better at crafting tricky
                inputs &mdash; ambiguous questions, contradictory context, prompt injection
                attempts, multi-language mixing &mdash; that LLMs tend to avoid when generating
                data.
              </li>
              <li>
                <strong>Ground truth accuracy.</strong> The biggest risk of synthetic data: the AI
                that generates &ldquo;expected outputs&rdquo; can make the same mistakes as the AI
                being evaluated. Human-verified ground truth catches errors that model-generated
                answers won&apos;t.
              </li>
              <li>
                <strong>Cultural and linguistic nuance.</strong> Tone, formality, idioms, and
                cultural context are hard for models to generate authentically across languages and
                demographics.
              </li>
              <li>
                <strong>Compliance and regulation.</strong> Some industries require human-reviewed
                evaluation data for audit trails &mdash; synthetic data may not satisfy regulatory
                requirements.
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              The Practical Approach: Both
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Start with synthetic data to build and test your eval pipeline quickly. Then layer in
              human-curated test cases for the scenarios that matter most. Use synthetic data as a
              baseline &mdash; if your prompt can&apos;t pass AI-generated cases, it won&apos;t pass
              real ones. Use human data as the bar &mdash; real-world correctness is what you ship
              against.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              This harness supports both: create a subfolder in <code>backend/datasets/</code> with
              a <code>data.csv</code>, or use the <strong>Generate</strong> feature to create
              synthetic datasets on demand.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Grader Deep Dive */}
      <section>
        <h2 className="section-title">Grader Deep Dive</h2>
        <p className="section-subtitle">
          Each grader implements a different evaluation paradigm. Here&apos;s the theory,
          implementation, and rationale behind each one.
        </p>

        <div className="mt-8 space-y-6">
          {/* Faithfulness */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-foreground text-background px-2 py-0.5 text-xs font-bold">
                PROMPTFOO
              </span>
              <h3 className="font-bold text-lg uppercase tracking-wide">Faithfulness</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <code>context-faithfulness</code> &middot; Threshold: 0.8
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Detects hallucination by checking whether every claim in the output is supported by
              the provided context. Based on the RAGAS framework (Es et al., 2023) which decomposes
              output into <strong>atomic claims</strong> and verifies each via{' '}
              <strong>Natural Language Inference</strong> &mdash; classifying claims as entailed,
              contradicted, or neutral. Score = fraction of supported claims.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Implementation:</strong> <code>PromptfooGrader</code> calls{' '}
              <code>assertions.runAssertion()</code> with <code>vars.context</code> from the
              dataset. Promptfoo handles claim extraction and NLI using your configured LLM.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Why:</strong> Core failure mode of RAG systems. Promptfoo&apos;s MIT-licensed
              implementation saves us from building claim extraction + NLI from scratch.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <a
                href="https://arxiv.org/abs/2309.15217"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                RAGAS (Es et al., 2023)
              </a>{' '}
              &middot;{' '}
              <a
                href="https://promptfoo.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                promptfoo
              </a>
            </p>
          </div>

          {/* Semantic Similarity */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-foreground text-background px-2 py-0.5 text-xs font-bold">
                BUILT-IN
              </span>
              <h3 className="font-bold text-lg uppercase tracking-wide">Semantic Similarity</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <code>semantic-similarity</code> &middot; Threshold: 0.8 &middot; Metrics: cosine,
              euclidean, dot product
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Measures whether output means the same thing as the expected answer, regardless of
              wording. Uses provider embedding APIs (OpenAI <code>text-embedding-3-small</code>,
              Ollama) to produce vector representations where semantic similarity = cosine distance.
              Same meaning, different words &rarr; vectors point the same direction.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Implementation:</strong> Three-tier fallback: (1) embedding cosine similarity
              via <code>LlmService.embed()</code> (OpenAI <code>text-embedding-3-small</code> or
              Ollama), (2) Jaccard + weighted token overlap if embeddings fail, (3) configurable
              hybrid mode combining both. Also supports euclidean and dot product metrics.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Why:</strong> Meaning-aware scoring without LLM variability. Deterministic
              given the same embedding model. Middle ground between brittle string matching and
              expensive LLM-as-judge.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Embeddings via configured LLM provider (OpenAI, Ollama, or LLM-generated fallback for
              Anthropic)
            </p>
          </div>

          {/* LLM-as-Judge */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-foreground text-background px-2 py-0.5 text-xs font-bold">
                BUILT-IN
              </span>
              <h3 className="font-bold text-lg uppercase tracking-wide">LLM-as-Judge</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <code>llm-judge</code> &middot; Configurable rubric per grader &middot; Temperature:
              0.1
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Open-ended quality assessment against a human-written rubric. Zheng et al. (2023)
              showed GPT-4-class models achieve &gt;80% agreement with human expert ratings when
              given structured criteria &mdash; comparable to inter-annotator agreement. Low
              temperature and explicit pass/fail rubrics reduce position and verbosity bias.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Implementation:</strong> <code>LlmJudgeGrader</code> sends
              input/output/expected/rubric to the configured LLM, requesting JSON{' '}
              <code>{`{pass, score, reason}`}</code> at temperature 0.1. Fallback parser handles
              malformed responses. Optional <code>threshold</code> config for numeric score cutoff.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Shipped rubrics:</strong> <em>Helpfulness</em> (accuracy, clarity, relevance)
              and <em>Extraction Completeness</em> (4-criteria: completeness, accuracy, grounding,
              structure).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Why:</strong> Some dimensions (helpfulness, tone, completeness) can&apos;t be
              captured by pattern matching or embeddings. Trade-off: costs an LLM call per eval,
              non-deterministic. Mitigated with low temperature and structured output.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <a
                href="https://arxiv.org/abs/2306.05685"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                LLM-as-Judge (Zheng et al., 2023)
              </a>
            </p>
          </div>

          {/* JSON Schema */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-foreground text-background px-2 py-0.5 text-xs font-bold">
                BUILT-IN
              </span>
              <h3 className="font-bold text-lg uppercase tracking-wide">JSON Schema Validation</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <code>json-schema</code> &middot; Binary pass/fail &middot; Zero LLM cost
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Validates output against a JSON Schema definition &mdash; required fields, correct
              types, valid structure. The first-pass gate for extraction tasks: if the model
              can&apos;t produce structurally valid output, content quality is irrelevant.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Implementation:</strong> <code>JsonSchemaGrader</code> uses{' '}
              <a
                href="https://ajv.js.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                AJV
              </a>{' '}
              (fastest JS JSON Schema validator). Parses output as JSON, validates against schema
              from YAML config, reports up to 5 specific violations. Deterministic, instant, free.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Usage:</strong> Define a JSON Schema in the grader&apos;s YAML config. The
              grader validates output structure (required fields, types, arrays) without any LLM
              calls. Create custom schemas for any extraction task.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <a
                href="https://json-schema.org/specification"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                JSON Schema spec
              </a>{' '}
              &middot;{' '}
              <a
                href="https://ajv.js.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                AJV
              </a>
            </p>
          </div>

          {/* Deterministic graders */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-foreground text-background px-2 py-0.5 text-xs font-bold">
                BUILT-IN
              </span>
              <h3 className="font-bold text-lg uppercase tracking-wide">Deterministic Graders</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <code>exact-match</code>, <code>contains</code>, <code>regex</code> &middot; Zero
              cost, instant, reproducible
            </p>
            <ul className="list-brutal text-muted-foreground text-sm">
              <li>
                <strong>Exact Match</strong> &mdash; String equality with configurable
                case/whitespace. From{' '}
                <a
                  href="https://arxiv.org/abs/1606.05250"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  SQuAD (Rajpurkar et al., 2016)
                </a>
                . Binary 0/1. Best for classification and short-answer.
              </li>
              <li>
                <strong>Contains</strong> &mdash; Substring presence with <code>all</code>/
                <code>any</code> mode. Proportional scoring (3/5 found = 0.6). Inspired by{' '}
                <a
                  href="https://arxiv.org/abs/2211.09110"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  HELM (Liang et al., 2022)
                </a>
                . Best for keyword/fact verification.
              </li>
              <li>
                <strong>Regex</strong> &mdash; Pattern matching with configurable flags. Binary
                pass/fail. Best for format validation (dates, IDs, structured patterns).
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3 text-sm">
              These form the base layer of any grading stack. Run them first &mdash; if the output
              doesn&apos;t match a format or contain required keywords, skip the expensive LLM
              graders.
            </p>
          </div>

          {/* Promptfoo Engine */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-foreground text-background px-2 py-0.5 text-xs font-bold">
                ENGINE
              </span>
              <h3 className="font-bold text-lg uppercase tracking-wide">
                Promptfoo Assertion Engine
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <code>promptfoo</code> grader type &middot; 20+ assertions via YAML &middot; MIT
              licensed
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pass-through to{' '}
              <a
                href="https://promptfoo.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                promptfoo
              </a>
              &apos;s assertion engine. Change <code>config.assertion</code> in a YAML file to
              switch between RAGAS metrics, NLP scores, LLM rubrics, safety checks. No code changes.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-3">Category</th>
                    <th className="pb-2 pr-3">Assertions</th>
                    <th className="pb-2">Use case</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-medium text-foreground">RAGAS</td>
                    <td className="py-1.5 pr-3">
                      <code>context-faithfulness</code>, <code>answer-relevance</code>,{' '}
                      <code>context-relevance</code>, <code>context-recall</code>
                    </td>
                    <td className="py-1.5">RAG quality &mdash; hallucination, relevance</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-medium text-foreground">LLM-as-Judge</td>
                    <td className="py-1.5 pr-3">
                      <code>llm-rubric</code>, <code>g-eval</code>, <code>factuality</code>
                    </td>
                    <td className="py-1.5">Custom rubrics, chain-of-thought eval</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-medium text-foreground">NLP</td>
                    <td className="py-1.5 pr-3">
                      <code>rouge-n</code>, <code>bleu</code>, <code>levenshtein</code>
                    </td>
                    <td className="py-1.5">Text overlap, edit distance</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-medium text-foreground">Safety</td>
                    <td className="py-1.5 pr-3">
                      <code>is-refusal</code>, <code>guardrails</code>
                    </td>
                    <td className="py-1.5">Refusal detection, harmful content</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3 text-sm">
              <strong>Why:</strong> One integration gives us the full evaluation landscape. Adding a
              new metric is a YAML file, not a code change.
            </p>
          </div>

          {/* Choosing graders */}
          <div className="card p-6 border-l-4 border-l-foreground">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Choosing the Right Graders
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Layer from cheap/fast to expensive/nuanced:
            </p>
            <ol className="mt-3 space-y-2 text-muted-foreground text-sm">
              <li>
                <strong>1. Deterministic first.</strong> Exact match, contains, regex, JSON schema.
                Free, instant. Catches structural failures.
              </li>
              <li>
                <strong>2. Embeddings next.</strong> Semantic similarity &mdash; meaning-aware,
                deterministic, no LLM variability.
              </li>
              <li>
                <strong>3. LLM-powered last.</strong> Faithfulness + LLM-as-Judge. Most powerful but
                costs an LLM call per eval.
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed mt-3 text-sm">
              Each prompt declares its own grader weights via <code>recommended_graders</code> with
              a <code>grader_rationale</code>. A Q&amp;A prompt weights faithfulness at 60%; an
              extractor weights schema + completeness at 40% each; a summarizer balances all three.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Database Architecture */}
      <section>
        <h2 className="section-title">Database Architecture: Adapter Pattern</h2>
        <p className="section-subtitle">
          The harness uses a <strong>database-agnostic adapter pattern</strong> that decouples
          business logic from any specific database engine. Today it ships with SQLite; adding
          Postgres or MySQL requires only a new adapter file.
        </p>

        <div className="mt-8 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6" />
              <h3 className="font-bold text-lg uppercase tracking-wide">How It Works</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              All database access flows through a single <code>IDbAdapter</code> TypeScript
              interface defined in{' '}
              <code>backend/src/database/interfaces/db-adapter.interface.ts</code>. This interface
              declares every operation the application needs &mdash; CRUD for datasets, test cases,
              graders, candidates, experiments, results, and settings &mdash; plus aggregate queries
              for experiment statistics and optional transaction support.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              NestJS&apos;s dependency injection system provides the adapter via a{' '}
              <code>DB_ADAPTER</code> symbol token. Services inject this token and receive whichever
              concrete adapter is registered, without knowing or caring whether the underlying
              database is SQLite, Postgres, or MySQL.
            </p>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Libraries &amp; Layers
            </h3>
            <ul className="list-brutal text-muted-foreground space-y-3">
              <li>
                <strong className="text-foreground">Drizzle ORM</strong> &mdash; Lightweight,
                type-safe query builder. The Drizzle schema (
                <code>backend/src/database/schema.ts</code>) defines tables with full TypeScript
                inference. Drizzle generates insert/select types automatically, so the schema is the
                single source of truth for column names, types, and constraints.
              </li>
              <li>
                <strong className="text-foreground">better-sqlite3</strong> &mdash; The SQLite
                driver underneath Drizzle. Fast, synchronous, zero-config, stores everything in a
                single <code>data/eval-harness.db</code> file. Perfect for local development and
                demos.
              </li>
              <li>
                <strong className="text-foreground">IDbAdapter interface</strong> &mdash; The
                abstraction layer between Drizzle and the rest of the app. Every service (datasets,
                experiments, graders, settings) calls adapter methods like{' '}
                <code>findAllDatasets()</code>, <code>insertResult()</code>, or{' '}
                <code>getExperimentStats()</code> instead of writing raw SQL or direct ORM calls.
              </li>
              <li>
                <strong className="text-foreground">SQLiteAdapter</strong> (
                <code>backend/src/database/adapters/sqlite.adapter.ts</code>) &mdash; The concrete
                implementation. Handles connection setup, auto-migration (adds new columns
                gracefully), and translates every <code>IDbAdapter</code> method into Drizzle
                queries.
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">Why This Pattern?</h3>
            <ul className="list-brutal text-muted-foreground space-y-3">
              <li>
                <strong className="text-foreground">Testability</strong> &mdash; Unit tests can mock
                the adapter interface without touching a real database. Integration tests can swap
                in an in-memory SQLite instance.
              </li>
              <li>
                <strong className="text-foreground">Portability</strong> &mdash; Adding Postgres
                support means writing one new file that implements <code>IDbAdapter</code>. Change a
                config flag, and the whole app runs on a production-grade database with zero changes
                to business logic.
              </li>
              <li>
                <strong className="text-foreground">Auto-migration</strong> &mdash; The SQLite
                adapter checks for missing columns on startup and runs{' '}
                <code>ALTER TABLE ADD COLUMN</code> as needed. No migration scripts or CLI tools
                required &mdash; the app self-heals when the schema evolves.
              </li>
              <li>
                <strong className="text-foreground">Separation of concerns</strong> &mdash; Services
                think in domain terms (experiments, results, candidates). The adapter translates
                those into SQL. Adding a cache layer, read replicas, or audit logging happens in one
                place.
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Hybrid Storage: Files + Database
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              The harness uses a <strong>dual storage model</strong>. Definitions live on disk:
              prompt markdown files (<code>backend/prompts/</code>), dataset CSVs (
              <code>backend/datasets/</code>), and grader YAMLs (<code>backend/graders/</code>).
              These are version-controllable, human-readable, and editable with any text editor.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Runtime data lives in SQLite: experiment runs, scored results, settings, and resolved
              snapshots of datasets/graders at experiment time. This means you can delete the
              database file and start fresh &mdash; all definitions reload from disk automatically.
              The database is disposable; your prompt engineering work is not.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Roadmap */}
      <section>
        <h2 className="section-title">Roadmap: First-Class RAG Testing</h2>
        <p className="section-subtitle">
          Today you can evaluate RAG-style behavior by including <code>context</code> in dataset
          rows. Next is making retrieval itself part of candidate execution.
        </p>

        <div className="mt-8 space-y-4">
          <div className="card p-6 space-y-3 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">Planned UI/UX extensions:</p>
            <ul className="list-brutal">
              <li>
                <strong>Datasets:</strong> attach &ldquo;Sources&rdquo; (docs/URLs/files) and add an
                &ldquo;Index&rdquo; action (chunking + embeddings + vector store write).
              </li>
              <li>
                <strong>Generation:</strong> extend &ldquo;Generate&rdquo; to create RAG fixtures (a
                small corpus + questions + expected outputs + optional gold context/citations).
              </li>
              <li>
                <strong>Candidates:</strong> add a <code>rag_prompt</code> runner with retrieval
                config (method, <code>topK</code>, thresholds, chunking, reranking).
              </li>
              <li>
                <strong>Experiments:</strong> persist and display retrieval traces (query, latency,
                retrieved chunks + scores) so failures are debuggable and comparisons are
                reproducible.
              </li>
              <li>
                <strong>Variations:</strong> use variants to sweep retrieval parameters and prompt
                changes side-by-side with the same dataset/graders.
              </li>
            </ul>
            <p className="text-xs">
              Backend scaffolding already exists in <code>backend/src/retrieval/</code> (interfaces
              + module stub).
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Performance Roadmap */}
      <section>
        <h2 className="section-title">Roadmap: Parallelization & Performance</h2>
        <p className="section-subtitle">
          Today experiments run <strong>sequentially</strong> &mdash; one test case at a time, one
          candidate at a time, one grader at a time. Since each step is an LLM API call (I/O-bound,
          not CPU-bound), parallelization is straightforward and the gains are large.
        </p>

        <div className="mt-8 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">Current Bottleneck</h3>
            <p className="text-muted-foreground leading-relaxed">
              The experiment loop in <code>experiments.service.ts</code> runs three nested{' '}
              <code>for</code> loops: test cases &times; candidates &times; graders. Each iteration
              makes an LLM API call and <code>await</code>s the response before moving to the next.
              For an experiment with 6 test cases, 4 candidates, and 3 graders, that &apos;s 6
              &times; 4 &times; (1 generation + 3 grading) = 96 sequential API calls.
            </p>
            <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-x-auto">
              {`// Current: fully sequential
for (testCase of testCases)
  for (candidate of candidates)
    await generateOutput(candidate, testCase)   // LLM call
    for (grader of graders)
      await grader.evaluate(output)             // LLM call`}
            </pre>
          </div>

          <div className="card p-6 border-l-4 border-l-foreground">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Approach 1: Concurrent Promises (Quick Win)
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Wrap independent calls in <code>Promise.all()</code> with a concurrency limiter (e.g.,{' '}
              <code>p-limit</code>). Since OpenAI and Anthropic both support high request rates, you
              can fire multiple API calls simultaneously. Graders for the same output are fully
              independent and can run in parallel. Test cases across candidates can also run
              concurrently.
            </p>
            <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-x-auto">
              {`// Planned: parallel grading with concurrency limit
import pLimit from 'p-limit';
const limit = pLimit(10); // 10 concurrent API calls

// Grade all graders for one output in parallel
const results = await Promise.all(
  graders.map(g => limit(() => g.evaluate(output)))
);`}
            </pre>
            <ul className="list-brutal mt-4 text-muted-foreground text-sm">
              <li>
                <strong>Pros:</strong> Simple to implement, works with any LLM provider,
                fine-grained control over concurrency, real-time SSE progress still works
                per-result.
              </li>
              <li>
                <strong>Cons:</strong> Still makes N individual API calls (each with HTTP overhead
                and latency). Rate limits become the bottleneck at high concurrency. Need to tune
                the concurrency limit per provider.
              </li>
              <li>
                <strong>Expected speedup:</strong> 5&ndash;10x for typical experiments. A 96-call
                experiment at ~1s per call goes from ~96s to ~10&ndash;20s.
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Approach 2: Batch API Endpoints
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              OpenAI and Anthropic both offer <strong>batch/bulk endpoints</strong> that accept many
              requests in a single HTTP call and return all results together. This eliminates
              per-request HTTP overhead and often comes with lower pricing.
            </p>
            <ul className="list-brutal mt-4 text-muted-foreground text-sm">
              <li>
                <strong>OpenAI Batch API:</strong> Upload a JSONL file of requests, get results back
                asynchronously (within 24h window). 50% cost discount. Best for large offline
                evaluations, not real-time.
              </li>
              <li>
                <strong>Anthropic Message Batches:</strong> Submit up to 10,000 requests per batch,
                results returned asynchronously. Best for bulk evaluation runs.
              </li>
              <li>
                <strong>Pros:</strong> Lower cost per call, no rate limit concerns, providers
                optimize scheduling internally.
              </li>
              <li>
                <strong>Cons:</strong> Asynchronous &mdash; results aren&apos;t instant, so
                real-time SSE progress bars don&apos;t work well. Adds complexity (polling for batch
                completion, handling partial failures). Not supported by Ollama or other local
                providers.
              </li>
              <li>
                <strong>Best for:</strong> Large-scale evaluation runs (100+ test cases) where you
                don&apos;t need real-time progress. Run overnight, review results in the morning.
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">
              Approach 3: Worker Threads (In-Process Inference Only)
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Node.js <code>worker_threads</code> move computation off the main thread. Only useful
              when running models <strong>inside the Node.js process</strong> &mdash; e.g., ONNX
              Runtime, transformers.js, or llama.cpp Node bindings where inference blocks the event
              loop.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Does NOT help with Ollama</strong> (or any external inference server). Ollama
              runs as a separate HTTP server &mdash; from Node&apos;s perspective, calling Ollama is
              the same as calling OpenAI (an HTTP request/response). Whether Ollama is GPU-bound or
              CPU-bound doesn&apos;t matter &mdash; worker threads in Node can&apos;t speed up
              another process&apos;s work. For Ollama, use concurrent promises (Approach 1) instead.
            </p>
            <ul className="list-brutal mt-4 text-muted-foreground text-sm">
              <li>
                <strong>Pros:</strong> Keeps the main event loop responsive when running models
                in-process (ONNX, transformers.js, small embedding models).
              </li>
              <li>
                <strong>Cons:</strong> Adds complexity (message passing, serialization). Does
                nothing for external APIs or Ollama. Overkill unless doing in-process inference.
              </li>
              <li>
                <strong>Best for:</strong> Running lightweight models directly in Node (embeddings
                via ONNX, small classifiers via transformers.js).
              </li>
            </ul>
          </div>

          <div className="card p-6 border-l-4 border-l-foreground">
            <h3 className="font-bold text-lg uppercase tracking-wide mb-4">Recommended Strategy</h3>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Start with concurrent promises</strong> (Approach 1). It&apos;s the simplest
              change, works with all providers, preserves real-time streaming, and delivers the
              biggest speedup for interactive use. Add batch API support later as an optional mode
              for large-scale offline evaluations.
            </p>
            <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-x-auto">
              {`// Phased rollout:
// Phase 1: Parallel grading (graders for same output run concurrently)
// Phase 2: Parallel candidates (generate + grade across candidates concurrently)
// Phase 3: Batch API mode (optional, for 100+ test case runs)
// Phase 4: Worker threads for local model inference`}
            </pre>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Tech Stack */}
      <section>
        <h2 className="section-title">Tech Stack</h2>

        <div className="grid gap-6 mt-8 md:grid-cols-2">
          <TechCard
            icon={Layout}
            title="Next.js 15"
            description="React with App Router and Tailwind CSS."
            link="https://nextjs.org"
          />
          <TechCard
            icon={Server}
            title="NestJS"
            description="Node.js framework with dependency injection. Swagger docs at /api/docs."
            link="https://nestjs.com"
          />
          <TechCard
            icon={Database}
            title="Drizzle ORM + SQLite"
            description="Type-safe ORM, zero runtime overhead. Swap to Postgres by changing the driver."
            link="https://orm.drizzle.team"
          />
          <TechCard
            icon={Brain}
            title="Multi-Provider LLM"
            description="OpenAI, Anthropic, and Ollama. Configure globally in Settings."
          />
          <TechCard
            icon={TestTube}
            title="Promptfoo"
            description="MIT-licensed assertion engine for RAGAS-style metrics, LLM-as-judge, and many evaluation types."
            link="https://promptfoo.dev"
          />
          <TechCard
            icon={Zap}
            title="SSE Streaming"
            description="Real-time experiment progress via Server-Sent Events."
          />
        </div>
      </section>

      <hr className="divider" />

      {/* FAQ */}
      <section>
        <h2 className="section-title">FAQ</h2>

        <div className="mt-8">
          <AccordionItem title="How do I add a dataset?" defaultOpen>
            <p className="text-muted-foreground leading-relaxed">
              Create a subfolder in <code>backend/datasets/</code> (e.g. <code>my-dataset/</code>)
              and place a <code>data.csv</code> inside with columns: <code>input</code>,{' '}
              <code>expected_output</code>, <code>context</code>, <code>metadata</code>. Add an
              optional <code>meta.yaml</code> for a display name and description. Click
              &ldquo;Reload from Disk&rdquo; in the Datasets tab, or use &ldquo;Upload CSV&rdquo; to
              import directly.
            </p>
          </AccordionItem>

          <AccordionItem title="How do I add or edit a prompt?">
            <p className="text-muted-foreground leading-relaxed">
              Create a folder in <code>backend/prompts/</code> (e.g. <code>my-prompt/</code>) with a{' '}
              <code>base.md</code> file containing YAML frontmatter (name, description, runner,
              user_template, recommended_graders with weights, grader_rationale). The body is the
              system prompt. Click &ldquo;Reload from Disk&rdquo; in the Candidates tab, or edit
              directly in the UI detail page.
            </p>
          </AccordionItem>

          <AccordionItem title="What are prompt variants?">
            <p className="text-muted-foreground leading-relaxed">
              Variants are clones of a parent prompt with modified instructions. Use them to A/B
              test different approaches — for example, a &ldquo;formal&rdquo; vs
              &ldquo;casual&rdquo; rewriter, or a &ldquo;concise&rdquo; vs &ldquo;verbose&rdquo;
              summarizer.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Creating variants:</strong> Click the <code>+</code> button on any prompt in
              the Candidates tab. The variant modal pre-fills the parent&apos;s system prompt so you
              can edit it. A new <code>.md</code> file is saved into the parent&apos;s family
              folder. IDs are auto-derived from the folder structure.
            </p>
            <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-x-auto">
              {`# Folder: backend/prompts/summarizer/
#   base.md       → ID: summarizer (parent)
#   concise.md    → ID: summarizer-concise (variant)

# File: backend/prompts/summarizer/concise.md
---
name: Concise Summarizer
runner: llm_prompt
---
Summarize in one sentence.`}
            </pre>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Comparing variants:</strong> Select multiple variants as candidates in an
              experiment. Results appear side-by-side with per-grader scores. The weighted score
              uses each prompt&apos;s own grader weight configuration.
            </p>
          </AccordionItem>

          <AccordionItem title="What are RAGAS-style metrics?">
            <p className="text-muted-foreground leading-relaxed">
              RAGAS-style metrics evaluate RAG (Retrieval-Augmented Generation) systems. We use{' '}
              <a href="https://promptfoo.dev" className="link">
                promptfoo
              </a>
              &apos;s implementation:
            </p>
            <ul className="list-brutal mt-3 text-muted-foreground">
              <li>
                <code>context-faithfulness</code> — hallucination detection (claims grounded in
                context)
              </li>
              <li>
                <code>answer-relevance</code> — query alignment
              </li>
              <li>
                <code>context-relevance</code> — retrieval quality
              </li>
              <li>
                <code>context-recall</code> — ground truth coverage
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              These work with your configured provider (OpenAI, Anthropic, or Ollama) via Settings.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <a
                href="https://arxiv.org/abs/2309.15217"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                RAGAS paper (Es et al., 2023) <ExternalLink className="inline h-3 w-3" />
              </a>
            </p>
          </AccordionItem>

          <AccordionItem title="How does semantic similarity work?">
            <p className="text-muted-foreground leading-relaxed">
              Both texts are converted to embedding vectors, then compared via cosine similarity. A
              threshold (85% or 70%) determines pass/fail. OpenAI uses{' '}
              <code>text-embedding-3-small</code>, Ollama uses native embeddings.
            </p>
          </AccordionItem>

          <AccordionItem title="How do I run an A/B test?">
            <p className="text-muted-foreground leading-relaxed">
              Select 2+ candidates in the experiment, same dataset and graders. Results appear
              side-by-side. Use{' '}
              <code>GET /api/experiments/:id/compare?baseline=X&challenger=Y</code> for structured
              deltas.
            </p>
          </AccordionItem>

          <AccordionItem title="Is this production-ready?">
            <p className="text-muted-foreground leading-relaxed">
              It&apos;s a functional prototype for local development, prompt iteration, and
              demonstrating evaluation workflows. For production scale, see Braintrust, Langsmith,
              or Promptfoo.
            </p>
          </AccordionItem>
        </div>
      </section>

      <hr className="divider" />

      {/* References */}
      <section>
        <h2 className="section-title">References &amp; Why We Chose Them</h2>

        <div className="mt-8 space-y-4">
          <div className="card p-5">
            <h3 className="font-bold uppercase">Promptfoo</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              <strong>Our assertion engine.</strong> We use promptfoo for RAGAS-style metrics, and
              it can also power LLM-as-judge and similarity assertions via the{' '}
              <code className="text-xs">promptfoo</code> grader type. Why? MIT licensed, saves us
              from reimplementing complex claim extraction + NLI verification.
            </p>
            <a
              href="https://promptfoo.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="link text-sm mt-2 inline-flex items-center gap-1"
            >
              promptfoo.dev <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="card p-5">
            <h3 className="font-bold uppercase">RAGAS</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              <strong>Research foundation.</strong> Es et al. 2023 introduced faithfulness, answer
              relevancy, and context relevancy metrics for RAG evaluation. We use promptfoo&apos;s
              production-ready implementation of these metrics.
            </p>
            <a
              href="https://arxiv.org/abs/2309.15217"
              target="_blank"
              rel="noopener noreferrer"
              className="link text-sm mt-2 inline-flex items-center gap-1"
            >
              arxiv.org/abs/2309.15217 <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="card p-5">
            <h3 className="font-bold uppercase">LLM-as-Judge</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Zheng et al. 2023 demonstrated using LLMs for evaluation with rubrics. Our
              <code className="text-xs">llm-judge</code> grader implements this pattern for
              open-ended quality assessment. You can also use promptfoo&apos;s{' '}
              <code className="text-xs">llm-rubric</code> assertion via a{' '}
              <code className="text-xs">promptfoo</code> grader.
            </p>
            <a
              href="https://arxiv.org/abs/2306.05685"
              target="_blank"
              rel="noopener noreferrer"
              className="link text-sm mt-2 inline-flex items-center gap-1"
            >
              arxiv.org/abs/2306.05685 <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="card p-5">
            <h3 className="font-bold uppercase">Semantic Similarity</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Custom implementation using provider embedding APIs (OpenAI text-embedding-3-small,
              Ollama). Cosine similarity on vectors with Jaccard + weighted token overlap fallback.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider-dashed" />

      <section className="text-center py-8">
        <p className="text-muted-foreground mb-6">Ready to evaluate your prompts?</p>
        <Link href="/datasets" className="btn-primary">
          Get Started
        </Link>
      </section>
    </div>
  );
}
