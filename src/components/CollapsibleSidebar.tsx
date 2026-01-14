import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getMutableAllCategoriesIncludingEVM, getMutableProtocolsByCategoryIncludingEVM, loadProtocolConfigurations, getMutableProtocolConfigs, getProtocolLogoFilename } from "../lib/protocol-config";
import { loadProjectedStatsConfig } from "../lib/projected-stats-config";
import { getAllLaunchpads, getLaunchpadLogoFilename } from "../lib/launchpad-config";
import { ChevronRight, LayoutGrid, Rocket, MonitorSmartphone } from "lucide-react";

// Fallback icon component for when logo fails to load
function FallbackIcon({ isLaunchpad, className }: { isLaunchpad?: boolean; className?: string }) {
  if (isLaunchpad) {
    return <Rocket className={className || "h-2.5 w-2.5 opacity-50"} />;
  }
  return <MonitorSmartphone className={className || "h-2.5 w-2.5 opacity-50"} />;
}

// Protocol logo with fallback handling
function ProtocolLogoWithFallback({
  src,
  alt,
  isSelected,
  isLaunchpad
}: {
  src: string;
  alt: string;
  isSelected: boolean;
  isLaunchpad?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-sidebar-accent-foreground/10' : 'bg-sidebar-accent/30'}`}>
        <FallbackIcon isLaunchpad={isLaunchpad} />
      </div>
    );
  }

  return (
    <div className={`w-5 h-5 rounded-md overflow-hidden flex-shrink-0 ${isSelected ? 'ring-1 ring-white/20' : 'ring-1 ring-sidebar-border/50'}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

interface CategoryItemProps {
  name: string;
  protocols: string[];
  selectedProtocol: string;
  onSelectProtocol: (protocol: string) => void;
  isLaunchpad?: boolean;
}

function CategoryItem({ name, protocols, selectedProtocol, onSelectProtocol, isLaunchpad = false }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(isLaunchpad ? true : protocols.includes(selectedProtocol));

  const getProtocolDisplayName = (protocolId: string) => {
    if (isLaunchpad) {
      const launchpads = getAllLaunchpads();
      const launchpad = launchpads.find(l => l.id === protocolId);
      return launchpad ? launchpad.name : protocolId.charAt(0).toUpperCase() + protocolId.slice(1);
    }
    const config = getMutableProtocolConfigs().find(p => p.id === protocolId);
    return config ? config.name : protocolId.charAt(0).toUpperCase() + protocolId.slice(1);
  };

  const getLogoFilename = (protocolId: string) => {
    return isLaunchpad ? getLaunchpadLogoFilename(protocolId) : getProtocolLogoFilename(protocolId);
  };

  return (
    <div className="mb-1">
      {/* Category Header - Disclosure Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center gap-2 w-full px-3 py-[7px] text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors rounded-lg hover:bg-sidebar-accent/50"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
        <span>{name}</span>
        <span className="ml-auto text-[11px] text-sidebar-foreground/30 font-normal">
          {protocols.length}
        </span>
      </button>

      {/* Protocol List */}
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pl-3 py-1 space-y-0.5">
          {protocols.map((protocol) => {
            const isSelected = selectedProtocol === protocol;
            return (
              <button
                key={protocol}
                onClick={() => onSelectProtocol(protocol)}
                className={`
                  flex items-center gap-2.5 w-full px-2.5 py-[6px] text-[13px] text-left rounded-lg transition-all duration-150
                  ${isSelected
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }
                `}
              >
                <ProtocolLogoWithFallback
                  src={`/assets/logos/${getLogoFilename(protocol)}`}
                  alt={getProtocolDisplayName(protocol)}
                  isSelected={isSelected}
                  isLaunchpad={isLaunchpad}
                />
                <span className="truncate">{getProtocolDisplayName(protocol)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CollapsibleSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedProtocol = searchParams.get("protocol")?.toLowerCase() || "bullx";
  const selectedLaunchpad = searchParams.get("launchpad")?.toLowerCase();
  const [categories, setCategories] = useState<Array<{name: string, protocols: string[]}>>([]);
  const [launchpads, setLaunchpads] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Load both configs in parallel
        await Promise.all([
          loadProtocolConfigurations(),
          loadProjectedStatsConfig()
        ]);
        const categoryNames = getMutableAllCategoriesIncludingEVM();
        const categoryData = categoryNames.map(name => ({
          name,
          protocols: getMutableProtocolsByCategoryIncludingEVM(name).map(p => p.id)
        }));
        setCategories(categoryData);

        try {
          const allLaunchpads = getAllLaunchpads();
          const launchpadIds = allLaunchpads.map(l => l.id);
          setLaunchpads(launchpadIds.length === 0 ? ['pumpfun'] : launchpadIds);
        } catch {
          setLaunchpads(['pumpfun']);
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Error in loadCategories:', error);
        setIsLoaded(true);
      }
    };

    loadCategories();
  }, []);

  const handleProtocolSelect = (protocol: string) => {
    setSearchParams((params) => {
      params.set("protocol", protocol);
      params.delete("launchpad");
      return params;
    });
  };

  const handleLaunchpadSelect = (launchpad: string) => {
    navigate(`/launchpad?launchpad=${launchpad}`);
  };

  if (!isLoaded) {
    return (
      <div className="w-60 h-full bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center justify-center h-full">
          <div className="w-5 h-5 border-2 border-sidebar-foreground/20 border-t-sidebar-foreground/60 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-2 px-2">

        {/* Overview Section */}
        <div className="mb-4">
          <div className="px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Overview
            </span>
          </div>
          <button
            onClick={() => handleProtocolSelect("all")}
            className={`
              flex items-center gap-2.5 w-full px-3 py-[7px] text-[13px] text-left rounded-lg transition-all duration-150
              ${selectedProtocol === "all"
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }
            `}
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
              selectedProtocol === "all"
                ? 'bg-blue-500 text-white'
                : 'bg-sidebar-accent/60 text-sidebar-foreground/60'
            }`}>
              <LayoutGrid className="w-3 h-3" />
            </div>
            <span>All Trading Apps</span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 mb-4 border-t border-sidebar-border/50" />

        {/* Protocols Section */}
        <div className="mb-4">
          <div className="px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Protocols
            </span>
          </div>
          {categories.map((category) => (
            <CategoryItem
              key={category.name}
              name={category.name}
              protocols={category.protocols}
              selectedProtocol={selectedProtocol}
              onSelectProtocol={handleProtocolSelect}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="mx-3 mb-4 border-t border-sidebar-border/50" />

        {/* Launchpads Section */}
        <div>
          <div className="px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Launchpads
            </span>
          </div>
          <button
            onClick={() => handleLaunchpadSelect('pumpfun')}
            className={`
              flex items-center gap-2.5 w-full px-3 py-[7px] text-[13px] text-left rounded-lg transition-all duration-150
              ${selectedLaunchpad === 'pumpfun'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }
            `}
          >
            <ProtocolLogoWithFallback
              src="/assets/logos/pumpfun.jpg"
              alt="PumpFun"
              isSelected={selectedLaunchpad === 'pumpfun'}
              isLaunchpad={true}
            />
            <span>PumpFun</span>
          </button>
        </div>
      </div>
    </div>
  );
}
