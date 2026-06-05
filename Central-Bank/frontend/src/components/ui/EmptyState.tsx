import React from 'react';
import { FileQuestion } from 'lucide-react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <FileQuestion size={48} className="text-muted" />,
  action,
  className = ''
}) => {
  return (
    <div className={`cb-empty-state ${className}`}>
      <div className="cb-empty-state__icon">{icon}</div>
      <h3 className="cb-empty-state__title">{title}</h3>
      {description && <p className="cb-empty-state__description">{description}</p>}
      {action && <div className="cb-empty-state__action">{action}</div>}
    </div>
  );
};
