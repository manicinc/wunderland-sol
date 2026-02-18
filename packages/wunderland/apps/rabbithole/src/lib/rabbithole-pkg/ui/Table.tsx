/**
 * Table Component
 *
 * Data table with neumorphic styling for admin lists.
 */

import React from 'react';
import { colors, borderRadius, spacing } from './tokens';

// ============================================================================
// Types
// ============================================================================

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  emptyMessage?: string;
  loading?: boolean;
  stickyHeader?: boolean;
}

// ============================================================================
// Checkbox Component
// ============================================================================

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Checkbox({ checked, indeterminate, onChange, disabled }: CheckboxProps) {
  const style: React.CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: `2px solid ${checked || indeterminate ? colors.neon.cyan : colors.border.strong}`,
    background: checked || indeterminate ? `${colors.neon.cyan}30` : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 150ms',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div
      style={style}
      onClick={() => !disabled && onChange(!checked)}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6L5 9L10 3"
            stroke={colors.neon.cyan}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {indeterminate && !checked && (
        <div
          style={{
            width: 8,
            height: 2,
            background: colors.neon.cyan,
            borderRadius: 1,
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          {[...Array(columns)].map((_, j) => (
            <td key={j} style={{ padding: spacing[4] }}>
              <div
                style={{
                  height: 16,
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${colors.bg.tertiary} 0%, ${colors.bg.hover} 50%, ${colors.bg.tertiary} 100%)`,
                  backgroundSize: '200% 100%',
                  animation: 'rh-shimmer 1.5s infinite',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
      <style>{`
        @keyframes rh-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

// ============================================================================
// Table Component
// ============================================================================

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedKeys,
  onSelectionChange,
  emptyMessage = 'No data available',
  loading = false,
  stickyHeader = false,
}: TableProps<T>) {
  const hasSelection = selectedKeys !== undefined && onSelectionChange !== undefined;

  const allSelected =
    data.length > 0 && data.every((item) => selectedKeys?.has(keyExtractor(item)));
  const someSelected = data.some((item) => selectedKeys?.has(keyExtractor(item)));

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(new Set(data.map(keyExtractor)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (item: T, checked: boolean) => {
    if (!onSelectionChange || !selectedKeys) return;
    const newKeys = new Set(selectedKeys);
    const key = keyExtractor(item);
    if (checked) {
      newKeys.add(key);
    } else {
      newKeys.delete(key);
    }
    onSelectionChange(newKeys);
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontFamily: "'Inter', sans-serif",
  };

  const headerCellStyle: React.CSSProperties = {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.text.secondary,
    background: colors.bg.primary,
    borderBottom: `1px solid ${colors.border.default}`,
    whiteSpace: 'nowrap',
    position: stickyHeader ? 'sticky' : 'static',
    top: 0,
    zIndex: 1,
  };

  const rowStyle = (isSelected: boolean): React.CSSProperties => ({
    background: isSelected ? `${colors.neon.cyan}10` : 'transparent',
    cursor: onRowClick ? 'pointer' : 'default',
    transition: 'background 150ms',
  });

  const cellStyle: React.CSSProperties = {
    padding: `${spacing[4]} ${spacing[4]}`,
    borderBottom: `1px solid ${colors.border.subtle}`,
    color: colors.text.primary,
    fontSize: '0.875rem',
  };

  const emptyStyle: React.CSSProperties = {
    padding: spacing[12],
    textAlign: 'center',
    color: colors.text.muted,
  };

  return (
    <div
      style={{
        background: colors.bg.secondary,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border.subtle}`,
        overflow: 'auto',
      }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            {hasSelection && (
              <th style={{ ...headerCellStyle, width: 40 }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...headerCellStyle,
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton columns={columns.length + (hasSelection ? 1 : 0)} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (hasSelection ? 1 : 0)} style={emptyStyle}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const key = keyExtractor(item);
              const isSelected = selectedKeys?.has(key) ?? false;

              return (
                <tr
                  key={key}
                  style={rowStyle(isSelected)}
                  onClick={() => onRowClick?.(item)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = colors.bg.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected
                      ? `${colors.neon.cyan}10`
                      : 'transparent';
                  }}
                >
                  {hasSelection && (
                    <td style={{ ...cellStyle, width: 40 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(checked) => handleSelectRow(item, checked)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        ...cellStyle,
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.render
                        ? col.render(item, index)
                        : ((item as Record<string, unknown>)[col.key]?.toString() ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
