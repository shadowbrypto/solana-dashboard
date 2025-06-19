import { useState, useCallback } from 'react';

interface ToastState {
  id: string;
  message: string;
  variant: 'default' | 'success' | 'error';
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const addToast = useCallback((message: string, variant: 'default' | 'success' | 'error' = 'default') => {
    const id = `toast-${++toastId}`;
    const toast: ToastState = { id, message, variant };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error
  };
}