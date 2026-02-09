type CmaSubject = {
  propertyName?: string;
  price?: number;
  sizeNetSqm?: number;
};

type CmaComparable = {
  price: number;
  sizeNetSqm: number;
};

type CmaSummary = {
  avgComparablePrice: number;
  avgComparablePricePerSqm: number;
  recommendedPriceRange: {
    min: number;
    max: number;
  };
};

function roundToNearest(value: number, step: number): number {
  if (!step) {
    return Math.round(value);
  }
  return Math.round(value / step) * step;
}

function buildCmaSummary(subject: CmaSubject, comparables: CmaComparable[]): CmaSummary {
  if (comparables.length === 0) {
    return {
      avgComparablePrice: subject.price || 0,
      avgComparablePricePerSqm: 0,
      recommendedPriceRange: { min: subject.price || 0, max: subject.price || 0 },
    };
  }

  const totalPrice = comparables.reduce((sum, comp) => sum + comp.price, 0);
  const totalSize = comparables.reduce((sum, comp) => sum + comp.sizeNetSqm, 0);

  const avgComparablePrice = Math.round(totalPrice / comparables.length);
  const avgComparablePricePerSqm = roundToNearest(totalPrice / totalSize, 100);

  const recommendedPriceRange = {
    min: Math.round(avgComparablePrice * 0.95),
    max: Math.round(avgComparablePrice * 1.05),
  };

  return {
    avgComparablePrice,
    avgComparablePricePerSqm,
    recommendedPriceRange,
  };
}

export { buildCmaSummary };
export type { CmaComparable, CmaSubject, CmaSummary };
