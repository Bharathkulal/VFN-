import React from "react";

interface VolleyballIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  strokeColor?: string;
  accentColor?: string;
}

export function VolleyballIcon({
  size = 24,
  className = "",
  strokeColor = "currentColor",
  accentColor = "none",
  ...props
}: VolleyballIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Outer Ball Boundary */}
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke={strokeColor}
        strokeWidth="5"
        fill={accentColor}
      />

      {/* Internal Volleyball Seams */}
      {/* Center tripartite joint */}
      {/* Panel set 1 (top-left) */}
      <path
        d="M 50 4 A 46 46 0 0 1 89.8 27 L 50 50 Z"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M 64 12 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />
      <path
        d="M 77 19 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />

      {/* Panel set 2 (right/bottom-right) */}
      <path
        d="M 89.8 27 A 46 46 0 0 1 50 96 L 50 50 Z"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M 77 81 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />
      <path
        d="M 88 52 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />

      {/* Panel set 3 (left/bottom-left) */}
      <path
        d="M 50 96 A 46 46 0 0 1 50 4 L 50 50 Z"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M 23 19 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />
      <path
        d="M 12 50 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />
      <path
        d="M 23 81 L 50 50"
        stroke={strokeColor}
        strokeWidth="3.5"
      />

      {/* Center seam hub */}
      <circle cx="50" cy="50" r="3" fill={strokeColor} />
    </svg>
  );
}

/**
 * Detailed Sports Emblem Volleyball Graphic for Hero / Intro
 */
export function VolleyballGraphic({
  size = 120,
  className = "",
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle outer glow / halo */}
      <div className="absolute inset-0 rounded-full bg-emerald-400/15 blur-xl pointer-events-none" />

      {/* Volleyball Vector */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative drop-shadow-lg"
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="#ffffff"
          stroke="#092817"
          strokeWidth="6"
        />

        {/* Panel group A */}
        <path
          d="M 60 6 C 75 22 75 38 60 60 C 45 38 45 22 60 6 Z"
          fill="#eaf6ee"
          stroke="#092817"
          strokeWidth="4.5"
        />
        <path
          d="M 60 6 C 88 18 95 38 60 60"
          stroke="#092817"
          strokeWidth="4"
        />
        <path
          d="M 60 6 C 32 18 25 38 60 60"
          stroke="#092817"
          strokeWidth="4"
        />

        {/* Panel group B (bottom right) */}
        <path
          d="M 106.8 87 C 88 80 72 72 60 60 C 78 50 94 52 106.8 87 Z"
          fill="#dcfce7"
          stroke="#092817"
          strokeWidth="4.5"
        />
        <path
          d="M 112 50 C 95 62 82 58 60 60"
          stroke="#092817"
          strokeWidth="4"
        />
        <path
          d="M 87 106.8 C 76 86 70 72 60 60"
          stroke="#092817"
          strokeWidth="4"
        />

        {/* Panel group C (bottom left) */}
        <path
          d="M 13.2 87 C 32 80 48 72 60 60 C 42 50 26 52 13.2 87 Z"
          fill="#f0fdf4"
          stroke="#092817"
          strokeWidth="4.5"
        />
        <path
          d="M 8 50 C 25 62 38 58 60 60"
          stroke="#092817"
          strokeWidth="4"
        />
        <path
          d="M 33 106.8 C 44 86 50 72 60 60"
          stroke="#092817"
          strokeWidth="4"
        />

        {/* Outer Rim Highlight */}
        <circle
          cx="60"
          cy="60"
          r="54"
          stroke="#0f4228"
          strokeWidth="5"
          strokeDasharray="2 6"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}
