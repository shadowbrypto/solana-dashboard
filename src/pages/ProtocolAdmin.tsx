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
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Protocol Administration</h1>
            <p className="text-muted-foreground mt-2">
              Manage protocols and their configuration
            </p>
          </div>
          
          <ProtocolManagement />
        </div>
      </div>
    </PasswordProtection>
  );
}