"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement> & { onValueChange?: (value: string) => void }
>(({ className, children, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange?.(e);
        onValueChange?.(e.target.value);
    };
    return (
        <select
            ref={ref}
            className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
                className
            )}
            onChange={handleChange}
            {...props}
        >
            {children}
        </select>
    );
});
Select.displayName = "Select";

// Simple wrappers for compatibility with shadcn select API
const SelectTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
        <div ref={ref} className={cn("relative", className)} {...props}>{children}</div>
    )
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: string }) => (
    <span className="text-muted-foreground">{placeholder}</span>
);

const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{typeof children === 'string' ? children : value}</option>
);

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
