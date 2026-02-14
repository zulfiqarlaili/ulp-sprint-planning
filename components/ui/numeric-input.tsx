"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Allow only digits and one decimal point */
const NUMERIC_REGEX = /^\d*\.?\d*$/;

export interface NumericInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
    ({ value, onChange, min, max, className, onFocus, onBlur, ...props }, ref) => {
        const [displayValue, setDisplayValue] = React.useState(() => String(value));
        const focusedRef = React.useRef(false);

        // Sync from parent when value changes and we're not focused (e.g. load, or after blur)
        React.useEffect(() => {
            if (!focusedRef.current) {
                setDisplayValue(String(value));
            }
        }, [value]);

        const clamp = (n: number): number => {
            if (min != null && n < min) return min;
            if (max != null && n > max) return max;
            return n;
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw !== "" && !NUMERIC_REGEX.test(raw)) return;
            setDisplayValue(raw);
            if (raw === "") {
                onChange(0);
                return;
            }
            const parsed = parseFloat(raw);
            if (!Number.isNaN(parsed)) {
                onChange(clamp(parsed));
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            focusedRef.current = false;
            const raw = displayValue.trim();
            if (raw === "" || Number.isNaN(parseFloat(raw))) {
                onChange(0);
                setDisplayValue("0");
            } else {
                const parsed = parseFloat(raw);
                const clamped = clamp(parsed);
                if (clamped !== parsed) {
                    onChange(clamped);
                    setDisplayValue(String(clamped));
                }
            }
            onBlur?.(e);
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            focusedRef.current = true;
            onFocus?.(e);
        };

        return (
            <Input
                ref={ref}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={cn(className)}
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                {...props}
            />
        );
    }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
