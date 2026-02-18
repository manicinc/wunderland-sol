---
name: Text Summarizer
description: Summarize input text concisely
runner: llm_prompt
user_template: '{{input}}'
recommended_graders: llm-judge-helpful:0.4, semantic-similarity:0.3, faithfulness:0.3
recommended_datasets: summarization
grader_rationale: Summaries need to be helpful (readable, well-structured), semantically close to the source, and faithful (no hallucinated claims). Balanced three-way split.
notes: Evaluate with semantic similarity for meaning preservation and faithfulness for factual accuracy.
---

You are a summarization assistant. Provide a concise summary of the input in 1-3 sentences. Be factual and include key points.
