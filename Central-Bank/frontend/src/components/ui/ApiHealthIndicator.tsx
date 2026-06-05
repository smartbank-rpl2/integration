import React, { useState, useEffect } from 'react';
import { env } from '../../config/env';

export const ApiHealthIndicator: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let mounted = true;
    
    const checkHealth = async () => {
      try {
        const res = await fetch(`${env.API_BASE_URL}/health`);
        if (mounted) {
          setStatus(res.ok ? 'online' : 'offline');
        }
      } catch {
        if (mounted) setStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'var(--color-success-500)';
      case 'offline': return 'var(--color-danger-500)';
      case 'checking': return 'var(--color-warning-500)';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
      <div 
        style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: getStatusColor(),
          boxShadow: status === 'online' ? `0 0 6px ${getStatusColor()}` : 'none',
          transition: 'all var(--duration-slow) var(--ease-default)'
        }} 
        className={status === 'checking' ? 'animate-pulse' : ''}
      />
      <span>API: {status === 'checking' ? 'Checking...' : status === 'online' ? 'Online' : 'Offline'}</span>
    </div>
  );
};
