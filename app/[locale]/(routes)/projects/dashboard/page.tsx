import React from "react";
import Container from "../../components/ui/Container";
import ProjectDashboardCockpit from "./components/ProjectDasboard";
import { getTasksPastDue } from "@/actions/projects/get-tasks-past-due";
import { getActiveUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSections } from "@/actions/projects/get-sections";
import { Sections } from "@prisma/client";

const ProjectDashboard = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  // Parallelize all queries for better performance
  const [dashboardData, activeUsers, boards, sections] = await Promise.all([
    getTasksPastDue(),
    getActiveUsers(),
    getBoards(user?.id!),
    getSections(),
  ]);

  if (!dashboardData) {
    return <div>DashBoard data not found</div>;
  }

  return (
    <Container
      title="Dashboard"
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <ProjectDashboardCockpit
        dashboardData={dashboardData}
        users={activeUsers}
        boards={boards}
        sections={sections as Sections[]}
      />
    </Container>
  );
};

export default ProjectDashboard;
