---
id: dynamic-docs-formulas-reference
slug: formulas-reference
title: "Formula Functions Reference"
version: "1.0.0"
difficulty: intermediate
taxonomy:
  subjects:
    - documentation
    - reference
  topics:
    - formulas
    - dynamic-documents
tags:
  - formulas
  - reference
  - embark
  - functions
  - calculations
relationships:
  references:
    - dynamic-docs-intro
publishing:
  status: published
  lastUpdated: "2024-12-31"
summary: Complete reference for all available formula functions with examples.
---

# 📚 Formula Functions Reference

Complete guide to all formula functions available in dynamic documents.

---

## Getting Started

### Basic Syntax

Formulas start with `=` followed by a function name and arguments:

```
=FUNCTION_NAME(arg1, arg2, ...)
```

### Formula Blocks

Use code blocks with the `formula` language tag:

~~~markdown
```formula:my_calculation
=ADD(10, 20, 30)
```
~~~

The `:my_calculation` suffix is an optional label for the result.

### Inline Formulas

You can also use formulas inline: `=ADD(1, 2)` → 3

---

## 🔢 Math Functions

### ADD

Adds multiple numbers together.

**Syntax:** `=ADD(number1, number2, ...)`

**Examples:**

```formula:add_example
=ADD(10, 20, 30)
```

Result: **60**

```formula:add_decimals
=ADD(10.5, 20.25, 5.75)
```

Result: **36.5**

---

### SUBTRACT

Subtracts the second number from the first.

**Syntax:** `=SUBTRACT(number1, number2)`

**Examples:**

```formula:subtract_example
=SUBTRACT(100, 35)
```

Result: **65**

```formula:subtract_negative
=SUBTRACT(50, 75)
```

Result: **-25**

---

### MULTIPLY

Multiplies numbers together.

**Syntax:** `=MULTIPLY(number1, number2, ...)`

**Examples:**

```formula:multiply_example
=MULTIPLY(5, 10)
```

Result: **50**

```formula:multiply_chain
=MULTIPLY(2, 3, 4)
```

Result: **24**

---

### DIVIDE

Divides the first number by the second.

**Syntax:** `=DIVIDE(dividend, divisor)`

**Examples:**

```formula:divide_example
=DIVIDE(100, 4)
```

Result: **25**

```formula:divide_decimal
=DIVIDE(10, 3)
```

Result: **3.33** (rounded)

---

### AVERAGE

Calculates the average of multiple numbers.

**Syntax:** `=AVERAGE(number1, number2, ...)`

**Examples:**

```formula:average_example
=AVERAGE(80, 90, 70, 100)
```

Result: **85**

---

### MIN / MAX

Find the minimum or maximum value.

**Syntax:** `=MIN(number1, number2, ...)` / `=MAX(number1, number2, ...)`

**Examples:**

```formula:min_example
=MIN(45, 23, 67, 12)
```

Result: **12**

```formula:max_example
=MAX(45, 23, 67, 12)
```

Result: **67**

---

### ROUND

Rounds a number to specified decimal places.

**Syntax:** `=ROUND(number, decimals)`

**Examples:**

```formula:round_example
=ROUND(3.14159, 2)
```

Result: **3.14**

---

### PERCENTAGE

Calculates percentage of a number.

**Syntax:** `=PERCENTAGE(number, percent)`

**Examples:**

```formula:percentage_example
=PERCENTAGE(200, 15)
```

Result: **30** (15% of 200)

---

## 🌤️ Data Functions

### WEATHER

Gets weather forecast for a location and date.

**Syntax:** `=WEATHER(location, date)`

**Examples:**

```formula:weather_example
=WEATHER("San Francisco, CA", "2025-01-15")
```

Result: `{ temp: 55, condition: "Partly Cloudy", high: 60, low: 48 }`

```formula:weather_nyc
=WEATHER("New York, NY", "2025-01-20")
```

---

### ROUTE

Calculates route between two locations.

**Syntax:** `=ROUTE(origin, destination)`

**Examples:**

```formula:route_example
=ROUTE("San Francisco", "Los Angeles")
```

Result: `{ distance: "382 mi", duration: "5h 45m", route: "I-5 S" }`

---

### DISTANCE

Gets distance between two locations.

