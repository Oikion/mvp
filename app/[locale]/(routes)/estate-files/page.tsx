import React, { Suspense } from "react";
import Container from "../components/ui/Container";
import { getCurrentUser } from "@/lib/get-current-user";
import { redirect } from "next/navigation";
import ProjectsView from "./_components/ProjectsView";
import SuspenseLoading from "@/components/loadings/suspense";
import { getDictionary } from "@/dictionaries";

export const maxDuration = 300;

const ProjectsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  try {
    await getCurrentUser();
  } catch (error) {
    return redirect("/sign-in");
  }

  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <Container
      title={dict.ModuleMenu.estateFiles}
      description={dict.EstateFilesPage.description}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ProjectsView />
      </Suspense>
    </Container>
  );
};

export default ProjectsPage;
