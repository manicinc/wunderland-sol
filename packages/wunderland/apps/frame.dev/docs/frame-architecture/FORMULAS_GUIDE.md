# Formulas Guide

> Spreadsheet-like computations within your documents

## Overview

**Formulas** bring computational power to your notes. They read data from your document structure—mentions, fields, child blocks—and produce computed results that update automatically.

---

## Basic Syntax

Formulas start with `=` and use function calls:

```
=FUNCTION_NAME(argument1, argument2, ...)
```

### Inline Formulas

Place formulas directly in text:

```markdown
The total is =ADD(100, 200, 50) dollars.
```

Renders as: *The total is **350** dollars.*

### Formula Blocks

Use code blocks for complex formulas:

````markdown
```formula
=ADD(
  GET_FIELD("item1", "price"),
  GET_FIELD("item2", "price"),
  GET_FIELD("item3", "price")
)
```
````

---

## Data Types

Formulas work with these types:

| Type | Examples | Description |
|------|----------|-------------|
| `number` | `42`, `3.14`, `-10` | Numeric values |
| `string` | `"hello"`, `"Paris"` | Text values |
| `boolean` | `true`, `false` | Logical values |
| `date` | `@2025-06-15` | Date references |
| `entity` | `@Paris`, `@John-Smith` | Mention references |
| `array` | `[1, 2, 3]` | Lists of values |
| `object` | `{ "key": "value" }` | Key-value maps |

---

## Built-in Functions

### Arithmetic

| Function | Description | Example |
|----------|-------------|---------|
| `ADD(a, b, ...)` | Sum numbers | `=ADD(10, 20, 30)` → `60` |
| `SUBTRACT(a, b)` | Subtract b from a | `=SUBTRACT(100, 25)` → `75` |
| `MULTIPLY(a, b, ...)` | Multiply numbers | `=MULTIPLY(5, 4, 3)` → `60` |
| `DIVIDE(a, b)` | Divide a by b | `=DIVIDE(100, 4)` → `25` |
| `MOD(a, b)` | Remainder | `=MOD(10, 3)` → `1` |
| `ROUND(n, decimals?)` | Round number | `=ROUND(3.456, 2)` → `3.46` |
| `ABS(n)` | Absolute value | `=ABS(-5)` → `5` |
| `MIN(a, b, ...)` | Minimum value | `=MIN(5, 2, 8)` → `2` |
| `MAX(a, b, ...)` | Maximum value | `=MAX(5, 2, 8)` → `8` |

### Aggregation

| Function | Description | Example |
|----------|-------------|---------|
| `SUM(array)` | Sum array | `=SUM([1, 2, 3])` → `6` |
| `AVERAGE(array)` | Mean value | `=AVERAGE([2, 4, 6])` → `4` |
| `COUNT(array)` | Count items | `=COUNT(CHILDREN())` → `5` |

### Data Access

| Function | Description | Example |
|----------|-------------|---------|
| `GET_FIELD(entity, field)` | Get entity property | `=GET_FIELD(@Paris, "latitude")` |
| `GET_FIELD(name)` | Get named value from doc | `=GET_FIELD("budget")` |
| `CHILDREN(path?)` | Get child blocks | `=CHILDREN("expenses")` |
| `DESCENDANTS(path?)` | Get all nested blocks | `=DESCENDANTS()` |
| `RESOLVE_MENTION(text)` | Resolve mention to entity | `=RESOLVE_MENTION("Paris")` |

### Mention Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ROUTE(from, to)` | Calculate route | `=ROUTE(@Paris, @London)` |
| `DISTANCE(from, to)` | Distance in km | `=DISTANCE(@Paris, @London)` → `344` |
| `WEATHER(place, date?)` | Get weather | `=WEATHER(@Paris, @tomorrow)` |
| `TIMEZONE(place)` | Get timezone | `=TIMEZONE(@Paris)` → `"Europe/Paris"` |

### Date Functions

| Function | Description | Example |
|----------|-------------|---------|
| `TODAY()` | Current date | `=TODAY()` → `2025-06-15` |
| `NOW()` | Current datetime | `=NOW()` → `2025-06-15T14:30:00` |
| `DATE_ADD(date, n, unit)` | Add to date | `=DATE_ADD(@today, 7, "days")` |
| `DATE_DIFF(a, b, unit)` | Difference | `=DATE_DIFF(@June-30, @today, "days")` |
| `FORMAT_DATE(date, fmt)` | Format date | `=FORMAT_DATE(@today, "MMM D, YYYY")` |

