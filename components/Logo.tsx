import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hideText?: boolean;
  theme?: 'light' | 'dark';
}

export function Logo({ className = '', size = 'md', hideText = false, theme = 'light' }: LogoProps) {
  const sizes = {
    sm: { 
      text: 'text-2xl', 
      svg: 'w-6 h-6', 
      dot: '4', 
      stroke: '4', 
      sub: 'text-[6px] ml-4',
      spacing: 'mx-0'
    },
    md: { 
      text: 'text-4xl', 
      svg: 'w-10 h-10', 
      dot: '5', 
      stroke: '6', 
      sub: 'text-[9px] ml-8',
      spacing: 'mx-0.5'
    },
    lg: { 
      text: 'text-6xl', 
      svg: 'w-16 h-16', 
      dot: '6', 
      stroke: '8', 
      sub: 'text-[12px] ml-12',
      spacing: 'mx-1'
    },
  };

  const s = sizes[size];

  const textColor = theme === 'dark' ? 'text-white' : 'text-emerald-900';
  const dotColor = theme === 'dark' ? '#ffffff' : '#065f46';
  const rightBranchColor = theme === 'dark' ? '#ffffff' : '#065f46';
  const leftBranchColor = theme === 'dark' ? '#ffffff' : '#10b981';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="flex items-center">
        <span className={`${textColor} font-black ${s.text} tracking-tight`}>Cps</span>
        <svg viewBox="0 0 40 40" className={`${s.svg} ${s.spacing}`} style={{ overflow: 'visible' }}>
          {/* Left branch */}
          <path d="M 8 12 L 20 24" stroke={leftBranchColor} strokeWidth={s.stroke} strokeLinecap="round" />
          {/* Stem */}
          <path d="M 20 24 L 12 38" stroke={leftBranchColor} strokeWidth={s.stroke} strokeLinecap="round" />
          {/* Right branch */}
          <path d="M 32 4 L 20 24" stroke={rightBranchColor} strokeWidth={s.stroke} strokeLinecap="round" />
          {/* Dot */}
          <circle cx="20" cy="24" r={s.dot} fill={dotColor} />
        </svg>
        <span className={`${textColor} font-black ${s.text} tracking-tight`}>stem</span>
      </div>
      {!hideText && (
        <span className={`${textColor} font-bold tracking-[0.2em] ${s.sub} mt-[-4px]`}>
          GESTÃO FINANCEIRA INTELIGENTE
        </span>
      )}
    </div>
  );
}
