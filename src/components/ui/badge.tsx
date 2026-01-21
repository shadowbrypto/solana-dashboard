import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive/10 text-destructive",
        outline:
          "border border-border text-foreground",
        // Apple accent colors
        blue:
          "bg-apple-blue/10 text-apple-blue",
        green:
          "bg-apple-green/10 text-apple-green",
        red:
          "bg-apple-red/10 text-apple-red",
        orange:
          "bg-apple-orange/10 text-apple-orange",
        purple:
          "bg-apple-purple/10 text-apple-purple",
        teal:
          "bg-apple-teal/10 text-apple-teal",
        // Category badges
        telegram:
          "bg-category-telegram/10 text-category-telegram",
        terminal:
          "bg-category-terminal/10 text-category-terminal",
        mobile:
          "bg-category-mobile/10 text-category-mobile",
        evm:
          "bg-category-evm/10 text-category-evm",
        monad:
          "bg-category-monad/10 text-category-monad",
        // Ranking badges
        gold:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        silver:
          "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300",
        bronze:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
