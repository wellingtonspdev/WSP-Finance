import React, { useState, useEffect } from 'react';
import { formatDecimalToBrl, formatBrlToNumber } from '../../lib/moneyFormat';
import { Input } from './Input';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number;
    onChange: (val: number) => void;
    error?: string;
    icon?: React.ReactNode;
}

export function MoneyInput({ value, onChange, error, icon, className, ...props }: MoneyInputProps) {
    const [displayValue, setDisplayValue] = useState<string>('');

    // Sync internal value ONLY on complete external changes (like initial load)
    useEffect(() => {
        // We don't want to reformat while typing, but if value comes from form reset, we format it.
        // If the input is currently focused, we might skip it, but let's keep it simple.
        setDisplayValue(formatDecimalToBrl(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;

        // Convert current string to number
        const num = formatBrlToNumber(raw);

        // Instead of forcing the strict R$ format on every stroke (which jumps the cursor),
        // we just let the user type numbers and commas, but for safety, 
        // we'll update the number state and format it on blur.
        setDisplayValue(raw);
        onChange(num);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // Format perfectly on blur
        setDisplayValue(formatDecimalToBrl(value));
        if (props.onBlur) props.onBlur(e);
    };

    return (
        <Input
            {...props}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            error={error}
            icon={icon}
            className={className}
            placeholder="R$ 0,00"
        />
    );
}
