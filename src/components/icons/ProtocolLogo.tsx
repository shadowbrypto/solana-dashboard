import React from 'react';

interface ProtocolLogoProps {
  protocolId: string;
  protocolName: string;
  fallbackIcon: React.ComponentType<any>;
  className?: string;
  size?: number;
}

export function ProtocolLogo({ 
  protocolId, 
  protocolName, 
  fallbackIcon: FallbackIcon, 
  className = "", 
  size = 16 
}: ProtocolLogoProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img 
        src={`/src/assets/logos/${protocolId}.jpg`}
        alt={protocolName} 
        className="w-full h-full object-contain rounded-full"
        onError={(e) => {
          // Fallback to Lucide icon if logo not found
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      {/* Fallback Lucide icon */}
      <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center">
        <FallbackIcon className="w-full h-full" />
      </div>
    </div>
  );
}