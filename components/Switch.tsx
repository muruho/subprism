'use client';

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}: SwitchProps) {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      } ${isSm ? 'h-5 w-9' : 'h-6 w-11'} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
          isSm
            ? `h-3.5 w-3.5 ${checked ? 'translate-x-4' : 'translate-x-1'}`
            : `h-4.5 w-4.5 ${checked ? 'translate-x-5.5' : 'translate-x-1'}`
        }`}
      />
    </button>
  );
}
