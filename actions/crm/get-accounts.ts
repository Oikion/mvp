import { getClients } from "@/actions/crm/get-clients";

export const getAccounts = async () => {
  // Backward compatibility wrapper: returns client list in legacy account shape
  return await getClients();
};
