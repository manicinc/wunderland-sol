# Message normalizer for git filter-repo --message-callback
#
# - Lowercase type
# - No scope parentheses
# - 1-line subject, 2nd line blank, body wrapped <= 72 (left as-is if present)
import re

TYPES = {
    'feature': 'feat', 'feat': 'feat', 'fix': 'fix', 'bugfix': 'fix',
    'chore': 'chore', 'docs': 'docs', 'documentation': 'docs',
    'refactor': 'refactor', 'test': 'test', 'tests': 'test',
    'perf': 'perf', 'performance': 'perf', 'build': 'build', 'ci': 'ci',
    'revert': 'revert', 'wip': 'chore', 'cleanup': 'chore'
}

def classify(s: str) -> str:
    s0 = s.strip()
    m = re.match(r"^([A-Za-z]+)(\([^)]*\))?:\s*(.*)$", s0)
    if m:
        t, _scope, rest = m.groups()
        t = TYPES.get(t.lower(), 'chore')
        return f"{t}: {rest.strip()}"
    # Prefixes without colon
    m = re.match(r"^(WIP|Fix|Feature|Docs?|Refactor|Test|Perf|Build|CI)\b[:\s-]*(.*)$", s0, re.I)
    if m:
        rawt, rest = m.groups()
        t = TYPES.get(rawt.lower(), 'chore')
        rest = rest.strip() or s0
        return f"{t}: {rest}"
    # Default
    return f"chore: {s0}" if s0 else "chore: empty commit"

def normalize_subject(subj: str) -> str:
    subj = classify(subj)
    subj = re.sub(r"\s+", " ", subj).strip()
    return subj[:120]

def rename_message(message, metadata=None):  # filter-repo entrypoint
    if not message:
        return b"chore: empty commit"
    text = message.decode('utf-8', errors='replace').strip()
    if '\n' in text:
        first, rest = text.split('\n', 1)
    else:
        first, rest = text, ''
    subj = normalize_subject(first)
    if rest:
        # Keep body as-is; ensure separation by a blank line
        body = rest.strip()
        if body:
            return f"{subj}\n\n{body}".encode('utf-8')
    return subj.encode('utf-8')


