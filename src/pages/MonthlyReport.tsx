import { useState } from "react";
import { MonthlyHighlights } from "../components/MonthlyHighlights";
import { MonthlyMetricsTable } from "../components/MonthlyMetricsTable";
import { getAllProtocols } from "../lib/protocol-categories";
import { Protocol } from "../types/protocol";

export default function MonthlyReport() {
  const [date, setDate] = useState<Date>(new Date());
  const protocols: Protocol[] = [...getAllProtocols(), "all"] as Protocol[];

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      <h1 className="text-2xl sm:text-3xl font-bold">Monthly Report</h1>
      <MonthlyHighlights date={date} />
      <MonthlyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
    </div>
  );
}