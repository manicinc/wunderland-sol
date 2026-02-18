/**
 * Node type registry for Atlas React Flow canvas
 * @module quarry/atlas/nodes/nodeTypes
 */

import StrandNode from './StrandNode'

export const nodeTypes = {
  strand: StrandNode,
}

export type { StrandNodeData } from './StrandNode'
