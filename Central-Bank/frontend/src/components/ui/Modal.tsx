import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="cb-modal-overlay" onClick={onClose}>
      <div 
        className="cb-modal-content animate-scale-in" 
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="cb-modal-header">
          <h2 className="cb-modal-title">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="cb-modal-close">
            <X size={20} />
          </Button>
        </div>
        <div className="cb-modal-body">
          {children}
        </div>
        {footer && (
          <div className="cb-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
