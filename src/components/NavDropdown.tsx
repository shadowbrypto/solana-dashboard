import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface NavDropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  badgeVariant?: 'new' | 'beta' | 'default';
}

interface NavDropdownSection {
  title?: string;
  items: NavDropdownItem[];
}

interface NavDropdownProps {
  trigger: string;
  sections: NavDropdownSection[];
  isActive?: boolean;
}

export function NavDropdown({ trigger, sections, isActive }: NavDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        className={cn(
          "nav-item flex items-center gap-1",
          isActive && "nav-item-active"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform duration-fast",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="dropdown-menu min-w-[280px] max-h-[70vh] overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && (
                  <div className="px-3 py-2 text-caption text-muted-foreground font-medium uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    className="dropdown-item w-full text-left"
                    onClick={() => {
                      item.onClick?.();
                      setIsOpen(false);
                    }}
                  >
                    {item.icon && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        {item.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium truncate">{item.label}</span>
                        {item.badge && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded",
                            item.badgeVariant === 'new' && "bg-apple-green/10 text-apple-green",
                            item.badgeVariant === 'beta' && "bg-apple-blue/10 text-apple-blue",
                            !item.badgeVariant && "bg-muted text-muted-foreground"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-caption text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
                {sectionIndex < sections.length - 1 && (
                  <div className="my-2 border-t border-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
