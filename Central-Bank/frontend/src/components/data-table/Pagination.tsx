import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  isLoading
}) => {
  const canGoBack = currentPage > 1;
  const canGoForward = totalPages !== undefined ? currentPage < totalPages : hasMore;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) 0' }}>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        Page {currentPage} {totalPages ? `of ${totalPages}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!canGoBack || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft size={16} />}
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!canGoForward || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight size={16} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
