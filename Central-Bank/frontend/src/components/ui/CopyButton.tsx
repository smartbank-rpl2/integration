import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, ButtonProps } from './Button';

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  value: string;
  label?: string;
  iconOnly?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ 
  value, 
  label = 'Copy', 
  iconOnly = false,
  variant = 'ghost',
  size = 'sm',
  ...props 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (iconOnly) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleCopy} 
        title={label}
        className={`px-2 ${props.className || ''}`}
        {...props}
      >
        {copied ? <Check size={16} className="text-success-600" /> : <Copy size={16} />}
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleCopy} 
      leftIcon={copied ? <Check size={16} className="text-success-600" /> : <Copy size={16} />}
      {...props}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
};
