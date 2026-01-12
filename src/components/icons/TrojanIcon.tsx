import React from 'react';

interface TrojanIconProps {
  className?: string;
  size?: number;
}

export function TrojanIcon({ className = "", size = 16 }: TrojanIconProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img 
        src="/assets/logos/trojanonsolana.jpg" 
        alt="Trojan" 
        className="w-full h-full object-contain rounded-full"
        onError={(e) => {
          // Fallback to Sword icon if logo not found
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      {/* Fallback Sword icon */}
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
        <polyline points="14.5,17.5 3,6 3,3 6,3 17.5,14.5"/>
        <line x1="13" y1="19" x2="19" y2="13"/>
        <line x1="16" y1="16" x2="20" y2="20"/>
        <line x1="19" y1="21" x2="21" y2="19"/>
      </svg>
    </div>
  );
}