**Syntax:** `=DISTANCE(location1, location2)`

**Examples:**

```formula:distance_example
=DISTANCE("Golden Gate Bridge", "Alcatraz Island")
```

Result: **1.5 miles**

---

## 📅 Date Functions

### TODAY

Returns today's date.

**Syntax:** `=TODAY()`

**Examples:**

```formula:today_example
=TODAY()
```

Result: **2024-12-31**

---

### ADD_DAYS

Adds days to a date.

**Syntax:** `=ADD_DAYS(date, days)`

**Examples:**

```formula:add_days_example
=ADD_DAYS("2025-01-15", 7)
```

Result: **2025-01-22**

```formula:add_days_negative
=ADD_DAYS("2025-01-15", -3)
```

Result: **2025-01-12**

---

### DAYS_BETWEEN

Calculates days between two dates.

**Syntax:** `=DAYS_BETWEEN(date1, date2)`

**Examples:**

```formula:days_between_example
=DAYS_BETWEEN("2025-01-01", "2025-01-15")
```

Result: **14 days**

---

### FORMAT_DATE

Formats a date string.

**Syntax:** `=FORMAT_DATE(date, format)`

**Examples:**

```formula:format_date_example
=FORMAT_DATE("2025-01-15", "long")
```

Result: **January 15, 2025**

---

## 📝 Text Functions

### CONCAT

Joins text strings together.

**Syntax:** `=CONCAT(text1, text2, ...)`

**Examples:**

```formula:concat_example
=CONCAT("Hello", " ", "World")
```

Result: **Hello World**

---

### UPPER / LOWER

Converts text to uppercase or lowercase.

**Syntax:** `=UPPER(text)` / `=LOWER(text)`

**Examples:**

```formula:upper_example
=UPPER("hello world")
```

Result: **HELLO WORLD**

---

## 🔗 Reference Functions

### GET_FIELD

Gets a field value from a block or mention.

**Syntax:** `=GET_FIELD(reference, fieldName)`

**Examples:**

```formula:get_field_example
=GET_FIELD("@hotel", "price")
```

Result: Returns the `price` field from the hotel mention.

---

### RESOLVE_MENTION

Resolves a mention to its full data.

**Syntax:** `=RESOLVE_MENTION(mentionId)`

**Examples:**

```formula:resolve_mention_example
=RESOLVE_MENTION("place-san-francisco")
```

Result: Full entity data for San Francisco

---

## 🎯 Nested Formulas

Formulas can be nested inside each other:

### Example: Calculate Savings Rate

```formula:nested_example
=MULTIPLY(=DIVIDE(1600, 6500), 100)
```

This calculates: `(1600 / 6500) * 100 = 24.6%`

### Example: Total Trip Cost Per Person

```formula:trip_per_person
=DIVIDE(=ADD(450, 500, 250, 100), 2)
```

This calculates: `(450 + 500 + 250 + 100) / 2 = $650`

---

## 💡 Tips & Best Practices

### 1. Use Labels for Clarity

```formula:monthly_rent
=ADD(1800)
```

The `:monthly_rent` label makes it clear what this formula represents.

### 2. Break Down Complex Calculations

Instead of one giant formula, use multiple labeled formulas:

```formula:income
=ADD(5000, 500, 200)
```

```formula:expenses
=ADD(1800, 450, 200)
```

```formula:savings
=SUBTRACT(=ADD(5000, 500, 200), =ADD(1800, 450, 200))
```

### 3. Comment Your Logic

Add markdown text before formulas to explain:

> **Savings Rate:** The percentage of income saved each month.
> Goal is 20% or higher.

```formula:savings_rate
=MULTIPLY(=DIVIDE(500, 5700), 100)
```

---

## 🔧 Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `#DIV/0!` | Dividing by zero | Check denominator |
| `#VALUE!` | Invalid argument type | Ensure numbers are numbers |
| `#REF!` | Invalid reference | Check mention/field names |
| `#NAME?` | Unknown function | Check function spelling |

### Debugging Tips

1. Simplify the formula to find the error
2. Test each nested formula separately
3. Check that all references exist

---

> 📖 **Learn More**
> - [Full Formulas Guide](/docs/frame-architecture/FORMULAS_GUIDE.md)
> - [Embark Paper](https://inkandswitch.com/embark)




