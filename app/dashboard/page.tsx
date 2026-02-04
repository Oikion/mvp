import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to locale-aware dashboard route
  redirect("/en/app");
}
