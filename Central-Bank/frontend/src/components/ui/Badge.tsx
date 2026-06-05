import React from 'react';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ 
  className = '', 
  variant = 'default',
  children, 
  ...props 
}) => {
  return (
    <span className={`cb-badge cb-badge--${variant} ${className}`} {...props}>
      {children}
    </span>
  );
};
