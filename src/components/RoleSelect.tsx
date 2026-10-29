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
            className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-200 flex items-center gap-1.5"
          >
            <span>Playing Role</span>
            <span className="text-amber-400 font-black" aria-hidden="true">
              *
            </span>
          </label>
          <span className="text-[11px] text-neutral-400 font-medium">
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
            className={`w-full appearance-none rounded-xl border bg-[#080b0f] px-3.5 py-3 pr-10 text-sm sm:text-base text-white transition-colors duration-150 min-h-[48px] cursor-pointer ${
              !value ? "text-neutral-500" : "text-white font-medium"
            } ${
              error
                ? "border-rose-500/80 bg-rose-950/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                : "border-neutral-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none hover:border-neutral-600"
            }`}
            {...props}
          >
            <option value="" disabled className="bg-[#0b0e14] text-neutral-400">
              Select your role (e.g., Attacker, Setter)
            </option>
            {PLAYING_ROLES.map((role) => (
              <option key={role} value={role} className="bg-[#0b0e14] text-white py-1.5">
                {role}
              </option>
            ))}
          </select>

          {/* Custom Gold Chevron Indicator */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-amber-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mt-1"
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
