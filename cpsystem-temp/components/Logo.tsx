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
      dot: '2.5', 
      stroke: '3', 
      sub: 'text-[6px]',
      spacing: '-mx-1.5'
    },
    md: { 
      text: 'text-4xl', 
      svg: 'w-10 h-10', 
      dot: '4', 
      stroke: '5', 
      sub: 'text-[9px]',
      spacing: '-mx-2.5'
    },
    lg: { 
      text: 'text-6xl', 
      svg: 'w-16 h-16', 
      dot: '6', 
      stroke: '8', 
      sub: 'text-[12px]',
      spacing: '-mx-4'
    },
  };

  const s = sizes[size];

  const textColor = theme === 'dark' ? 'text-white' : 'text-brand-blue';
  const dotColor = theme === 'dark' ? '#00E676' : '#1E5EFF';
  const checkColor = '#00E676'; // brand-green

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="flex items-center">
        <span className={`${textColor} font-black ${s.text} tracking-tight`}>Cps</span>
        <svg viewBox="0 0 40 40" className={`${s.svg} ${s.spacing}`} style={{ overflow: 'visible' }}>
          {/* Checkmark 'y' */}
          <path d="M 12 16 L 20 28 L 36 4" fill="none" stroke={checkColor} strokeWidth={s.stroke} strokeLinecap="round" strokeLinejoin="round" />
          {/* Stem of 'y' */}
          <path d="M 20 28 L 12 42" fill="none" stroke={checkColor} strokeWidth={s.stroke} strokeLinecap="round" />
          {/* Dot */}
          <circle cx="20" cy="28" r={s.dot} fill={dotColor} />
        </svg>
        <span className={`${textColor} font-black ${s.text} tracking-tight`}>stem</span>
      </div>
      {!hideText && (
        <span className={`${textColor} font-bold tracking-[0.2em] ${s.sub} mt-1`}>
          GESTÃO FINANCEIRA INTELIGENTE
        </span>
      )}
    </div>
  );
}
