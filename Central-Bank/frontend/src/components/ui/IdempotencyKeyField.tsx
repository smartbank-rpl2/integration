import React, { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { generateIdempotencyKey } from '../../lib/idempotency';

export interface IdempotencyKeyFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const IdempotencyKeyField: React.FC<IdempotencyKeyFieldProps> = ({
  value,
  onChange,
  className = ''
}) => {
  // Ensure we have a key on mount if empty
  useEffect(() => {
    if (!value) {
      onChange(generateIdempotencyKey());
    }
  }, [value, onChange]);

  const handleRefresh = () => {
    onChange(generateIdempotencyKey());
  };

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <div className="flex-1" style={{ width: '100%' }}>
        <Input
          label="Idempotency Key"
          value={value}
          readOnly
          helperText="Unique identifier to prevent duplicate submissions"
          className="font-mono text-sm"
        />
      </div>
      <Button 
        type="button" 
        variant="outline" 
        onClick={handleRefresh}
        title="Generate new key"
        style={{ marginBottom: '22px' }} 
      >
        <RefreshCw size={18} />
      </Button>
    </div>
  );
};
