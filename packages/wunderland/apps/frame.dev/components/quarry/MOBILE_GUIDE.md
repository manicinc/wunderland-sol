# Quarry Codex Mobile Responsiveness Guide

## Touch Target Standards

All interactive elements follow accessibility best practices:

- **Minimum touch target**: 44px × 44px (Apple HIG, Material Design)
- **Preferred touch target**: 48px × 48px (WCAG 2.5.5 Level AAA)
- **Floating action buttons**: 56px × 56px (Material Design spec)

## Breakpoints

Using Tailwind's default breakpoints:

```ts
const BREAKPOINTS = {
  SM: 640,   // Small phones in landscape, large phones in portrait
  MD: 768,   // Tablets in portrait
  LG: 1024,  // Tablets in landscape, small laptops
  XL: 1280,  // Desktop
}
```

## Component-Specific Optimizations

### CodexSidebar
- **Width**: `80vw` on mobile, `320px` on sm, `384px` on lg
- **Max width**: `400px` to prevent oversized sidebar on tablets
- **Transform**: Slides in/out with `translate-x-0` / `-translate-x-full`
- **Backdrop**: Black overlay with blur on mobile only
- **Auto-close**: Sidebar closes after file selection on mobile

### MobileToggle (FAB)
- **Size**: 56px × 56px (Material Design spec)
- **Position**: Fixed bottom-right with 24px margin
- **Z-index**: 50 (above content, below modals)
- **Animation**: Scale on hover/tap for tactile feedback
- **Hidden**: `md:hidden` - only visible on mobile

### SearchBar
- **Input height**: 44px minimum for touch
- **Filter buttons**: 44px × 44px touch targets
- **Expandable panel**: Smooth height animation
- **Keyboard**: Enter to search, Esc to clear

### CodexContent
- **Padding**: `p-4` on mobile, `p-6` on sm, `p-8` on lg
- **Typography**: Responsive prose sizing
  - Mobile: `prose-sm` (14px base)
  - Tablet: `prose-base` (16px base)
  - Desktop: `prose-lg` (18px base)
- **Max width**: `4xl` (896px) for optimal reading

### CodexMetadataPanel
- **Desktop**: Fixed right sidebar, 320px width
- **Mobile**: Hidden on < lg, consider bottom sheet for future
- **Collapsible**: Animates width to 0 when closed

### CodexToolbar
- **Button height**: 44px minimum
- **Gap**: 8px between buttons (easy to tap)
- **Wrap**: `flex-wrap` so buttons stack on narrow screens
- **Icons**: 16px (w-4 h-4) for clarity at small sizes

## Scroll Behavior

- **Overscroll**: `overscroll-contain` on all scrollable areas
- **Momentum**: Native smooth scrolling on iOS/Android
- **Nested scroll**: Sidebar and content scroll independently

## Touch Gestures

Current support:
- **Tap**: Select file/folder
- **Long press**: (Future) Context menu
- **Swipe**: (Future) Sidebar swipe-to-close

## Performance Optimizations

- **Lazy loading**: Metadata panel loads on demand
- **Pagination**: Initial 50 items, load more on scroll
- **Debouncing**: 300ms for search input
- **Memoization**: React.useMemo for expensive filters

## Testing Checklist

- [ ] iPhone SE (375px) - smallest modern phone
- [ ] iPhone 14 Pro (393px) - standard phone
- [ ] iPad Mini (768px) - small tablet
- [ ] iPad Pro (1024px) - large tablet
- [ ] Landscape orientation on all devices
- [ ] Touch targets meet 44px minimum
- [ ] Text is readable without zoom
- [ ] No horizontal scroll
- [ ] Keyboard opens without breaking layout

## Known Issues

None currently. All components are mobile-optimized.

## Future Enhancements

- Bottom sheet for metadata panel on mobile
- Swipe gestures for sidebar
- Pull-to-refresh for content
- Haptic feedback on interactions (iOS)
- Dark mode auto-switch based on time



