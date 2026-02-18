'use client';

import styles from './OrnateToggle.module.scss';

interface OrnateToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function OrnateToggle({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
  className = '',
}: OrnateToggleProps) {
  const sizeClass = size !== 'md' ? styles[size] : '';

  return (
    <button
      type="button"
      className={`${styles.toggle} ${sizeClass} ${className}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <div className={`${styles.track} ${checked ? styles.trackOn : styles.trackOff}`}>
        <div className={`${styles.thumb} ${checked ? styles.thumbOn : styles.thumbOff}`} />
      </div>
      {label && (
        <span className={`${styles.label} ${checked ? styles.labelOn : styles.labelOff}`}>
          {label}
        </span>
      )}
    </button>
  );
}
