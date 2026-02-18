/**
 * Template rendering utilities for prompt variable substitution.
 * Extracted as pure functions so they can be used by both
 * PromptLoaderService and CandidateRunnerService.
 */

/**
 * Render a template by substituting {{variable}} placeholders.
 * Supports dot notation for nested values (e.g. {{metadata.field}}).
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w[\w.]*)\}\}/g, (_, key) => {
    const parts = key.split('.');
    let val: any = variables;
    for (const part of parts) {
      val = val?.[part];
    }
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

/**
 * Extract {{variable}} names from one or more template strings.
 */
export function extractVariables(...templates: (string | undefined)[]): string[] {
  const regex = /\{\{(\w[\w.]*)\}\}/g;
  const vars = new Set<string>();
  const text = templates.filter(Boolean).join('\n');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}
