import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getMutableAllCategoriesIncludingEVM, getMutableProtocolsByCategoryIncludingEVM, loadProtocolConfigurations, getMutableProtocolConfigs } from "../lib/protocol-config";
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
                block w-full px-4 py-2 text-sm text-left rounded-md
                ${selectedProtocol === protocol ? 'bg-gray-700' : 'hover:bg-gray-700'}
              `}
            >
              {getProtocolDisplayName(protocol)}
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
            block w-full px-4 py-2 text-sm text-left rounded-md
            ${selectedProtocol === "all" ? 'bg-gray-700' : 'hover:bg-gray-700'}
          `}
        >
          All Protocols
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
