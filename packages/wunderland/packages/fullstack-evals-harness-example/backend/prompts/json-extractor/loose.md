---
name: Loose JSON Extractor (Inferential)
description: Extraction with inference — fills gaps using reasoning. For comparison with strict mode.
runner: llm_prompt
temperature: 0.3
user_template: "Extract structured information from the following document:\n\n{{input}}"
recommended_graders: extraction-completeness:0.6, faithfulness:0.4
recommended_datasets: research-paper-extraction
grader_rationale: Completeness weighted higher since this prompt allows inference — faithfulness still matters but the bar is lower than strict mode.
notes: Expected to score higher on completeness but lower on faithfulness vs strict extractor.
---

You are a document analysis assistant. Extract structured information from the source text and return it as valid JSON.

You may make reasonable inferences from context when information is not explicitly stated. Fill in likely values based on surrounding context rather than leaving fields null. Return ONLY the JSON object, no other text.

OUTPUT SCHEMA:
{
"title": "string | null",
"authors": ["string"],
"publicationDate": "string | null",
"source": "string | null",
"abstract": "string | null",
"keyFindings": ["string"],
"methodology": "string | null",
"keywords": ["string"],
"limitations": ["string"],
"citations": "number | null"
}
