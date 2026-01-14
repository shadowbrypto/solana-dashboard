import { useState } from "react";
import { MonitorSmartphone, Rocket } from "lucide-react";
import { cn } from "../../lib/utils";

type LogoVariant = "protocol" | "launchpad" | "chain";
type LogoSize = "xs" | "sm" | "md" | "lg";

interface LogoWithFallbackProps {
  src: string;
  alt: string;
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  containerClassName?: string;
}

const sizeClasses: Record<LogoSize, { container: string; icon: string }> = {
  xs: { container: "w-3 h-3", icon: "h-1.5 w-1.5" },
  sm: { container: "w-4 h-4", icon: "h-2 w-2" },
  md: { container: "w-5 h-5", icon: "h-2.5 w-2.5" },
  lg: { container: "w-6 h-6", icon: "h-3 w-3" },
};

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
}: LogoWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const sizeClass = sizeClasses[size];

  if (hasError) {
    return (
      <div
        className={cn(
          sizeClass.container,
          "bg-muted/20 rounded flex items-center justify-center",
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
        "bg-muted/10 rounded overflow-hidden ring-1 ring-border/20",
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
export function ProtocolLogo({ src, alt, size = "sm" }: { src: string; alt: string; size?: LogoSize }) {
  return <LogoWithFallback src={src} alt={alt} variant="protocol" size={size} />;
}

export function LaunchpadLogo({ src, alt, size = "sm" }: { src: string; alt: string; size?: LogoSize }) {
  return <LogoWithFallback src={src} alt={alt} variant="launchpad" size={size} />;
}