### Text Functions

| Function | Description | Example |
|----------|-------------|---------|
| `CONCAT(a, b, ...)` | Join strings | `=CONCAT("Hello, ", @John-Smith.name)` |
| `UPPER(text)` | Uppercase | `=UPPER("hello")` → `"HELLO"` |
| `LOWER(text)` | Lowercase | `=LOWER("HELLO")` → `"hello"` |
| `LENGTH(text)` | String length | `=LENGTH("hello")` → `5` |
| `TRIM(text)` | Remove whitespace | `=TRIM("  hi  ")` → `"hi"` |

### Logic Functions

| Function | Description | Example |
|----------|-------------|---------|
| `IF(cond, then, else)` | Conditional | `=IF(x > 10, "big", "small")` |
| `AND(a, b, ...)` | All true | `=AND(true, true)` → `true` |
| `OR(a, b, ...)` | Any true | `=OR(false, true)` → `true` |
| `NOT(a)` | Negate | `=NOT(false)` → `true` |
| `EQUALS(a, b)` | Compare | `=EQUALS(5, 5)` → `true` |

### Array Functions

| Function | Description | Example |
|----------|-------------|---------|
| `MAP(array, expr)` | Transform each | `=MAP([1,2,3], x => x * 2)` |
| `FILTER(array, expr)` | Filter items | `=FILTER(items, x => x.done)` |
| `FIND(array, expr)` | Find first match | `=FIND(items, x => x.id == 5)` |
| `SORT(array, key?)` | Sort items | `=SORT(items, "date")` |
| `FIRST(array)` | First item | `=FIRST([1, 2, 3])` → `1` |
| `LAST(array)` | Last item | `=LAST([1, 2, 3])` → `3` |

---

## Referencing Document Data

### Named Values

Reference named values from your document:

```markdown
# Budget
- Flights: $800
- Hotels: $1200
- Food: $500

**Total:** =ADD(GET_FIELD("Flights"), GET_FIELD("Hotels"), GET_FIELD("Food"))
```

### Child Blocks

Aggregate data from child blocks:

```markdown
# Expenses
- Coffee: $5
- Lunch: $15
- Dinner: $40

**Daily Total:** =SUM(MAP(CHILDREN(), c => c.value))
```

### Mention Properties

Access properties from mentions:

```markdown
Distance from @San-Francisco to @New-York: 
=DISTANCE(@San-Francisco, @New-York) km
```

---

## Formula Fields in Supertags

Supertags can define computed fields using formulas:

```yaml
# Supertag: #invoice
fields:
  - name: subtotal
    type: number
  - name: taxRate
    type: number
    default: 0.08
  - name: tax
    type: formula
    expression: "=MULTIPLY(@subtotal, @taxRate)"
  - name: total
    type: formula
    expression: "=ADD(@subtotal, @tax)"
```

When you apply `#invoice` to a block:

```markdown
#invoice
- subtotal: 100
- taxRate: 0.1
- tax: [auto: 10]
- total: [auto: 110]
```

---

## Formula Evaluation

### Evaluation Order

1. Parse the expression
2. Resolve mentions to entities
3. Fetch field values from context
4. Evaluate functions (left-to-right, respecting parentheses)
5. Return result

### Error Handling

| Error | Cause | Display |
|-------|-------|---------|
| `#REF!` | Missing reference | Entity or field not found |
| `#VALUE!` | Type mismatch | Wrong argument type |
| `#DIV/0!` | Division by zero | Divide by zero attempted |
| `#NAME?` | Unknown function | Function name typo |
| `#CIRCULAR!` | Circular reference | Formula references itself |

---

## Examples

### Budget Tracker

```markdown
# Monthly Budget - June 2025

## Income
- Salary: $5000
- Freelance: $800

**Total Income:** =ADD(5000, 800)

## Expenses
- Rent: $1500
- Utilities: $200
- Groceries: $400
- Transport: $150
- Entertainment: $300

**Total Expenses:** =ADD(1500, 200, 400, 150, 300)

## Summary
- **Savings:** =SUBTRACT(ADD(5000, 800), ADD(1500, 200, 400, 150, 300))
- **Savings Rate:** =ROUND(DIVIDE(SUBTRACT(5800, 2550), 5800) * 100, 1)%
```

### Trip Calculator

