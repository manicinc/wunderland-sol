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