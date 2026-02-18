#!/usr/bin/env bash
# ============================================================
# Wunderland Sol — Autonomous Development Loop
# ============================================================
# This script runs Claude Code CLI in self-iterating loops to
# autonomously build, test, and refine the project.
#
# No API keys needed — uses the same Claude Code authentication
# as the VS Code extension.
#
# Usage:
#   ./scripts/dev-loop.sh                    # Run full development loop
#   ./scripts/dev-loop.sh --task "build ui"  # Run specific task
#   ./scripts/dev-loop.sh --cycles 5         # Run 5 iterations
#   ./scripts/dev-loop.sh --agent architect  # Run as architect agent
#
# Agents:
#   architect  — Plans architecture, designs systems
#   coder      — Writes implementation code
#   reviewer   — Reviews code quality, finds bugs
#   tester     — Writes and runs tests
#   orchestrator — Evaluates progress, decides next steps (default)
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
DEVLOG="${PROJECT_DIR}/DEVLOG.md"
SYNINT_PROMPT="${PROJECT_DIR}/prompts/SYNINT_FRAMEWORK.md"
STATE_FILE="${PROJECT_DIR}/.dev-state.json"
CYCLE_COUNT=${CYCLES:-3}
AGENT_ROLE="orchestrator"
SPECIFIC_TASK=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --cycles) CYCLE_COUNT="$2"; shift 2 ;;
    --agent) AGENT_ROLE="$2"; shift 2 ;;
    --task) SPECIFIC_TASK="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ============================================================
# Setup
# ============================================================

mkdir -p "${LOG_DIR}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CYCLE_LOG="${LOG_DIR}/cycle-$(date +%s).md"

echo "============================================================"
echo "  Wunderland Sol — Autonomous Development Loop"
echo "============================================================"
echo "  Agent Role:   ${AGENT_ROLE}"
echo "  Cycles:       ${CYCLE_COUNT}"
echo "  Project Dir:  ${PROJECT_DIR}"
echo "  Log:          ${CYCLE_LOG}"
echo "  Timestamp:    ${TIMESTAMP}"
echo "============================================================"
echo ""

# ============================================================
# Agent Prompts (role-specific context)
# ============================================================

get_agent_prompt() {
  local role=$1
  local task=$2
  local synint_context
  synint_context=$(cat "${SYNINT_PROMPT}")

  case $role in
    orchestrator)
      cat <<PROMPT
${synint_context}

---

## ORCHESTRATOR AGENT — Wunderland Sol Development

You are the orchestrator agent for Wunderland Sol, an autonomous AI social network on Solana being built for the Colosseum Agent Hackathon (Feb 2-12, 2026).

**Your role**: Evaluate current project state, analyze what's been built, identify gaps, and decide the next development steps. You coordinate the work of other specialized agents.

**Current working directory**: ${PROJECT_DIR}

**Instructions**:
1. Read the DEVLOG.md to understand what's been done
2. Check the current file structure (ls -la, find key files)
3. Evaluate what's complete vs incomplete
4. Decide the 3 most impactful tasks to do next
5. For each task, specify which agent role should handle it (architect, coder, reviewer, tester)
6. Update DEVLOG.md with your evaluation and decisions
7. Output a JSON summary of next tasks to stdout

${task:+**Specific focus**: ${task}}

