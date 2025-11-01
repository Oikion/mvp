import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function RegisterSSOCallback() {
  // Handle the redirect flow for SSO sign-up
  return <AuthenticateWithRedirectCallback />;
}

