import React, { useRef } from 'react';
import { Download, Copy } from 'lucide-react';
import { useComponentActions } from '../hooks/useComponentActions';
import { cn } from '../lib/utils';

interface ComponentActionsProps {
  children: React.ReactNode;
  componentName?: string;
  filename?: string;
  className?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

export function ComponentActions({
  children,
  componentName = 'Component',
  filename,
  className,
  backgroundColor = '#ffffff',
  padding = 20,
  borderRadius = 12
}: ComponentActionsProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const { downloadComponent, copyComponent } = useComponentActions({
    componentName,
    backgroundColor,
    padding,
    borderRadius
  });

  const handleDownload = () => {
    downloadComponent(componentRef.current, filename);
  };

  const handleCopy = () => {
    copyComponent(componentRef.current);
  };

  return (
    <div className={cn("relative", className)}>
      <div ref={componentRef}>
        {children}
      </div>
      
      {/* Action buttons - only visible on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 hover:opacity-100 transition-opacity duration-200 flex gap-1">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center w-6 h-6 bg-background/90 hover:bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm"
          title="Copy to clipboard"
        >
          <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
        </button>
        
        <button
          onClick={handleDownload}
          className="flex items-center justify-center w-6 h-6 bg-background/90 hover:bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm"
          title="Download as image"
        >
          <Download className="w-3 h-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}