"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Clients } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../tasks-data-table/components/columns";
import { DataTable } from "@/components/ui/data-table/data-table";

import NewTaskForm from "./NewTaskForm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

//TODO:
interface TasksViewProps {
  data: any;
  account: Clients | null;
}

const AccountsTasksView = ({ data, account }: TasksViewProps) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/app/crm/tasks")}
              className="cursor-pointer"
            >
              Tasks
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={() => setOpen(false)}>
              <Button
                className="m-2 cursor-pointer"
                onClick={() => setOpen(true)}
              >
                +
              </Button>
              <SheetContent className="min-w-[500px] space-y-2">
                <SheetHeader>
                  <SheetTitle>Create new Task</SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-y-auto">
                  <NewTaskForm
                    account={account}
                    onFinish={() => setOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No assigned tasks found"
        ) : (
          <DataTable 
            data={data} 
            columns={columns} 
            searchKey="title"
            searchPlaceholder="Filter tasks..."
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsTasksView;
