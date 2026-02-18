import type { StorageParameters } from '../core/contracts';

/**
 * Normalises parameter payloads into a tuple of named/object parameters and positional arrays.
 */
export const normaliseParameters = (
  parameters?: StorageParameters
): { named?: Record<string, unknown>; positional?: Array<unknown> } => {
  if (parameters == null) {
    return {};
  }

  if (Array.isArray(parameters)) {
    return { positional: parameters };
  }

  if (typeof parameters === 'object') {
    return { named: parameters as Record<string, unknown> };
  }

  // Fall back to positional when unknown primitive is provided.
  return { positional: [parameters] };
};
