"use client";

import { Title, AreaChart } from "@tremor/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

const dataFormatter = (number: number) => {
  return Intl.NumberFormat("us").format(number).toString();
};

export const AreaChartDemo = ({ chartData, title }: any) => {
  const { primary } = useChartColors();

  return (
    <Card>
      <CardHeader>
        <Title className="text-text-primary">{title}</Title>
      </CardHeader>
      <CardContent>
        <AreaChart
          className="h-72 mt-4"
          data={chartData}
          index="date"
          categories={["Number"]}
          colors={[primary]}
          valueFormatter={dataFormatter}
        />
      </CardContent>
    </Card>
  );
};
