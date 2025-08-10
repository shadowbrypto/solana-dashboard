import { useState, useEffect } from 'react';
import { ProtocolManagement } from '../components/ProtocolManagement';
import { PasswordProtection } from '../components/PasswordProtection';

export default function ProtocolAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated (using sessionStorage for session-based auth)
  useEffect(() => {
    const authStatus = sessionStorage.getItem('protocol-admin-auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('protocol-admin-auth', 'true');
  };

  return (
    <PasswordProtection 
      isAuthenticated={isAuthenticated} 
      onAuthenticated={handleAuthenticated}
    >
      <div className="p-1 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-2 sm:mb-6">
            <h1 className="text-lg sm:text-3xl font-bold">Trading App Administration</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-2 text-xs sm:text-base">
              Manage trading apps and their configuration
            </p>
          </div>
          
          <ProtocolManagement />
        </div>
      </div>
    </PasswordProtection>
  );
}