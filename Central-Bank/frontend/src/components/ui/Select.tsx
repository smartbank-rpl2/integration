import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import './Input.css'; // Reuse input styles for the wrapper

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helperText, id, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className={`cb-input-group ${className}`}>
        {label && (
          <label htmlFor={selectId} className="cb-input-label">
            {label}
            {props.required && <span className="cb-input-required">*</span>}
          </label>
        )}
        <div className="cb-input-wrapper">
          <select
            id={selectId}
            ref={ref}
            className={`cb-input ${hasError ? 'cb-input--error' : ''}`}
            aria-invalid={hasError}
            style={{ appearance: 'none', paddingRight: 'var(--space-10)' }}
            {...props}
          >
            {children}
          </select>
          <span className="cb-input-icon cb-input-icon--right" style={{ pointerEvents: 'none' }}>
            <ChevronDown size={18} />
          </span>
        </div>
        {error && <p className="cb-input-error">{error}</p>}
        {helperText && !error && <p className="cb-input-helper">{helperText}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
