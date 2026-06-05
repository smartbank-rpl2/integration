import React, { forwardRef, useState, useEffect } from 'react';
import { Input, InputProps } from './Input';
import { formatMoney, parseMoneyInput } from '../../lib/money';
import { CONSTANTS } from '../../config/constants';

export interface AmountInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: string; // Minor units
  onChange: (value: string) => void;
  currency?: string;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, currency = CONSTANTS.CURRENCY, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
      // Sync external value to display value format
      if (value) {
        setDisplayValue(formatMoney(value, currency, false));
      } else {
        setDisplayValue('');
      }
    }, [value, currency]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const parsed = parseMoneyInput(raw);
      setDisplayValue(formatMoney(parsed, currency, false));
      onChange(parsed);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        leftIcon={<span className="text-secondary font-semibold text-xs">{currency}</span>}
        {...props}
      />
    );
  }
);
AmountInput.displayName = 'AmountInput';
