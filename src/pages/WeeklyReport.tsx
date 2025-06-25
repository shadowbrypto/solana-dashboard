import React, { useState } from 'react';
import { WeeklyMetricsTable } from '../components/WeeklyMetricsTable';
import { getMutableAllCategories, getMutableProtocolsByCategory } from '../lib/protocol-config';
import { Protocol } from '../types/protocol';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isAfter, isBefore, subWeeks } from 'date-fns';

export default function WeeklyReport() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Date validation - ensure we start with a valid week
  const getValidInitialDate = () => {
    const today = new Date();
    const minDate = new Date('2024-01-01');
    const maxDate = new Date();
    
    // If today is valid, use it
    if (!isBefore(today, minDate) && !isAfter(today, maxDate)) {
      return today;
    }
    
    // If today is too early, use min date
    if (isBefore(today, minDate)) {
      return minDate;
    }
    
    // If today is too late (shouldn't happen), use current week
    return maxDate;
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getValidInitialDate());

  // Get all protocols for the table
  const protocols: Protocol[] = [];
  getMutableAllCategories().forEach(categoryName => {
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    categoryProtocols.forEach(p => {
      if (!protocols.includes(p.id as Protocol)) {
        protocols.push(p.id as Protocol);
      }
    });
  });

  const handleWeekChange = (newWeek: Date) => {
    const minDate = new Date('2024-01-01');
    const maxDate = new Date();
    
    // Validate the new week is within acceptable range
    if (isBefore(newWeek, minDate) || isAfter(newWeek, maxDate)) {
      return; // Don't allow invalid dates
    }
    
    setSelectedWeek(newWeek);
  };

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl text-foreground text-center font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          Weekly Report
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </p>
      </div>

      {/* Weekly Metrics Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <WeeklyMetricsTable 
          protocols={protocols} 
          weekStart={weekStart}
          onWeekChange={handleWeekChange}
        />
      )}
    </div>
  );
}