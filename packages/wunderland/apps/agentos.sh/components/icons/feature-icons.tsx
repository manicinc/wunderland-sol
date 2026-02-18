export function TypeScriptIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3h18v18H3V3z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 16c.5.5 1.5.5 2 0s.5-1.5 0-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function OpenSourceIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function StreamingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12h3M9 12h3M15 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 8l-3 4 3 4M18 8l3 4-3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  )
}

export function MemoryIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 10h16M4 14h16" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 6v12M12 6v12M16 6v12" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="12" r="1" fill="currentColor"/>
      <circle cx="14" cy="12" r="1" fill="currentColor"/>
    </svg>
  )
}

export function MultiAgentIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="7" cy="16" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="17" cy="16" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 10.5v2M10 14l-1.5 1M14 14l1.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 14v-2a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function ExtensibleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
      <path d="M7 11v2M11 7h2M7 13v-2M17 11v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// Provide a default export so module resolution never treats this as script-only
const FeatureIconsDefault = {
  TypeScriptIcon,
  OpenSourceIcon,
  StreamingIcon,
  MemoryIcon,
  MultiAgentIcon,
  ExtensibleIcon,
};
export default FeatureIconsDefault;

