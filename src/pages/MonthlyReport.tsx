import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MonthlyReport() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Monthly Report</h1>
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Monthly report content will be displayed here</p>
        </CardContent>
      </Card>
    </div>
  );
}
