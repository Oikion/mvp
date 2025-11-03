"use client";

import { Title, BarChart, Subtitle } from "@tremor/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

const dataFormatter = (number: number) => {
  // return number no decimal places
  return number.toFixed(0);
};

export const BarChartDemo = ({ chartData, title }: any) => {
  const { primary } = useChartColors();

  return (
    <Card className="rounded-md">
      <CardHeader>
        <Title className="text-text-primary">{title}</Title>
      </CardHeader>
      <CardContent>
        <BarChart
          className="mt-6"
          data={chartData}
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
