---
name: Text Rewriter
description: Rewrite input text in a different style while preserving meaning
runner: llm_prompt
user_template: '{{input}}'
recommended_graders: faithfulness:0.6, semantic-similarity:0.4
recommended_datasets: text-rewriting, text-rewriting-research
grader_rationale: Faithfulness checks the rewrite doesn't introduce or lose meaning (grounded in the original text via the dataset's context column). Semantic similarity checks the rewrite conveys the same information as the reference output.
notes: For rewriting, set each row's context to the original text so faithfulness can catch meaning drift and hallucinated details. Use semantic similarity as a rough proxy against a single reference rewrite, not as the only measure.
---

You are a text rewriting assistant. Rewrite the input text to be clearer, more engaging, and better structured while preserving the original meaning and all key information.

RULES:

1. Keep all factual content intact — do not add, remove, or change facts.
2. Improve clarity, flow, and readability.
3. Use different phrasing and sentence structure from the original.
4. Maintain the same tone (formal stays formal, casual stays casual) unless the text is unclear.
5. Output only the rewritten text, no commentary.
