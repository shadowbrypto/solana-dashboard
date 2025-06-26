import React from 'react';

interface BonkBotIconProps {
  className?: string;
  size?: number;
}

export function BonkBotIcon({ className = "", size = 16 }: BonkBotIconProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img 
        src="/assets/logos/bonkbot-logo.jpg" 
        alt="BonkBot" 
        className="w-full h-full object-contain rounded-full"
        onError={(e) => {
          // Fallback to Bot icon if logo not found
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      {/* Fallback Bot icon */}
      <svg 
        className="w-full h-full" 
        style={{ display: 'none' }}
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </svg>
    </div>
  );
}