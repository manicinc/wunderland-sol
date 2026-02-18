/**
 * Oracle AI Assistant Prompts
 *
 * System prompts and templates for the Oracle planner assistant.
 *
 * @module lib/planner/oracle/prompts
 */

export const ORACLE_SYSTEM_PROMPT = `You are Oracle, an AI assistant specialized in task and time management. You help users organize their day, manage tasks, and stay productive.

## Your Capabilities:
1. **Task Management**
   - Create, update, and delete tasks
   - Add subtasks to existing tasks
   - Set due dates, times, and durations
   - Assign priorities (low, medium, high, urgent)
   - Organize tasks by project/area

2. **Time Management**
   - Schedule tasks for specific days
   - Estimate time for tasks
   - Suggest timeboxing schedules
   - Find free time slots

3. **Organization**
   - Label and categorize tasks
   - Create task templates
   - Move tasks between days
   - Clean up overdue tasks

4. **Insights**
   - Suggest what to focus on next
   - Identify overloaded days
   - Recommend task ordering

## Communication Style:
- Be concise and actionable
- Confirm before making changes (unless user says to proceed)
- Use natural, friendly language
- Provide clear summaries of actions taken

## Response Format:
When executing actions, respond with a structured format:
- **Action**: What you're about to do
- **Details**: Specific changes
- **Confirmation**: Ask for approval if needed

## Available Actions:
- create_task: Create a new task
- update_task: Update an existing task
- delete_task: Delete a task
- create_subtask: Add a subtask
- schedule_task: Set due date/time
- timebox_day: Create a schedule for a day
- find_free_time: Find available time slots
- suggest_focus: Recommend what to work on

Remember: You're here to reduce cognitive load and make task management effortless.`

export const TIMEBOX_PROMPT = `Help me create a timeboxed schedule for the following tasks. Consider:
1. Energy levels (harder tasks in the morning if possible)
2. Task priorities (urgent first)
3. Buffer time between tasks
4. Natural breaks

Current tasks:
{tasks}

Work hours: {startHour}:00 - {endHour}:00
Break preferences: {breakDuration} minute breaks every {breakInterval} minutes

Create an optimal schedule with start times for each task.`

export const FOCUS_SUGGESTION_PROMPT = `Based on the following context, suggest what the user should focus on:

Current time: {currentTime}
Today's tasks:
{todayTasks}

Overdue tasks:
{overdueTasks}

Upcoming deadlines:
{upcomingDeadlines}

Provide a clear, actionable recommendation for what to work on next and why.`

export const TASK_LABELING_PROMPT = `Analyze these unlabeled tasks and suggest appropriate projects/areas for each:

Available projects:
{projects}

Unlabeled tasks:
{tasks}

For each task, suggest the most appropriate project based on the task title and any context clues.`

export const TIME_ESTIMATION_PROMPT = `Estimate the time needed for these tasks without time estimates:

Tasks:
{tasks}

For each task, provide a reasonable time estimate in minutes. Consider:
- Task complexity from the title
- Common patterns (emails ~15min, meetings ~30-60min, deep work ~90min)
- Better to slightly overestimate than underestimate

Provide estimates in this format:
- Task: "task title" → Estimated: X minutes`

/**
 * Parse natural language into task actions
 */
export const PARSE_COMMAND_PROMPT = `Parse the following natural language command into a structured action:

Command: "{command}"

Available actions:
- create_task: { title, description?, dueDate?, dueTime?, duration?, priority?, project?, subtasks?[] }
- update_task: { taskId, ...updates }
- delete_task: { taskId }
- schedule_task: { taskId, dueDate, dueTime? }
- create_subtask: { parentTaskId, title }
- move_tasks: { taskIds[], toDate }
- complete_task: { taskId }

Context:
- Current date: {currentDate}
- Available projects: {projects}
- Recent tasks: {recentTasks}

Respond with JSON only, structured as:
{
  "action": "action_name",
  "params": { ... },
  "confirmation": "Human-readable description of what will happen"
}`

/**
 * Generate action descriptions for user confirmation
 */
export function getActionDescription(action: string, params: Record<string, unknown>): string {
  switch (action) {
    case 'create_task':
      return `Create task "${params.title}"${params.dueDate ? ` due ${params.dueDate}` : ''}${params.project ? ` in ${params.project}` : ''}`
    case 'update_task':
      return `Update task with changes: ${Object.keys(params).filter(k => k !== 'taskId').join(', ')}`
    case 'delete_task':
      return `Delete task`
    case 'schedule_task':
      return `Schedule task for ${params.dueDate}${params.dueTime ? ` at ${params.dueTime}` : ''}`
    case 'create_subtask':
      return `Add subtask "${params.title}"`
    case 'move_tasks':
      return `Move ${(params.taskIds as string[]).length} task(s) to ${params.toDate}`
    case 'complete_task':
      return `Mark task as complete`
    case 'timebox_day':
      return `Create timeboxed schedule for ${params.date || 'today'}`
    default:
      return `Execute ${action}`
  }
}
