interface LaunchpadSplitBarProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export function LaunchpadSplitBar({ data }: LaunchpadSplitBarProps) {
  // Filter out zero values and calculate total
  const filteredData = data.filter(item => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0 || filteredData.length === 0) {
    return (
      <div className="w-full h-1.5 bg-muted/30 rounded-full" />
    );
  }

  return (
    <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden flex">
      {filteredData.map((item, index) => {
        const percentage = (item.value / total) * 100;
        return (
          <div
            key={index}
            className="transition-all duration-200 hover:opacity-80"
            style={{
              width: `${percentage}%`,
              backgroundColor: item.color,
            }}
            title={`${item.name}: ${item.value} (${percentage.toFixed(1)}%)`}
          />
        );
      })}
    </div>
  );
}