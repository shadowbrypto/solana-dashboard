import React, { useState } from 'react';
import { WeeklyHeatMap } from './WeeklyHeatMap';
import { Protocol } from '../types/protocol';
import { subDays } from 'date-fns';

/**
 * Example usage of the WeeklyHeatMap component
 * 
 * This component demonstrates how to integrate the WeeklyHeatMap
 * with your existing data and state management.
 */
export function WeeklyHeatMapExample() {
  // Initialize with yesterday as the end date (since today is excluded)
  const [endDate, setEndDate] = useState(subDays(new Date(), 1));
  
  // List of protocols to display in the heat map
  const protocols: Protocol[] = [
    "axiom",
    "bullx", 
    "photon",
    "trojan",
    "gmgnai",
    "bloom",
    "bonkbot",
    "nova",
    "soltradingbot",
    "maestro",
    "banana",
    "padre",
    "moonshot",
    "vector"
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-2">Weekly Heat Map</h1>
        <p className="text-muted-foreground">
          Visual representation of protocol metrics over the past 7 days
        </p>
      </div>
      
      <WeeklyHeatMap
        protocols={protocols}
        endDate={endDate}
        onDateChange={setEndDate}
      />
    </div>
  );
}

/**
 * Integration notes:
 * 
 * 1. The component uses the same data fetching as WeeklyMetricsTable
 * 2. It supports all four metrics: Volume, DAUs, New Users, and Trades
 * 3. The heat map color intensity represents the relative value
 * 4. Protocols can be hidden/shown using the eye icon
 * 5. The component is fully responsive and includes export functionality
 * 
 * To integrate in your app:
 * - Import the component: import { WeeklyHeatMap } from '../components/WeeklyHeatMap';
 * - Provide the required props: protocols, endDate, and onDateChange
 * - The component will handle all data fetching and visualization
 */