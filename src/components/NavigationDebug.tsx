import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function NavigationDebug() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('NavigationDebug: Component mounted on:', location.pathname);
    
    // Test if navigation works from this component
    const testNavigation = () => {
      console.log('Testing navigation from Daily Report page...');
      try {
        navigate('/reports/weekly');
        console.log('Navigation successful');
      } catch (error) {
        console.error('Navigation failed:', error);
      }
    };

    // Add a global hotkey to test navigation
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        testNavigation();
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      console.log('NavigationDebug: Component unmounted from:', location.pathname);
    };
  }, [navigate, location.pathname]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'red',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        zIndex: 9999,
        borderRadius: '4px'
      }}
    >
      DEBUG: {location.pathname}
      <br />
      Press Ctrl+Shift+N to test navigation
      <br />
      <button 
        onClick={() => {
          console.log('Direct navigation test');
          navigate('/reports/weekly');
        }}
        style={{ marginTop: '5px', padding: '2px 6px' }}
      >
        Test Nav
      </button>
    </div>
  );
}