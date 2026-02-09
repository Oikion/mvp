type PropertyValuationInput = {
  sizeNetSqm: number;
  avgPricePerSqm: number;
  comparableCount?: number;
};

type PropertyValuationResult = {
  estimatedValue: number;
  confidenceScore: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function estimatePropertyValue(input: PropertyValuationInput): PropertyValuationResult {
  const estimatedValue = Math.round(input.sizeNetSqm * input.avgPricePerSqm);
  const comparableCount = input.comparableCount || 0;

  const confidenceFromComps = clamp(comparableCount * 10, 10, 60);
  const confidenceFromData = input.avgPricePerSqm > 0 ? 20 : 0;
  const confidenceScore = clamp(confidenceFromComps + confidenceFromData, 0, 100);

  return {
    estimatedValue,
    confidenceScore,
  };
}

export { estimatePropertyValue };
export type { PropertyValuationInput, PropertyValuationResult };
