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
              top: `${8 + index * 8}px`,
              right: '8px',
              zIndex: 1000 - index,
              transform: `scale(${1 - index * 0.02})`,
              opacity: Math.max(0.3, 1 - index * 0.15),
              ['--toast-top' as any]: `${16 + index * 12}px`
            }}
            className="sm:!top-[var(--toast-top)] sm:!right-[16px]"
          >
            <div className="grid gap-0.5 sm:gap-1">
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
            top: `${8 + Math.min(3, toasts.length) * 8 + 45}px`,
            right: '8px',
            width: '200px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1001,
            ['--clear-top' as any]: `${16 + Math.min(3, toasts.length) * 12 + 65}px`
          }}
          className="sm:!top-[var(--clear-top)] sm:!right-[16px] sm:!w-[350px]"
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
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
            className="sm:!px-3 sm:!py-1.5 sm:!text-xs"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(249, 250, 251, 0.95)'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:!w-3 sm:!h-3">
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