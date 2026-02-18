/**
 * RabbitHole Admin UI Components
 *
 * Neumorphic component library for the admin dashboard.
 */

// Design tokens
export {
  theme,
  colors,
  shadows,
  typography,
  spacing,
  borderRadius,
  animation,
  zIndex,
} from './tokens';
export type { Theme } from './tokens';

// Badge components
export {
  Badge,
  StatusBadge,
  PriorityBadge,
  RiskBadge,
  RoleBadge,
  AssistantStatusBadge,
} from './Badge';
export type {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  StatusBadgeProps,
  PriorityBadgeProps,
  RiskBadgeProps,
  RoleBadgeProps,
  AssistantStatusBadgeProps,
} from './Badge';

// Button components
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Card components
export { Card, StatCard } from './Card';
export type { CardProps, CardVariant, CardPadding, StatCardProps } from './Card';

// Modal components
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

// Table components
export { Table } from './Table';
export type { TableProps, TableColumn } from './Table';
