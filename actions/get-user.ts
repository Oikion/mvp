import { getCurrentUser } from "@/lib/get-current-user";

export const getUser = async () => {
  return await getCurrentUser();
};
