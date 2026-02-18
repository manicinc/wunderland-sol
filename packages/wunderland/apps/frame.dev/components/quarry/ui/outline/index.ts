/**
 * Outline Components
 * @module codex/ui/outline
 *
 * Document outline, minimap, backlinks, and focus mode components
 */

export { default as DocumentMinimap } from './DocumentMinimap'
export type { DocumentMinimapProps, MinimapHeading } from './DocumentMinimap'

export { default as BacklinksPanel } from './BacklinksPanel'
export type { BacklinksPanelProps, Backlink, BacklinkGroup, BacklinkType } from './BacklinksPanel'

export { default as BlockReferences } from './BlockReferences'
export type { BlockReferencesProps, BlockReference, Block, ReferenceType } from './BlockReferences'

export { default as FocusMode } from './FocusMode'
export type { FocusModeProps } from './FocusMode'

export { default as HeadingAnchor, HeadingWithAnchor } from './HeadingAnchor'
export type { HeadingAnchorProps, HeadingWithAnchorProps } from './HeadingAnchor'

export { default as CollapsibleTOC } from './CollapsibleTOC'
export type { CollapsibleTOCProps, TOCHeading } from './CollapsibleTOC'

export { default as BreadcrumbTrail } from './BreadcrumbTrail'
export type { BreadcrumbTrailProps, BreadcrumbHeading } from './BreadcrumbTrail'

export { default as HeadingSearch } from './HeadingSearch'
export type { HeadingSearchProps, SearchHeading } from './HeadingSearch'

export { default as RecentSections, useRecentSections } from './RecentSections'
export type { RecentSectionsProps, RecentSection, RecentSectionsResult } from './RecentSections'

