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
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4 mr-2" />
        Settings
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Settings Manager</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Settings persistence is now active!</p>
        <p className="text-xs text-muted-foreground">
          Your preferences are automatically saved to localStorage.
        </p>
      </CardContent>
    </Card>
  );
}