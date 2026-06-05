import React, { forwardRef } from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className={`cb-input-group ${className}`}>
        {label && (
          <label htmlFor={inputId} className="cb-input-label">
            {label}
            {props.required && <span className="cb-input-required">*</span>}
          </label>
        )}
        <div className="cb-input-wrapper">
          {leftIcon && <span className="cb-input-icon cb-input-icon--left">{leftIcon}</span>}
          <input
            id={inputId}
            ref={ref}
            className={`cb-input ${hasError ? 'cb-input--error' : ''} ${leftIcon ? 'cb-input--with-left' : ''} ${rightIcon ? 'cb-input--with-right' : ''}`}
            aria-invalid={hasError}
            {...props}
          />
          {rightIcon && <span className="cb-input-icon cb-input-icon--right">{rightIcon}</span>}
        </div>
        {error && <p className="cb-input-error">{error}</p>}
        {helperText && !error && <p className="cb-input-helper">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
