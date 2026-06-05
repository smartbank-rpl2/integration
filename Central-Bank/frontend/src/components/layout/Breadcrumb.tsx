import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {item.path && !isLast ? (
              <Link to={item.path} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? 'var(--text-primary)' : 'inherit', fontWeight: isLast ? 'var(--weight-medium)' : 'normal' }}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
