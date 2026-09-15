import React from 'react';

interface JSILogoProps {
  size?: 'sm' | 'md' | 'lg' | 'icon';
  variant?: 'full' | 'icon' | 'dark' | 'light';
  className?: string;
}

export const JSILogo: React.FC<JSILogoProps> = ({
  size = 'md',
  variant = 'full',
  className = ''
}) => {
  // Dimensions
  const dimensions = {
    sm: { icon: 28, text: 'text-xs', subtext: 'text-[9px]' },
    md: { icon: 38, text: 'text-sm', subtext: 'text-[10px]' },
    lg: { icon: 48, text: 'text-lg', subtext: 'text-xs' },
    icon: { icon: 36, text: '', subtext: '' }
  }[size];

  const iconSvg = (
    <svg
      width={dimensions.icon}
      height={dimensions.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm"
    >
      {/* Background Badge with Soft Gradient */}
      <rect width="100" height="100" rx="22" fill="url(#jsi-navy-grad)" />
      
      {/* Decorative Gold Accent Rim */}
      <rect x="2" y="2" width="96" height="96" rx="20" stroke="url(#jsi-gold-grad)" strokeWidth="2.5" strokeOpacity="0.8" />
      
      {/* 'J' Shape */}
      <path
        d="M32 26V56C32 64.8366 39.1634 72 48 72C52.5 72 55.5 70 58 67"
        stroke="url(#jsi-gold-grad)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 'S' Dynamic Curve */}
      <path
        d="M68 35C66 30 60 27 52 27C42 27 36 33 36 41C36 50 46 52 54 55C63 58 68 62 68 70C68 79 59 83 48 83C38 83 31 77 30 71"
        stroke="#FFFFFF"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Top Right Star / Growth Dot */}
      <circle cx="72" cy="27" r="4.5" fill="#E5A823" />

      {/* Gradients Definition */}
      <defs>
        <linearGradient id="jsi-navy-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#002D62" />
          <stop offset="1" stopColor="#081A36" />
        </linearGradient>
        <linearGradient id="jsi-gold-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="0.5" stopColor="#E5A823" />
          <stop offset="1" stopColor="#C4881A" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === 'icon' || size === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{iconSvg}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {iconSvg}
      <div className="flex flex-col justify-center leading-tight min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-white font-sans ${dimensions.text}`}>
            JS investments
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            CRM
          </span>
        </div>
        <span className={`text-slate-400 font-medium tracking-wide uppercase ${dimensions.subtext}`}>
          Business Development
        </span>
      </div>
    </div>
  );
};
