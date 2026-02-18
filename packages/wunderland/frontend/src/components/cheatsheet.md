# 🧱 Coding Interview Edge Case & Bug Cheatsheet

# Interview Day Quick Cards

## Presence vs Frequency
- set() → duplicates / seen before
- Counter → anagrams, top-k, majority

## Catalan Quick Table
n=1→1, 2→2, 3→5, 4→14, 5→42

## Rotated Array BS
```python
while l<r:
    mid=(l+r)//2
    if nums[mid] > nums[r]: l=mid+1
    else: r=mid
return l  # index of min
````

## Fibonacci-Style DP
```python
a,b = 1,2
for _ in range(3,n+1): a,b = b,a+b
```
`
## Valid-Parentheses Fail Fast
```python
if not stack or mismatch: return False
```

# 🔐 What Is an Invariant?

An invariant is a logical condition that stays TRUE 
throughout a loop or recursion.

## Why?
- Guarantees correctness
- Helps reason about loop updates
- Shows interviewer you understand control flow

## Common Invariants:
- Binary Search: "Answer is always in [l, r]"
- Sliding Window: "Current window is valid"
- DP: "dp[i] correctly solves subproblem up to i"
- Stack: "Stack is always monotonic"

## Binary Search: Classic vs Variant

## Classic
- #Input: sorted array
- Target: specific value
- Output: index of target
- Invariant: "target ∈ [l, r]"

### Variant
- Input: can be rotated, abstract, or even implicit (like a search space)
- Goal: find min, boundary, first True, best config, etc.
- Output: index, value, or smallest/largest condition-satisfying X
- Invariant: varies, but always tracks where the answer lies

## Binary Search Invariants Examples

### 1. Search for exact value
Invariant: target ∈ [l, r]
Shrink: if nums[mid] < target → l = mid+1

### 2. Search for first ≥ target
Invariant: first valid ∈ [l, r]
Shrink: if nums[mid] < target → l = mid+1
        else                  → r = mid

### 3. Find min in rotated array
Invariant: At every search / call you will know which side of the array is sorted (left vs right). Why?
Invariant: min ∈ [l, r]
Shrink: if nums[mid] > nums[r] → l = mid+1
        else                   → r = mid

### 4. Search in rotated array
Invariant: target ∈ sorted half
Shrink: choose side based on sortedness and target range


### Invariants Code for BS!

🧠 Rotated Search Version — What’s Added/Changed?
Here’s the same code with only the important differences highlighted:


```python
def search(nums, target):
    l, r = 0, len(nums) - 1

    while l <= r:
        mid = (l + r) // 2

        if nums[mid] == target:
            return mid

        # 🔥 NEW: check if LEFT half is sorted
        if nums[l] <= nums[mid]:  # 🟢 This line is NEW
            # 🧠 Invariant: if left half is sorted,
            # check if target is in that half
            if nums[l] <= target < nums[mid]:  # 🔍 NEW conditional range check
                r = mid - 1  # 👈 move left
            else:
                l = mid + 1  # 👈 move right

        else:
            # 🔥 ELSE → right half is sorted
            if nums[mid] < target <= nums[r]:  # 🔍 check right side range
                l = mid + 1
            else:
                r = mid - 1

    return -1
```


## ✅ 1. Off-by-One Errors (OB1)
- Use correct mid formula
- Decide on `<=` vs `<` loop
- Confirm whether to include or skip `mid`

## ✅ 2. Empty Input
- Check `if not nums: return ...`
- Validate empty tree (`if not root`)
- Prevent index out of bounds

## ✅ 3. Single / Tiny Inputs
- Handle `n=0`, `n=1`, size-2 edge conditions
- Greedy decisions must work on 1 element

## ✅ 4. Duplicates
- Skip duplicates in loops (e.g., 3Sum)
- Use `set()` or check previous element

## ✅ 5. Overflow / Underflow
- Use `l + (r - l) // 2` in lower-level languages
- Be careful with division and indexing

## ✅ 6. Modify While Iterating
- Avoid changing list/map during loop
- Iterate over `.copy()` or precompute

## ✅ 7. Loop Termination
- Confirm it always ends
- Include/exclude correct bounds

## ✅ 8. Mutability Bugs
- Clone lists/maps before modifying
- Avoid shared references in recursion

## ✅ 9. Base Case Bugs
- Always handle empty input
- Confirm recursive/DP base cases

## ✅ 10. Sorting Assumptions
- Don’t assume input is sorted unless stated
- Sort explicitly if needed

## ✅ 11. Weird Inputs
- Negative numbers
- `K = 0`, empty targets, empty word list
- Repeating characters in strings

---

# 📦 Space Complexity Cheatsheet

## ✅ O(1) – Constant Space
- Only a fixed number of variables used
- Examples:
  - Two pointers
  - Loop counters
  - Fixed-size arrays (like [0] * 26)

## ⚠️ O(n) – Linear Space
- Space grows linearly with input
- Examples:
  - Dictionary holding `n` items
  - Set tracking all input values
  - Recursion that goes n deep

## 🔁 O(log n) – Logarithmic Space
- Typically recursive binary search or divide-and-conquer
- Stack depth = log₂(n)

## 🧱 O(n²) – Quadratic Space
- 2D DP tables or adjacency matrices

## ❗ Rule of Thumb:
- Look at whether the memory usage grows **with the input**


## 🧠 Phrases to Use in Interviews

> “Let’s handle the edge case: what if the input is empty?”
>  
> “We preserve the invariant throughout by shrinking without cutting out the answer.”
>
> “We avoid off-by-one errors by checking whether to include `mid` or not.”
>
> “Since lists are mutable, I clone the path to avoid side effects across branches.”
