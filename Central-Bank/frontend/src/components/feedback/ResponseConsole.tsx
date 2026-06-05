import React, { useState } from 'react';
import { Terminal, X } from 'lucide-react';

// For the prototype/simulation, a small dockable console to view raw API responses
export const ResponseConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Hidden by default unless enabled via env
  if (!import.meta.env.VITE_DEV_TOOLS) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: isOpen ? 0 : '16px',
      right: isOpen ? 0 : '16px',
      width: isOpen ? '100%' : 'auto',
      maxWidth: isOpen ? '100%' : '60px',
      height: isOpen ? '300px' : 'auto',
      backgroundColor: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: isOpen ? '12px 12px 0 0' : '50%',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.2s',
      overflow: 'hidden'
    }}>
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Open API Console"
        >
          <Terminal size={24} />
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', backgroundColor: '#1e293b', color: 'white', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              <Terminal size={16} /> API Response Console
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#0f172a', color: '#a8c7fa', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            <p style={{ color: '#666' }}>// API logs would appear here in a full implementation</p>
          </div>
        </>
      )}
    </div>
  );
};
