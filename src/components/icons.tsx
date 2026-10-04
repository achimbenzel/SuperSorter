// Inline-SVG-Icons für fehlende Assets (Platzhalter, siehe docs/ASSETS.md).
// Pfade nach Lucide (ISC-Lizenz), damit sie später 1:1 durch lucide-react ersetzt werden können.

interface IconProps {
  size?: number | string;
  className?: string;
}

export function RestartIcon({ size = '1em', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
