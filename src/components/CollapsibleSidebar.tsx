import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { protocolCategories } from "../lib/protocol-categories";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CategoryItemProps {
  name: string;
  protocols: string[];
  selectedProtocol: string;
  onSelectProtocol: (protocol: string) => void;
}

function CategoryItem({ name, protocols, selectedProtocol, onSelectProtocol }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(protocols.includes(selectedProtocol));

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
              {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
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

  const handleProtocolSelect = (protocol: string) => {
    setSearchParams((params) => {
      params.set("protocol", protocol);
      return params;
    });
  };

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
        {protocolCategories.map((category) => (
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
