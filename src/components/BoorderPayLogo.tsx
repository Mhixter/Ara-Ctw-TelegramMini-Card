import React from 'react';

interface Props {
  size?: number;
  showText?: boolean;
  textSize?: number;
  variant?: 'full' | 'icon';
}

export function BoorderPayIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bp-grad-a" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C5CE7" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="bp-grad-b" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6C5CE7" />
        </linearGradient>
        <clipPath id="bp-clip">
          <rect width="56" height="56" rx="16" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="56" height="56" rx="16" fill="url(#bp-grad-a)" />

      {/* Subtle gloss overlay */}
      <rect width="56" height="28" rx="0" fill="rgba(255,255,255,0.08)" clipPath="url(#bp-clip)" />

      {/* Globe ring — outer ellipse */}
      <ellipse cx="28" cy="28" rx="15" ry="15" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" />

      {/* Globe latitude lines */}
      <ellipse cx="28" cy="28" rx="7" ry="15" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" fill="none" />

      {/* Globe horizontal line */}
      <line x1="13" y1="28" x2="43" y2="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

      {/* Top arc */}
      <path d="M14 22 Q28 20 42 22" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />

      {/* Bottom arc */}
      <path d="M14 34 Q28 36 42 34" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />

      {/* Arrow — right-pointing with tail, white, bold */}
      <path
        d="M18 28 H36"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M30 22.5 L36.5 28 L30 33.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Small coin/circle accent at arrow start */}
      <circle cx="18" cy="28" r="3.5" fill="url(#bp-grad-b)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />
    </svg>
  );
}

export function BoorderPayWordmark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size * 4.8} height={size} viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bp-text-grad" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C5CE7" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="37"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
        fontWeight="800"
        fontSize="40"
        letterSpacing="-1"
        fill="url(#bp-text-grad)"
      >
        Border
      </text>
      <text
        x="147"
        y="37"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
        fontWeight="800"
        fontSize="40"
        letterSpacing="-1"
        fill="var(--tg-theme-text-color, #1c1c1e)"
      >
        Pay
      </text>
    </svg>
  );
}

export default function BoorderPayLogo({ size = 56, showText = true, variant = 'full' }: Props) {
  if (variant === 'icon') return <BoorderPayIcon size={size} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <BoorderPayIcon size={size} />
      {showText && <BoorderPayWordmark size={size * 0.43} />}
    </div>
  );
}
