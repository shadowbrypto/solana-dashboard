import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getMutableAllCategoriesIncludingEVM, getMutableProtocolsByCategoryIncludingEVM, loadProtocolConfigurations, getMutableProtocolConfigs, getProtocolLogoFilename } from "../lib/protocol-config";
import { getAllLaunchpads, getLaunchpadLogoFilename } from "../lib/launchpad-config";
import { ChevronDown, ChevronRight, Rocket } from "lucide-react";

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
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left hover:bg-gray-700 rounded-md"
      >
        <span>{name}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {protocols.map((protocol) => (
            <button
              key={protocol}
              onClick={() => onSelectProtocol(protocol)}
              className={`
                flex items-center gap-3 w-full px-4 py-2 text-sm text-left rounded-md transition-colors
                ${selectedProtocol === protocol ? 'bg-gray-700' : 'hover:bg-gray-700'}
              `}
            >
              <div className="w-6 h-6 bg-gray-600 rounded-md overflow-hidden ring-1 ring-gray-500 flex-shrink-0">
                <img 
                  src={`/assets/logos/${getLogoFilename(protocol)}`}
                  alt={getProtocolDisplayName(protocol)} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const container = target.parentElement;
                    if (container) {
                      container.innerHTML = '';
                      container.className = 'w-6 h-6 bg-gray-600 rounded-md flex items-center justify-center';
                      const iconEl = document.createElement('div');
                      if (isLaunchpad) {
                        iconEl.innerHTML = '<svg class="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                      } else {
                        iconEl.innerHTML = '<svg class="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                      }
                      container.appendChild(iconEl);
                    }
                  }}
                />
              </div>
              <span className="truncate">{getProtocolDisplayName(protocol)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollapsibleSidebar() {
  console.log('CollapsibleSidebar component loaded');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedProtocol = searchParams.get("protocol")?.toLowerCase() || "bullx";
  const selectedLaunchpad = searchParams.get("launchpad")?.toLowerCase();
  const [categories, setCategories] = useState<Array<{name: string, protocols: string[]}>>([]);
  const [launchpads, setLaunchpads] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('useEffect in CollapsibleSidebar running');
    const loadCategories = async () => {
      try {
        console.log('Starting loadCategories');
        await loadProtocolConfigurations();
        const categoryNames = getMutableAllCategoriesIncludingEVM();
        const categoryData = categoryNames.map(name => ({
          name,
          protocols: getMutableProtocolsByCategoryIncludingEVM(name).map(p => p.id)
        }));
        setCategories(categoryData);
        
        // Load launchpads
        console.log('About to call getAllLaunchpads');
        try {
          const allLaunchpads = getAllLaunchpads();
          console.log('All launchpads loaded:', allLaunchpads);
          const launchpadIds = allLaunchpads.map(l => l.id);
          console.log('Launchpad IDs:', launchpadIds);
          
          // Force show pumpfun if no launchpads are found
          if (launchpadIds.length === 0) {
            console.log('No launchpads found, forcing pumpfun');
            setLaunchpads(['pumpfun']);
          } else {
            setLaunchpads(launchpadIds);
          }
        } catch (launchpadError) {
          console.error('Error loading launchpads:', launchpadError);
          console.log('Fallback: setting pumpfun manually');
          setLaunchpads(['pumpfun']);
        }
        
        setIsLoaded(true);
        console.log('loadCategories completed');
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
      params.delete("launchpad"); // Clear launchpad when selecting protocol
      return params;
    });
  };

  const handleLaunchpadSelect = (launchpad: string) => {
    navigate(`/launchpad?launchpad=${launchpad}`);
  };

  if (!isLoaded) {
    return (
      <div className="w-64 h-full bg-gray-800 text-white p-4">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-gray-800 text-white p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 px-4">Overview</h2>
        <button
          onClick={() => handleProtocolSelect("all")}
          className={`
            flex items-center gap-3 w-full px-4 py-2 text-sm text-left rounded-md transition-colors
            ${selectedProtocol === "all" ? 'bg-gray-700' : 'hover:bg-gray-700'}
          `}
        >
          <div className="w-6 h-6 bg-gray-600 rounded-md flex items-center justify-center ring-1 ring-gray-500 flex-shrink-0">
            <svg className="h-3 w-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="7" height="7" x="3" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="14" rx="1"/>
              <rect width="7" height="7" x="3" y="14" rx="1"/>
            </svg>
          </div>
          <span className="truncate">All Trading Apps</span>
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2 px-4">Protocols</h2>
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

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2 px-4">Launchpads</h2>
        <div className="ml-4 mt-1 space-y-1">
          <button
            onClick={() => handleLaunchpadSelect('pumpfun')}
            className={`
              flex items-center gap-3 w-full px-4 py-2 text-sm text-left rounded-md transition-colors
              ${selectedLaunchpad === 'pumpfun' ? 'bg-gray-700' : 'hover:bg-gray-700'}
            `}
          >
            <div className="w-6 h-6 bg-gray-600 rounded-md overflow-hidden ring-1 ring-gray-500 flex-shrink-0">
              <img 
                src="/assets/logos/pumpfun.jpg"
                alt="PumpFun"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const container = target.parentElement;
                  if (container) {
                    container.innerHTML = '';
                    container.className = 'w-6 h-6 bg-gray-600 rounded-md flex items-center justify-center';
                    const iconEl = document.createElement('div');
                    iconEl.innerHTML = '<svg class="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                    container.appendChild(iconEl);
                  }
                }}
              />
            </div>
            <span className="truncate">PumpFun</span>
          </button>
        </div>
      </div>
    </div>
  );
}
