"use client";

import React, { forwardRef } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { PLAYING_ROLES, PlayingRole } from "@/lib/validation";

interface RoleSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  value?: string;
  onChange: (val: PlayingRole) => void;
  error?: string;
  id?: string;
}

export const RoleSelect = forwardRef<HTMLSelectElement, RoleSelectProps>(
  ({ value, onChange, error, id = "playing-role-select", ...props }, ref) => {
    const errorId = `${id}-error`;

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-xs sm:text-sm font-bold tracking-wide uppercase text-neutral-800 flex items-center gap-1.5"
          >
            <span>Playing Role</span>
            <span className="text-emerald-700 font-bold" aria-hidden="true">
              *
            </span>
          </label>
          <span className="text-[11px] text-neutral-500 font-medium">
            Select on-court position
          </span>
        </div>

        <div className="relative rounded-xl shadow-xs">
          <select
            ref={ref}
            id={id}
            value={value || ""}
            onChange={(e) => onChange(e.target.value as PlayingRole)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-3 pr-10 text-sm sm:text-base text-neutral-900 transition-colors duration-150 min-h-[48px] cursor-pointer ${
              !value ? "text-neutral-400" : "text-neutral-900 font-medium"
            } ${
              error
                ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                : "border-neutral-300 focus:border-[#0a2e1b] focus:ring-2 focus:ring-[#0a2e1b]/20 focus:outline-none hover:border-neutral-400"
            }`}
            {...props}
          >
            <option value="" disabled>
              Select your role (e.g., Spiker, Setter)
            </option>
            {PLAYING_ROLES.map((role) => (
              <option key={role} value={role} className="text-neutral-900 py-1">
                {role}
              </option>
            ))}
          </select>

          {/* Custom Chevron Indicator */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-500">
            <ChevronDown className="w-4 h-4" />
          </div>
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

RoleSelect.displayName = "RoleSelect";
