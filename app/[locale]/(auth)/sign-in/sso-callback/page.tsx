import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignInSSOCallback() {
  // Handle the redirect flow for SSO sign-in
  return <AuthenticateWithRedirectCallback />;
}

