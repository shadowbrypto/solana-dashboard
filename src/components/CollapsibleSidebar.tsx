import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getMutableAllCategoriesIncludingEVM, getMutableProtocolsByCategoryIncludingEVM, loadProtocolConfigurations, getMutableProtocolConfigs, getProtocolLogoFilename } from "../lib/protocol-config";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CategoryItemProps {
  name: string;
  protocols: string[];
  selectedProtocol: string;
  onSelectProtocol: (protocol: string) => void;
}

function CategoryItem({ name, protocols, selectedProtocol, onSelectProtocol }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(protocols.includes(selectedProtocol));

  const getProtocolDisplayName = (protocolId: string) => {
    const config = getMutableProtocolConfigs().find(p => p.id === protocolId);
    return config ? config.name : protocolId.charAt(0).toUpperCase() + protocolId.slice(1);
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
                  src={`/assets/logos/${getProtocolLogoFilename(protocol)}`}
                  alt={getProtocolDisplayName(protocol)} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const container = target.parentElement;
                    if (container) {
                      container.innerHTML = '';
                      container.className = 'w-6 h-6 bg-gray-600 rounded-md flex items-center justify-center';
                      const iconEl = document.createElement('div');
                      iconEl.innerHTML = '<svg class="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProtocol = searchParams.get("protocol")?.toLowerCase() || "bullx";
  const [categories, setCategories] = useState<Array<{name: string, protocols: string[]}>>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      await loadProtocolConfigurations();
      const categoryNames = getMutableAllCategoriesIncludingEVM();
      const categoryData = categoryNames.map(name => ({
        name,
        protocols: getMutableProtocolsByCategoryIncludingEVM(name).map(p => p.id)
      }));
      setCategories(categoryData);
      setIsLoaded(true);
    };
    
    loadCategories();
  }, []);

  const handleProtocolSelect = (protocol: string) => {
    setSearchParams((params) => {
      params.set("protocol", protocol);
      return params;
    });
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
          <span className="truncate">All Protocols</span>
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
    </div>
  );
}
