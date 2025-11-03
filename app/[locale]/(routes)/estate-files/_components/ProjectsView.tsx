import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/get-current-user";
import { getActiveUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import NewTaskDialog from "../dialogs/NewTask";
import NewProjectDialog from "../dialogs/NewProject";
import { Button } from "@/components/ui/button";
import H2Title from "@/components/typography/h2";
import { ProjectsDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";
import AiAssistant from "./AiAssistant";

const ProjectsView = async () => {
  const user = await getCurrentUser();
  const userId = user.id;

  // Parallelize queries for better performance
  const [users, boards] = await Promise.all([
    getActiveUsers(),
    getBoards(userId),
  ]);

  return (
    <>
      <div className="flex flex-wrap gap-2 py-10">
        <NewProjectDialog />
        <NewTaskDialog users={users} boards={boards} />
        <Button asChild>
          <Link href="/estate-files/tasks">All Tasks</Link>
        </Button>
        <Button asChild>
          <Link href={`/estate-files/tasks/${userId}`}>My Tasks</Link>
        </Button>
        <Button asChild>
          <Link href="/estate-files/dashboard">Dashboard</Link>
        </Button>
        <AiAssistant user={user} />
      </div>
      <div className="pt-2 space-y-3">
        <H2Title>Estate Files</H2Title>
        <ProjectsDataTable data={boards} columns={columns} />
      </div>
    </>
  );
};

export default ProjectsView;
