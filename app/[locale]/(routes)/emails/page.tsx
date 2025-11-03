import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { MailComponent } from "./components/mail";
import { accounts, mails } from "@/app/[locale]/(routes)/emails/data";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getCurrentUser } from "@/lib/get-current-user";
import { getDictionary } from "@/dictionaries";
import { redirect } from "next/navigation";

const EmailRoute = async ({ params }: { params: Promise<{ locale: string }> }) => {
  try {
    await getCurrentUser();
  } catch (error) {
    return redirect("/sign-in");
  }
  
  const { locale } = await params;
  //Fetch translations from dictionary
  const dict = await getDictionary(locale);

  const cookieStore = await cookies();
  const layout = cookieStore.get("react-resizable-panels:layout");
  const collapsed = cookieStore.get("react-resizable-panels:collapsed");
  //console.log(layout, collapsed, "layout, collapsed");

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  return (
    <Container
      title={dict.ModuleMenu.emails}
      description={
        "This module is in development. Now it is only frontend demo."
      }
    >
      <Suspense fallback={<SuspenseLoading />}>
        <MailComponent
          accounts={accounts}
          mails={mails}
          defaultLayout={defaultLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={4}
        />
      </Suspense>
    </Container>
  );
};

export default EmailRoute;