```markdown
# Road Trip: @San-Francisco to @Los-Angeles

## Route Info
- Distance: =DISTANCE(@San-Francisco, @Los-Angeles) km
- Estimated time: =GET_FIELD(ROUTE(@San-Francisco, @Los-Angeles), "duration")

## Fuel Cost
- Car MPG: 30
- Gas price: $4.50/gallon
- Distance (miles): =MULTIPLY(DISTANCE(@San-Francisco, @Los-Angeles), 0.621371)
- Gallons needed: =DIVIDE(MULTIPLY(DISTANCE(@San-Francisco, @Los-Angeles), 0.621371), 30)
- **Fuel cost:** $=ROUND(MULTIPLY(DIVIDE(MULTIPLY(DISTANCE(@San-Francisco, @Los-Angeles), 0.621371), 30), 4.50), 2)
```

### Project Tracking

```markdown
# Project Alpha - Sprint 3

## Tasks #sprint
| Task | Story Points | Status |
|------|--------------|--------|
| Auth system | 8 | done |
| User profile | 5 | done |
| Dashboard | 13 | in-progress |
| API docs | 3 | todo |

## Metrics
- **Total Points:** =SUM([8, 5, 13, 3])
- **Completed:** =SUM([8, 5])
- **Velocity:** =ROUND(DIVIDE(SUM([8, 5]), 2), 1) points/day
- **Progress:** =ROUND(DIVIDE(SUM([8, 5]), SUM([8, 5, 13, 3])) * 100, 0)%
```

### Weather Planning

```markdown
# Weekend Plans - @Saturday

## Weather Check
- @San-Francisco: =WEATHER(@San-Francisco, @Saturday)
- @Napa-Valley: =WEATHER(@Napa-Valley, @Saturday)

## Decision
=IF(
  GET_FIELD(WEATHER(@Napa-Valley, @Saturday), "condition") == "sunny",
  "Wine tasting in Napa! 🍷",
  "Museum day in SF 🏛️"
)
```

---

## Using Formulas with Views

Formulas can generate data for views:

````markdown
## Sales by Region

```formula
=MAP(
  ["North", "South", "East", "West"],
  region => ({
    name: region,
    value: GET_FIELD(CONCAT("sales_", LOWER(region)))
  })
)
```

```view-chart
{
  "type": "bar",
  "dataSource": "previous-formula",
  "xKey": "name",
  "yKey": "value"
}
```
````

---

## Block Commands

### `/formula` Command

Insert a formula block:

1. Type `/formula`
2. Enter your expression
3. Preview the result
4. Insert

### Formula Insert Modal

The modal provides:
- Expression editor with syntax highlighting
- Live preview of result
- Function autocomplete
- Error messages

---

## API Reference

### `evaluateFormula(expression: string, context: FormulaContext): Promise<FormulaResult>`

Evaluate a formula expression:

```typescript
const result = await evaluateFormula("=ADD(1, 2, 3)", context);
// Returns: { value: 6, type: "number" }
```

### `parseFormula(expression: string): FormulaAST`

Parse a formula into an AST:

```typescript
const ast = parseFormula("=ADD(1, MULTIPLY(2, 3))");
// Returns: { type: "call", name: "ADD", args: [...] }
```

### `createFormulaContext(document, block): FormulaContext`

Create evaluation context:

```typescript
const context = createFormulaContext(document, block);
// Returns: { getField, getChildren, resolveMention, ... }
```

---

## Best Practices

1. **Keep formulas simple** — Break complex calculations into named values
2. **Use meaningful names** — `GET_FIELD("monthly_rent")` vs `GET_FIELD("x")`
3. **Handle errors** — Use `IF` to check for missing data
4. **Document assumptions** — Add comments for complex formulas
5. **Test incrementally** — Build formulas step by step

---

## Troubleshooting

### Formula shows `#REF!`

- Check that the referenced entity/field exists
- Verify spelling of field names
- Ensure mentions are resolved

### Formula shows `#VALUE!`

- Check argument types (number vs string)
- Ensure arrays are properly formatted
- Verify function signature

### Formula not updating

- Refresh the page
- Check for circular references
- Verify data sources exist

---

## Related Guides

- [DYNAMIC_DOCUMENTS_GUIDE.md](./DYNAMIC_DOCUMENTS_GUIDE.md) — Overview
- [MENTIONS_GUIDE.md](./MENTIONS_GUIDE.md) — Using mentions in formulas
- [EMBEDDABLE_VIEWS_GUIDE.md](./EMBEDDABLE_VIEWS_GUIDE.md) — Displaying formula results

