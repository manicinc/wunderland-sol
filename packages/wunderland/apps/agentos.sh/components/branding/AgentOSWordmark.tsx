"use client";

import { useId } from "react";
import clsx from "clsx";

interface AgentOSWordmarkProps {
  className?: string;
  size?: "md" | "lg";
}

export function AgentOSWordmark({ className, size = "md" }: AgentOSWordmarkProps) {
  const gradientId = useId().replace(/:/g, "-");
  const height = size === "lg" ? 48 : 40;
  const width = size === "lg" ? 192 : 160;

  return (
    <span className={clsx("theme-logo-wordmark", className)} aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 80"
        width={width}
        height={height}
        role="presentation"
      >
        <defs>
          <linearGradient id={`agentos-gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <g>
          <circle cx="30" cy="40" r="6" fill={`url(#agentos-gradient-${gradientId})`} opacity="1" />
          <circle cx="15" cy="25" r="4" fill="#6366F1" opacity="0.8" />
          <circle cx="45" cy="25" r="4" fill="#8B5CF6" opacity="0.8" />
          <circle cx="50" cy="45" r="4" fill="#EC4899" opacity="0.8" />
          <circle cx="30" cy="58" r="4" fill="#06B6D4" opacity="0.8" />
          <circle cx="10" cy="45" r="4" fill="#6366F1" opacity="0.8" />
          <line x1="30" y1="40" x2="15" y2="25" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="1.5" opacity="0.6" />
          <line x1="30" y1="40" x2="45" y2="25" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="1.5" opacity="0.6" />
          <line x1="30" y1="40" x2="50" y2="45" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="1.5" opacity="0.6" />
          <line x1="30" y1="40" x2="30" y2="58" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="1.5" opacity="0.6" />
          <line x1="30" y1="40" x2="10" y2="45" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="1.5" opacity="0.6" />
          <line x1="15" y1="25" x2="45" y2="25" stroke="#6366F1" strokeWidth="1" opacity="0.3" />
          <line x1="10" y1="45" x2="50" y2="45" stroke="#8B5CF6" strokeWidth="1" opacity="0.3" />
          <circle cx="30" cy="40" r="12" fill="none" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="0.5" opacity="0.3" />
          <circle cx="30" cy="40" r="18" fill="none" stroke={`url(#agentos-gradient-${gradientId})`} strokeWidth="0.3" opacity="0.2" />
        </g>
        <text
          x="70"
          y="45"
          fontFamily="var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="32"
          fontWeight="600"
          fill="currentColor"
        >
          Agent<tspan fill={`url(#agentos-gradient-${gradientId})`}>OS</tspan>
        </text>
      </svg>
    </span>
  );
}

export default AgentOSWordmark;
