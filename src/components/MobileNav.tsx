import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { X, ChevronRight, Settings, Globe, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Settings as AppSettings } from '@/lib/settings';

interface NavDropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
  badgeVariant?: 'new' | 'beta' | 'default';
  onClick?: () => void;
}

interface NavDropdownSection {
  title?: string;
  items: NavDropdownItem[];
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  protocolSections: NavDropdownSection[];
  launchpadSections: NavDropdownSection[];
  reportSections: NavDropdownSection[];
}

export function MobileNav({
  isOpen,
  onClose,
  protocolSections,
  launchpadSections,
  reportSections,
}: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);
  const [dataType, setDataType] = React.useState<'public' | 'private'>(AppSettings.getDataTypePreference());

  React.useEffect(() => {
    const unsubscribe = AppSettings.addDataTypeChangeListener((newDataType) => {
      setDataType(newDataType);
    });
    return unsubscribe;
  }, []);

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleItemClick = (item: NavDropdownItem) => {
    item.onClick?.();
    onClose();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const menuSections = [
    { id: 'protocols', title: 'Protocols', sections: protocolSections },
    { id: 'launchpads', title: 'Launchpads', sections: launchpadSections },
    { id: 'reports', title: 'Reports', sections: reportSections },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Mobile Menu Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background shadow-xl lg:hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[var(--nav-height)] border-b border-border">
          <span className="font-semibold text-lg text-foreground">Menu</span>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Accordion Sections */}
          {menuSections.map((menu) => (
            <div key={menu.id} className="border border-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary transition-colors"
                onClick={() => toggleSection(menu.id)}
              >
                <span className="font-medium text-foreground">{menu.title}</span>
                <ChevronRight className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSection === menu.id && "rotate-90"
                )} />
              </button>

              {expandedSection === menu.id && (
                <div className="bg-background">
                  {menu.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      {section.title && (
                        <div className="px-4 py-2 text-caption text-muted-foreground font-medium uppercase tracking-wider bg-muted/30">
                          {section.title}
                        </div>
                      )}
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
                          onClick={() => handleItemClick(item)}
                        >
                          {item.icon && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              {item.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-left">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Settings Link */}
          <button
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              location.pathname === '/admin/protocols'
                ? "bg-primary/10 text-primary"
                : "hover:bg-secondary text-foreground"
            )}
            onClick={() => handleNavigate('/admin/protocols')}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            dataType === 'private'
              ? "bg-apple-blue/10 text-apple-blue"
              : "bg-apple-green/10 text-apple-green"
          )}>
            {dataType === 'private' ? (
              <>
                <Shield className="w-4 h-4" />
                <span>Private Data Mode</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Public Data Mode</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
