import { getBoard } from "@/actions/projects/get-board";
import React, { Suspense } from "react";

import Container from "@/app/[locale]/(routes)/components/ui/Container";
import NewSectionDialog from "./dialogs/NewSection";

import NewTaskInProjectDialog from "./dialogs/NewTaskInProject";
import { getActiveUsers } from "@/actions/get-users";
import { getBoardSections } from "@/actions/projects/get-board-sections";
import DeleteProjectDialog from "./dialogs/DeleteProject";
import { getKanbanData } from "@/actions/projects/get-kanban-data";
import Kanban from "./components/Kanban";
import { getBoards } from "@/actions/projects/get-boards";
import { getCurrentUser } from "@/lib/get-current-user";
import { Users } from "@prisma/client";
import AiAssistantProject from "./components/AiAssistantProject";
import { Lock } from "lucide-react";

interface BoardDetailProps {
  params: Promise<{ boardId: string }>;
}

export const maxDuration = 300;

const BoardPage = async (props: BoardDetailProps) => {
  const params = await props.params;
  const user = await getCurrentUser();
  const { boardId } = params;

  // Parallelize all queries for better performance
  const [board, boards, users, sections, kanbanData] = await Promise.all([
    getBoard(boardId),
    getBoards(user.id),
    getActiveUsers(),
    getBoardSections(boardId),
    getKanbanData(boardId),
  ]);

  //console.log(board, "board");
  return (
    <Container
      title={board?.board?.title}
      description={board?.board?.description}
      visibility={board?.board?.visibility}
    >
      <div className="flex justify-between py-5 w-full">
        <div className="space-x-2">
          <NewSectionDialog boardId={boardId} />
          <NewTaskInProjectDialog
            boardId={boardId}
            users={users}
            sections={sections}
          />
          <AiAssistantProject user={user} boardId={boardId} />
        </div>
        <div>
          <DeleteProjectDialog
            boardId={boardId}
            boardName={board.board.title}
          />
        </div>
      </div>
      <Kanban
        data={kanbanData.sections}
        boardId={boardId}
        boards={boards}
        users={users}
      />
    </Container>
  );
};

export default BoardPage;
