import { getAssignments } from "@/actions/assignments/get-assignments";
import { AssignmentsList } from "./components/AssignmentsList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assignments | Oikion",
  description: "Manage property inquiry assignments",
};

export default async function AssignmentsPage() {
  const result = await getAssignments();

  if (!result.success) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load assignments"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <AssignmentsList initialAssignments={result.data || []} />
    </div>
  );
}
