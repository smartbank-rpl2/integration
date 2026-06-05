import React from 'react';
import { env } from '../../config/env';

export const EnvironmentBadge: React.FC = () => {
  if (!env.IS_DEV) return null;

  return (
    <div style={{ position: 'fixed', bottom: '8px', left: '8px', zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{ 
        backgroundColor: 'var(--color-warning-500)', 
        color: 'var(--color-warning-50)', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        fontSize: '10px', 
        fontWeight: 'bold',
        textTransform: 'uppercase',
        boxShadow: 'var(--shadow-sm)',
        opacity: 0.8
      }}>
        Development Mode
      </div>
    </div>
  );
};
