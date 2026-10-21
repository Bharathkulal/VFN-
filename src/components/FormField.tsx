"use client";

import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  prefixElement?: React.ReactNode;
  isRequired?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      id,
      error,
      hint,
      prefixElement,
      isRequired = true,
      className = "",
      ...props
    },
    ref
  ) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-xs sm:text-sm font-bold tracking-wide uppercase text-neutral-800 flex items-center gap-1.5"
          >
            <span>{label}</span>
            {isRequired && (
              <span className="text-emerald-700 font-bold" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {hint && !error && (
            <span id={hintId} className="text-[11px] text-neutral-500 font-medium">
              {hint}
            </span>
          )}
        </div>

        <div className="relative rounded-xl shadow-xs">
          {prefixElement && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 font-semibold text-sm">
              {prefixElement}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 min-h-[48px] ${
              prefixElement ? "pl-14 sm:pl-16" : ""
            } ${
              error
                ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                : "border-neutral-300 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none hover:border-neutral-400"
            } ${className}`}
            {...props}
          />
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 mt-1"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
