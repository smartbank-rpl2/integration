import React from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`cb-button cb-button--${variant} cb-button--${size} ${isLoading ? 'cb-button--loading' : ''} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin cb-button__spinner" size={16} />}
        {!isLoading && leftIcon && <span className="cb-button__icon-left">{leftIcon}</span>}
        <span className="cb-button__content">{children}</span>
        {!isLoading && rightIcon && <span className="cb-button__icon-right">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
