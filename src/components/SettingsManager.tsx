import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Eye, EyeOff } from 'lucide-react';

export function SettingsManager() {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 h-8 sm:h-9 px-2 sm:px-3"
      >
        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        <span className="text-xs sm:text-sm">Settings</span>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 w-72 sm:w-96 max-h-80 sm:max-h-96 overflow-y-auto shadow-lg">
      <CardHeader className="pb-2 p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-lg">Settings Manager</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
        <p className="text-xs sm:text-sm text-muted-foreground">Settings persistence is now active!</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Your preferences are automatically saved to localStorage.
        </p>
      </CardContent>
    </Card>
  );
}