import { Skeleton } from "./ui/skeleton";

interface PageHeaderSkeletonProps {
  showLogo?: boolean;
  titleWidth?: string;
  showSubtitle?: boolean;
  subtitleWidth?: string;
}

export function PageHeaderSkeleton({ 
  showLogo = true, 
  titleWidth = "w-48",
  showSubtitle = false,
  subtitleWidth = "w-32"
}: PageHeaderSkeletonProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6 lg:mb-8">
      {showLogo && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted animate-pulse rounded-lg" />
      )}
      <div className="flex flex-col items-center gap-2">
        <div className={`h-8 sm:h-10 ${titleWidth} bg-muted animate-pulse rounded`} />
        {showSubtitle && (
          <div className={`h-4 ${subtitleWidth} bg-muted animate-pulse rounded`} />
        )}
      </div>
    </div>
  );
}