import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
}

export function SafeImage({ 
  src, 
  alt, 
  className = '', 
  fallbackIcon,
  fallbackText 
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallbackIcon || (
          <div className="text-xs font-medium text-muted-foreground">
            {fallbackText || alt.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setHasError(true);
        setIsLoading(false);
      }}
      onLoad={() => setIsLoading(false)}
      style={{ 
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
    />
  );
}