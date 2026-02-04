import { getClientContacts } from "@/actions/crm/get-client-contacts";

export const getContacts = async () => {
  // Backward compatibility wrapper: returns client contacts in legacy shape
  return await getClientContacts();
};
