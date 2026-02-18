---
id: dynamic-docs-budget-example
slug: budget-tracking-example
title: "Budget Tracking: January 2025"
version: "1.0.0"
difficulty: intermediate
contentType: budget
taxonomy:
  subjects:
    - finance
    - planning
  topics:
    - budget
    - dynamic-documents
tags:
  - budget
  - finance
  - example
  - embark
  - formulas
  - tables
  - charts
relationships:
  references:
    - dynamic-docs-intro
publishing:
  status: published
  lastUpdated: "2024-12-31"
summary: A monthly budget example demonstrating formula calculations, tables, and chart visualizations.
---

# 💰 January 2025 Budget

Track income, expenses, and savings with automatic calculations and visualizations.

---

## 📊 Budget Summary

| Metric | Value |
|--------|-------|
| **Period** | @[January 2025](date-jan-2025) |
| **Status** | 🟢 On Track |
| **Last Updated** | @[December 31, 2024](date-updated) |

---

## 💵 Income

### Monthly Income Sources

| Source | Amount | Frequency |
|--------|--------|-----------|
| 💼 Salary | $5,500 | Monthly |
| 🏠 Side Gig | $800 | Monthly |
| 📈 Dividends | $150 | Monthly |
| 🎁 Other | $50 | Variable |

### Total Monthly Income

```formula:total_income
=ADD(5500, 800, 150, 50)
```

**Result:** Your total monthly income is **$6,500**

---

## 🏠 Fixed Expenses

These expenses stay the same each month:

| Item | Amount | Due Date |
|------|--------|----------|
| 🏠 Rent | $1,800 | 1st |
| 🚗 Car Payment | $450 | 15th |
| 📱 Phone | $85 | 20th |
| 🌐 Internet | $75 | 22nd |
| 🛡️ Insurance (Car) | $120 | 25th |
| 🛡️ Insurance (Health) | $200 | 1st |
| 🎬 Subscriptions | $65 | Various |

### Fixed Expenses Total

```formula:fixed_total
=ADD(1800, 450, 85, 75, 120, 200, 65)
```

---

## 🛒 Variable Expenses

These expenses change month to month:

| Category | Budget | Actual | Status |
|----------|--------|--------|--------|
| 🍎 Groceries | $500 | $485 | ✅ Under |
| ⛽ Gas | $200 | $180 | ✅ Under |
| 🍽️ Dining Out | $200 | $245 | ⚠️ Over |
| 🎮 Entertainment | $150 | $130 | ✅ Under |
| 👕 Clothing | $100 | $0 | ✅ Under |
| 💊 Healthcare | $75 | $50 | ✅ Under |
| 🎁 Gifts | $50 | $75 | ⚠️ Over |

### Variable Expenses Total (Budgeted)

```formula:variable_budgeted
=ADD(500, 200, 200, 150, 100, 75, 50)
```

### Variable Expenses Total (Actual)

```formula:variable_actual
=ADD(485, 180, 245, 130, 0, 50, 75)
```

### Variable Spending Variance

```formula:variable_variance
=SUBTRACT(1275, 1165)
```

**Result:** You're **$110 under budget** on variable expenses! 🎉

---

## 💰 Savings & Investments

| Account | Monthly Contribution |
|---------|---------------------|
| 🏦 Emergency Fund | $500 |
| 📈 401(k) | $600 |
| 📊 Brokerage | $300 |
| 🎯 Vacation Fund | $200 |

### Total Savings

```formula:savings_total
=ADD(500, 600, 300, 200)
```

---

## 📈 Monthly Summary

### All Expenses

```formula:all_expenses
=ADD(2795, 1165)
```

### Net Cash Flow

```formula:net_cashflow
=SUBTRACT(6500, =ADD(2795, 1165, 1600))
```

**Result:** Monthly surplus of **$940** after all expenses and savings!

---

## 📊 Expense Breakdown Chart

Visualize where your money goes:

