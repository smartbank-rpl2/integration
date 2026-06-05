import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  isLoading = false,
  emptyState,
  keyExtractor
}: DataTableProps<T>) {
  
  if (isLoading && data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} style={{ height: '48px', width: '100%' }} />
        ))}
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div style={{ padding: 'var(--space-6) 0' }}>
        {emptyState || <EmptyState title="No data found" />}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <tr>
            {columns.map(col => (
              <th 
                key={col.key} 
                style={{ 
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity var(--duration-fast)', backgroundColor: 'var(--surface)' }}>
          {data.map((item, i) => (
            <tr key={keyExtractor(item, i)} style={{ borderBottom: '1px solid var(--border)' }}>
              {columns.map(col => (
                <td 
                  key={col.key}
                  style={{ 
                    textAlign: col.align || 'left',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {col.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
