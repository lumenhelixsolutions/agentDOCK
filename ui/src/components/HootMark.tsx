/** Compact owl mark for sidebar / chrome */
export default function HootMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="hootMarkGrad" x1="8" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5c878" />
          <stop offset="1" stopColor="#c8872e" />
        </linearGradient>
        <linearGradient id="hootMarkFace" x1="14" y1="16" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a1410" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="12" fill="url(#hootMarkGrad)" />
      <path
        d="M10 14 L14 8 L18 14 M22 14 L26 8 L30 14"
        stroke="#0a0a0a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="20" cy="22" rx="11" ry="10" fill="url(#hootMarkFace)" />
      <circle cx="15.5" cy="21" r="2.8" fill="#f0b56a" />
      <circle cx="24.5" cy="21" r="2.8" fill="#f0b56a" />
      <circle cx="15.8" cy="21.3" r="1.2" fill="#0a0a0a" />
      <circle cx="24.8" cy="21.3" r="1.2" fill="#0a0a0a" />
      <path d="M20 24 L17 27 L23 27 Z" fill="#d68f36" />
      <path d="M8 30 Q20 36 32 30" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}