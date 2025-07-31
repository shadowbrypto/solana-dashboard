# Skeleton Components Documentation

This document describes the comprehensive skeleton loading system for individual launchpad pages and other components in the sol-analytics dashboard.

## Overview

The skeleton system provides smooth loading experiences that match the exact structure and styling of the actual components. All skeletons are designed to be visually consistent with the final rendered content.

## Main Page Skeletons

### LaunchpadPageSkeleton

**Perfect skeleton for individual launchpad pages** (PumpFun, LaunchLab, etc.)

```tsx
import { LaunchpadPageSkeleton } from '@/components/LaunchpadPageSkeleton';

// Usage
{loading ? <LaunchpadPageSkeleton /> : <ActualContent />}
```

**Includes:**
- Header with logo and title
- 3 metric cards grid (Launches, Graduations, Success Rate)
- Recent Activity section (3 colorful gradient cards)
- Stacked bar chart skeleton
- Timeline chart skeleton

**Features:**
- ✅ Matches exact layout of LaunchpadPage.tsx
- ✅ Preserves gradient backgrounds and styling
- ✅ Responsive design (mobile → desktop)
- ✅ Color-coded activity cards (blue, green, purple)
- ✅ Proper spacing and padding

### DashboardPageSkeleton

**Flexible skeleton for various dashboard layouts**

```tsx
import { DashboardPageSkeleton } from '@/components/DashboardPageSkeleton';

// Usage - Full dashboard
<DashboardPageSkeleton />

// Usage - Custom configuration
<DashboardPageSkeleton
  showHeader={true}
  headerProps={{ showLogo: true, titleWidth: "w-48" }}
  showMetricCards={true}
  metricCardsCount={4}
  showCharts={true}
  chartsCount={3}
  showTables={true}
  tablesCount={2}
/>
```

**Configurable Options:**
- Header (with/without logo, custom title width)
- Metric cards (1-6 cards)
- Charts (multiple chart skeletons)
- Tables (data table skeletons)

## Component Skeletons

### RecentActivitySkeleton

**3-card activity section with gradient backgrounds**

```tsx
import { RecentActivitySkeleton } from '@/components/RecentActivitySkeleton';

// With title
<RecentActivitySkeleton showTitle={true} />

// Without title
<RecentActivitySkeleton showTitle={false} />
```

**Features:**
- Blue gradient (Last Day)
- Green gradient (Last 7 Days) 
- Purple gradient (Last 30 Days)
- Growth badge skeletons
- Metric row skeletons

### PageHeaderSkeleton

**Flexible header with logo and title options**

```tsx
import { PageHeaderSkeleton } from '@/components/PageHeaderSkeleton';

// Launchpad style (with logo)
<PageHeaderSkeleton 
  showLogo={true} 
  titleWidth="w-48" 
/>

// Dashboard style (no logo, wider title)
<PageHeaderSkeleton 
  showLogo={false} 
  titleWidth="w-64"
  showSubtitle={true}
  subtitleWidth="w-32"
/>
```

### MetricCardSkeleton

**Individual metric card skeleton** (existing component)

```tsx
import { MetricCardSkeleton } from '@/components/MetricCardSkeleton';

<MetricCardSkeleton />
```

## Chart Skeletons

All chart skeletons are available and match their respective chart components:

```tsx
import { 
  StackedBarChartSkeleton,
  TimelineChartSkeleton,
  StackedAreaChartSkeleton,
  HorizontalBarChartSkeleton,
  CombinedChartSkeleton
} from '@/components/skeletons';
```

## Usage Examples

### Individual Launchpad Page

```tsx
import { LaunchpadPageSkeleton } from '@/components/LaunchpadPageSkeleton';

export function PumpFunPage() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <LaunchpadPageSkeleton />;
  }
  
  return (
    // Actual page content
  );
}
```

### Custom Dashboard Page

```tsx
import { DashboardPageSkeleton } from '@/components/DashboardPageSkeleton';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return (
      <DashboardPageSkeleton
        headerProps={{ showLogo: false, titleWidth: "w-56" }}
        metricCardsCount={4}
        chartsCount={2}
        showTables={true}
        tablesCount={1}
      />
    );
  }
  
  return (
    // Actual page content
  );
}
```

### All Launchpads Page Enhancement

```tsx
import { RecentActivitySkeleton, PageHeaderSkeleton } from '@/components/skeletons';

export function AllLaunchpads() {
  if (loading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <PageHeaderSkeleton showLogo={true} titleWidth="w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <RecentActivitySkeleton />
        <StackedBarChartSkeleton />
        <StackedBarChartSkeleton />
      </div>
    );
  }
  
  // Actual content...
}
```

## Design Principles

### Visual Consistency
- Skeletons match exact dimensions of final content
- Preserve layouts, spacing, and responsive behavior
- Use consistent animation (pulse effect)

### Color Preservation
- Activity cards maintain gradient backgrounds
- Color-coded elements preserved (blue, green, purple themes)
- Accent lines and decorative elements included

### Responsive Design
- All skeletons adapt to screen sizes
- Grid layouts preserved across breakpoints
- Proper mobile → desktop transitions

### Performance
- Lightweight components
- Minimal DOM manipulation
- Smooth transitions from skeleton → content

## File Structure

```
src/components/
├── LaunchpadPageSkeleton.tsx      # Main launchpad page skeleton
├── DashboardPageSkeleton.tsx      # Flexible dashboard skeleton
├── RecentActivitySkeleton.tsx     # Activity cards skeleton
├── PageHeaderSkeleton.tsx         # Header skeleton
├── MetricCardSkeleton.tsx         # Individual metric card (existing)
├── skeletons/
│   └── index.ts                   # Export all skeletons
└── charts/
    ├── StackedBarChartSkeleton.tsx
    ├── TimelineChartSkeleton.tsx
    └── ...other chart skeletons
```

## Integration Status

### ✅ Implemented
- LaunchpadPageSkeleton (complete individual page skeleton)
- RecentActivitySkeleton (3-card gradient activity section)
- PageHeaderSkeleton (flexible header component)
- DashboardPageSkeleton (configurable dashboard skeleton)
- Integration with LaunchpadPage.tsx

### 🚀 Ready for Use
- All skeleton components are production-ready
- Full responsive design support
- Perfect visual matching with actual components
- Comprehensive documentation and examples

## Best Practices

1. **Always match the skeleton to the final content structure**
2. **Use specific skeletons for complex layouts** (like LaunchpadPageSkeleton)
3. **Leverage configurable skeletons** (like DashboardPageSkeleton) for flexibility
4. **Maintain consistent loading states** across the application
5. **Test skeleton → content transitions** for smooth user experience

The skeleton system provides a comprehensive foundation for excellent loading experiences throughout the sol-analytics dashboard!