**Output format** (at the end of your response, output this JSON block):
\`\`\`json
{
  "evaluation": "brief summary of current state",
  "completeness_percent": 0-100,
  "next_tasks": [
    {"role": "coder", "task": "description", "priority": 1},
    {"role": "coder", "task": "description", "priority": 2},
    {"role": "tester", "task": "description", "priority": 3}
  ],
  "blockers": ["any blocking issues"],
  "devlog_entry": "markdown entry for the development log"
}
\`\`\`
PROMPT
      ;;

    architect)
      cat <<PROMPT
${synint_context}

---

## ARCHITECT AGENT — Wunderland Sol

You are the architect agent. Your role is to design systems, plan file structures, define interfaces, and create technical specifications.

**Current working directory**: ${PROJECT_DIR}

**Instructions**:
1. Read existing code and architecture docs
2. Design the requested component/system
3. Write specification files, type definitions, and interface contracts
4. Do NOT write implementation code — only contracts, types, and specs
5. Update DEVLOG.md with architecture decisions

${task:+**Task**: ${task}}
PROMPT
      ;;

    coder)
      cat <<PROMPT
${synint_context}

---

## CODER AGENT — Wunderland Sol

You are the coder agent. Your role is to write implementation code following existing patterns and architecture specs.

**Current working directory**: ${PROJECT_DIR}

**Instructions**:
1. Read the relevant spec/type files to understand the contract
2. Implement the requested feature following existing code patterns
3. Write clean, typed TypeScript or Rust code
4. Include inline comments for non-obvious logic
5. Do NOT modify types or interfaces — only implement against them
6. Update DEVLOG.md with what you built

${task:+**Task**: ${task}}
PROMPT
      ;;

    reviewer)
      cat <<PROMPT
${synint_context}

---

## REVIEWER AGENT — Wunderland Sol

You are the code reviewer agent. Your role is to review code quality, find bugs, identify improvements, and ensure consistency.

**Current working directory**: ${PROJECT_DIR}

**Instructions**:
1. Read the codebase systematically
2. Check for bugs, type errors, logic issues
3. Verify code follows project patterns and conventions
4. Check for security vulnerabilities (especially in Solana program)
5. Write a review report with specific file:line references
6. Suggest concrete fixes (but do not apply them)
7. Update DEVLOG.md with review findings

${task:+**Focus area**: ${task}}
PROMPT
      ;;

    tester)
      cat <<PROMPT
${synint_context}

---

## TESTER AGENT — Wunderland Sol

You are the tester agent. Your role is to write tests, run them, and verify functionality.

**Current working directory**: ${PROJECT_DIR}

**Instructions**:
1. Read the code to understand what needs testing
2. Write unit tests and integration tests
3. Run the tests and capture output
4. Fix any test failures
5. Report test coverage and results
6. Update DEVLOG.md with test results

${task:+**Test focus**: ${task}}
PROMPT
      ;;

    *)
      echo "Unknown agent role: ${role}"
      exit 1
      ;;
  esac
}

# ============================================================
# Run a single agent cycle
# ============================================================

run_agent_cycle() {
  local role=$1
  local task=$2
  local cycle_num=$3

  echo ""
  echo "------------------------------------------------------------"
  echo "  Cycle ${cycle_num} — Agent: ${role}"
  echo "  Task: ${task:-auto-evaluate}"
  echo "  Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "------------------------------------------------------------"
  echo ""

  local prompt
  prompt=$(get_agent_prompt "${role}" "${task}")

  local agent_log="${LOG_DIR}/${role}-cycle${cycle_num}-$(date +%s).log"

  # Run Claude Code CLI with the prompt
  # --print flag outputs response without interactive mode
  # --dangerously-skip-permissions skips tool approval prompts
  echo "${prompt}" | claude --print \
    --output-format text \
    --max-turns 20 \
    2>&1 | tee "${agent_log}"

  local exit_code=$?

  echo ""
  echo "  Agent ${role} completed cycle ${cycle_num} (exit: ${exit_code})"
  echo "  Log: ${agent_log}"
  echo ""

  # Append to cycle log
  cat >> "${CYCLE_LOG}" <<ENTRY

---

## Cycle ${cycle_num} — ${role} Agent
**Time**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Task**: ${task:-auto-evaluate}
**Exit Code**: ${exit_code}
**Log**: ${agent_log}

### Output Summary
\`\`\`
$(tail -50 "${agent_log}")
\`\`\`

ENTRY

  return ${exit_code}
}

# ============================================================
# Multi-agent parallel execution
# ============================================================

run_parallel_agents() {
  local tasks=("$@")
  local pids=()

  echo "Running ${#tasks[@]} agents in parallel..."

  for task_spec in "${tasks[@]}"; do
    local role=$(echo "${task_spec}" | cut -d'|' -f1)
    local task=$(echo "${task_spec}" | cut -d'|' -f2)

    run_agent_cycle "${role}" "${task}" "parallel" &
    pids+=($!)
  done

  # Wait for all agents to complete
  for pid in "${pids[@]}"; do
    wait "${pid}" || true
  done

  echo "All parallel agents completed."
}

# ============================================================
# Main Development Loop
# ============================================================

main() {
  # Initialize cycle log
  cat > "${CYCLE_LOG}" <<HEADER
# Development Cycle Log
**Started**: ${TIMESTAMP}
**Agent**: ${AGENT_ROLE}
**Cycles**: ${CYCLE_COUNT}
HEADER

  if [[ -n "${SPECIFIC_TASK}" ]]; then
    # Single task mode
    run_agent_cycle "${AGENT_ROLE}" "${SPECIFIC_TASK}" 1
  else
    # Iterative development loop
    for ((i = 1; i <= CYCLE_COUNT; i++)); do
      echo ""
      echo "============================================================"
      echo "  DEVELOPMENT LOOP — Iteration ${i}/${CYCLE_COUNT}"
      echo "============================================================"

      # Step 1: Orchestrator evaluates and decides
      run_agent_cycle "orchestrator" "" "${i}"

      # Step 2: Parse orchestrator output for next tasks
      # (In practice, the orchestrator's changes to files drive the next cycle)

      echo ""
      echo "  Iteration ${i} complete. Pausing 5s before next cycle..."
      sleep 5
    done
  fi

  echo ""
  echo "============================================================"
  echo "  Development loop complete."
  echo "  Full log: ${CYCLE_LOG}"
  echo "  Dev log:  ${DEVLOG}"
  echo "============================================================"
}

main "$@"
