import { useToast } from "../../hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.slice(0, 3).map(function ({ id, title, description, action, ...props }, index) {
        return (
          <Toast 
            key={id} 
            {...props}
            style={{
              position: 'absolute',
              top: `${16 + index * 12}px`,
              right: '16px',
              zIndex: 1000 - index,
              transform: `scale(${1 - index * 0.02})`,
              opacity: Math.max(0.3, 1 - index * 0.15)
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      
      {/* Clear All button when there are multiple toasts */}
      {toasts.filter(toast => toast.open !== false).length > 1 && (
        <div
          style={{
            position: 'fixed',
            top: `${16 + Math.min(3, toasts.length) * 12 + 65}px`,
            right: '16px',
            width: '350px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1001,
          }}
        >
          <button
            onClick={() => {
              toasts.forEach(toast => dismiss(toast.id))
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(249, 250, 251, 0.95)'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Clear All ({toasts.length})
          </button>
        </div>
      )}
      
      <ToastViewport />
    </ToastProvider>
  )
}