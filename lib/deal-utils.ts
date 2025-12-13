/**
 * Calculate commission split amounts
 */
export function calculateCommissionSplit(
  totalCommission: number,
  propertyAgentSplit: number,
  clientAgentSplit: number
) {
  const propertyAgentAmount = (totalCommission * propertyAgentSplit) / 100;
  const clientAgentAmount = (totalCommission * clientAgentSplit) / 100;

  return {
    propertyAgentAmount,
    clientAgentAmount,
    total: totalCommission,
  };
}







