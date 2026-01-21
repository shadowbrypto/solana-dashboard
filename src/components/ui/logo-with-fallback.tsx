import { useState } from "react";
import { MonitorSmartphone, Rocket } from "lucide-react";
import { cn } from "../../lib/utils";

type LogoVariant = "protocol" | "launchpad" | "chain";
type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LogoWithFallbackProps {
  src: string;
  alt: string;
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  containerClassName?: string;
  clean?: boolean; // No background, just the logo
}

const sizeClasses: Record<LogoSize, { container: string; icon: string }> = {
  xs: { container: "w-3 h-3", icon: "h-1.5 w-1.5" },
  sm: { container: "w-4 h-4", icon: "h-2 w-2" },
  md: { container: "w-5 h-5", icon: "h-2.5 w-2.5" },
  lg: { container: "w-6 h-6", icon: "h-3 w-3" },
  xl: { container: "w-8 h-8", icon: "h-4 w-4" },
};

// Header-sized logo with custom icon fallback support
interface HeaderLogoProps {
  src: string;
  alt: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function HeaderLogo({ src, alt, fallbackIcon: FallbackIconComponent, className }: HeaderLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={cn("w-8 h-8 sm:w-10 sm:h-10 bg-muted/10 rounded-lg flex items-center justify-center ring-1 ring-border", className)}>
        {FallbackIconComponent ? (
          <FallbackIconComponent className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
        ) : (
          <MonitorSmartphone className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted/10 ring-1 ring-border", className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function FallbackIcon({ variant, className }: { variant: LogoVariant; className?: string }) {
  if (variant === "launchpad") {
    return <Rocket className={cn("opacity-50", className)} />;
  }
  return <MonitorSmartphone className={cn("opacity-50", className)} />;
}

export function LogoWithFallback({
  src,
  alt,
  variant = "protocol",
  size = "sm",
  className,
  containerClassName,
  clean = false,
}: LogoWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = sizeClasses[size];

  if (hasError) {
    return (
      <div
        className={cn(
          sizeClass.container,
          !clean && "bg-muted/20",
          "rounded-full flex items-center justify-center",
          containerClassName
        )}
      >
        <FallbackIcon variant={variant} className={sizeClass.icon} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClass.container,
        "rounded-full overflow-hidden",
        !clean && "bg-muted/10 ring-1 ring-border/20",
        containerClassName
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full object-cover", className)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// For backward compatibility with existing code
export function ProtocolLogo({ src, alt, size = "sm", clean = false }: { src: string; alt: string; size?: LogoSize; clean?: boolean }) {
  return <LogoWithFallback src={src} alt={alt} variant="protocol" size={size} clean={clean} />;
}

export function LaunchpadLogo({ src, alt, size = "sm", clean = false }: { src: string; alt: string; size?: LogoSize; clean?: boolean }) {
  return <LogoWithFallback src={src} alt={alt} variant="launchpad" size={size} clean={clean} />;
}
