"use client";

import { Title, BarChart } from "@tremor/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

const dataFormatter = (number: number) => {
  // return number no decimal places, handle NaN gracefully
  if (Number.isNaN(number) || number === null || number === undefined) {
    return "0";
  }
  return number.toFixed(0);
};

type ChartDataItem = {
  name: string;
  Number: number;
};

type BarChartDemoProps = {
  chartData: ChartDataItem[];
  title: string;
};

export const BarChartDemo = ({ chartData, title }: BarChartDemoProps) => {
  const { primary } = useChartColors();

  // Ensure all values are valid numbers to prevent NaN errors
  const sanitizedData = chartData.map((item) => ({
    ...item,
    Number: typeof item.Number === 'number' && !Number.isNaN(item.Number) ? item.Number : 0,
  }));

  return (
    <Card className="rounded-md">
      <CardHeader>
        <Title className="text-text-primary">{title}</Title>
      </CardHeader>
      <CardContent>
        <BarChart
          className="mt-6"
          data={sanitizedData}
          index="name"
          categories={["Number"]}
          colors={[primary]}
          valueFormatter={dataFormatter}
          yAxisWidth={48}
        />
      </CardContent>
    </Card>
  );
};