```view-chart
{
  "type": "chart",
  "title": "Expense Categories",
  "scope": "document",
  "settings": {
    "chartType": "pie",
    "showLegend": true,
    "showLabels": true,
    "showPercentages": true
  },
  "data": [
    { "label": "Housing", "value": 1800, "color": "#3b82f6" },
    { "label": "Transportation", "value": 750, "color": "#10b981" },
    { "label": "Food", "value": 730, "color": "#f59e0b" },
    { "label": "Insurance", "value": 320, "color": "#8b5cf6" },
    { "label": "Entertainment", "value": 195, "color": "#ec4899" },
    { "label": "Other", "value": 165, "color": "#6b7280" }
  ]
}
```

---

## 📊 Income vs Expenses Bar Chart

```view-chart
{
  "type": "chart",
  "title": "Income vs Expenses vs Savings",
  "scope": "document",
  "settings": {
    "chartType": "bar",
    "showLegend": true,
    "orientation": "vertical"
  },
  "data": [
    { "label": "Income", "value": 6500, "color": "#10b981" },
    { "label": "Fixed Expenses", "value": 2795, "color": "#ef4444" },
    { "label": "Variable Expenses", "value": 1165, "color": "#f59e0b" },
    { "label": "Savings", "value": 1600, "color": "#3b82f6" },
    { "label": "Surplus", "value": 940, "color": "#8b5cf6" }
  ]
}
```

---

## 📋 Expense Table View

All expenses in a sortable, searchable table:

```view-table
{
  "type": "table",
  "title": "All Expenses",
  "scope": "document",
  "settings": {
    "columns": ["category", "item", "amount", "dueDate", "status"],
    "sortable": true,
    "filterable": true,
    "showTotals": true
  }
}
```

---

## 📅 Bill Payment Calendar

Track when bills are due:

```view-calendar
{
  "type": "calendar",
  "title": "January 2025 Bills",
  "scope": "document",
  "settings": {
    "view": "month",
    "showWeekends": true
  },
  "filter": { "types": ["date", "event"] }
}
```

---

## 🎯 Financial Goals Progress

| Goal | Target | Current | Progress |
|------|--------|---------|----------|
| 🆘 Emergency Fund | $10,000 | $7,500 | 75% |
| 🏖️ Vacation Fund | $3,000 | $1,800 | 60% |
| 🚗 New Car Fund | $5,000 | $2,000 | 40% |
| 📚 Education | $2,000 | $500 | 25% |

### Emergency Fund Progress

```formula:emergency_progress
=MULTIPLY(=DIVIDE(7500, 10000), 100)
```

**75%** of emergency fund goal reached!

---

## 📊 Key Financial Ratios

### Savings Rate

```formula:savings_rate
=MULTIPLY(=DIVIDE(1600, 6500), 100)
```

**24.6% savings rate** — Great job! (Target: 20%+)

### Housing Ratio

```formula:housing_ratio
=MULTIPLY(=DIVIDE(1800, 6500), 100)
```

**27.7% of income on housing** — Within 30% guideline ✅

### 50/30/20 Rule Check

| Category | Guideline | Actual | Status |
|----------|-----------|--------|--------|
| Needs (50%) | $3,250 | $2,795 | ✅ 43% |
| Wants (30%) | $1,950 | $1,165 | ✅ 18% |
| Savings (20%) | $1,300 | $1,600 | ✅ 25% |

---

## 📝 Notes & Observations

### This Month's Wins 🎉
- Stayed under grocery budget
- Increased 401(k) contribution
- No impulse purchases

### Areas to Improve 📈
- Dining out exceeded budget by $45
- Gift spending unplanned
- Need to track coffee purchases

### Next Month's Goals
- [ ] Reduce dining out to $150
- [ ] Start tracking daily expenses
- [ ] Review subscription services
- [ ] Increase emergency fund to $8,000

---

> 💡 **This is a live dynamic document!**
> - Formulas automatically calculate totals and ratios
> - Charts visualize your spending patterns
> - Tables make data searchable and sortable
> 
> Edit the numbers to see calculations update instantly!




