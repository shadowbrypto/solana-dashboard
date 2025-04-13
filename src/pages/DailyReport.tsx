import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DailyReport() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Daily Report</h1>
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Daily report content will be displayed here</p>
        </CardContent>
      </Card>
    </div>
  );
}
