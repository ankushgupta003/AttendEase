type AttendEaseLogoProps = {
  compact?: boolean;
  className?: string;
};

export default function AttendEaseLogo({ compact = false, className }: AttendEaseLogoProps) {
  return (
    <div className={`flex flex-col items-center ${className ?? ''}`}>
      <svg width="120" height="100" viewBox="0 0 120 100" aria-hidden="true">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* A */}
        <path
          d="M20 80 L50 20 L80 80 L65 80 L50 45 L35 80 Z"
          fill="url(#grad)"
        />

        {/* E bars */}
        <rect x="70" y="25" width="35" height="10" rx="5" fill="url(#grad)" />
        <rect x="70" y="45" width="30" height="10" rx="5" fill="url(#grad)" />
        <rect x="70" y="65" width="25" height="10" rx="5" fill="url(#grad)" />
      </svg>

      {!compact && (
        <>
          <h1 className="text-xl font-semibold mt-2">
            Attend<span className="font-light">Ease</span>
          </h1>

          <p className="text-xs text-gray-500">
            Smart Attendance. Accurate Payroll.
          </p>
        </>
      )}
    </div>
  );
}
