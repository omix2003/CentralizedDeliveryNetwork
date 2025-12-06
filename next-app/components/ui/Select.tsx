'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  value: string;
  onValueChange: (value: string, label?: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel?: string;
  setSelectedLabel?: (label: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Select({ value = '', onValueChange, children, disabled }: SelectProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  useEffect(() => {
    if (value) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleValueChange = (newValue: string, label?: string) => {
    setInternalValue(newValue);
    if (label) setSelectedLabel(label);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: value || internalValue, onValueChange: handleValueChange, open, setOpen, selectedLabel, setSelectedLabel }}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SelectTrigger({ id, children, className, disabled }: SelectTriggerProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      id={id}
      type="button"
      onClick={() => !disabled && context.setOpen(!context.open)}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

export function SelectValue({ placeholder, children }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  // If children provided, use them, otherwise show selected label or placeholder
  if (children) {
    return <>{children}</>;
  }
  
  return <span>{context.selectedLabel || context.value || placeholder || 'Select...'}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');

  if (!context.open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const isSelected = context.value === value;

  const handleClick = () => {
    const label = typeof children === 'string' ? children : React.Children.toArray(children).join('');
    context.onValueChange(value, label);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100',
        isSelected && 'bg-gray-100',
        className
      )}
    >
      {children}
    </div>
  );
}

