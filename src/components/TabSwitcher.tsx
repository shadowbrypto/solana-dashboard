interface TabSwitcherProps {
  activeTab: "charts" | "data";
  onTabChange: (tab: "charts" | "data") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex gap-1 bg-[#1C1C28] p-1 rounded-lg w-fit">
      <button
        onClick={() => onTabChange("charts")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "charts"
            ? "bg-black text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Charts
      </button>
      <button
        onClick={() => onTabChange("data")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "data"
            ? "bg-black text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Data
      </button>
    </div>
  );
}
