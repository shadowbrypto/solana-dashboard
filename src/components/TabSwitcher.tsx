interface TabSwitcherProps {
  activeTab: "charts" | "data";
  onTabChange: (tab: "charts" | "data") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
      <button
        onClick={() => onTabChange("charts")}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === "charts" ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50 hover:text-foreground'}`}
      >
        Charts
      </button>
      <button
        onClick={() => onTabChange("data")}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === "data" ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50 hover:text-foreground'}`}
      >
        Data
      </button>
    </div>
  );
}
