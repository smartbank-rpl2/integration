import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = ''
}) => {
  return (
    <div className={`cb-empty-state ${className}`} style={{ borderColor: 'var(--color-danger-200)', backgroundColor: 'var(--color-danger-50)' }}>
      <div className="cb-empty-state__icon" style={{ color: 'var(--color-danger-500)' }}>
        <AlertCircle size={48} />
      </div>
      <h3 className="cb-empty-state__title" style={{ color: 'var(--color-danger-800)' }}>{title}</h3>
      <p className="cb-empty-state__description" style={{ color: 'var(--color-danger-700)' }}>{message}</p>
      {onRetry && (
        <div className="cb-empty-state__action">
          <Button variant="danger" onClick={onRetry}>Try Again</Button>
        </div>
      )}
    </div>
  );
};
