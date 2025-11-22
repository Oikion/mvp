"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NewPropertyWizard } from "../properties/components/NewPropertyWizard";
import { PropertyDataTable } from "../properties/table-components/data-table";
import { columns } from "../properties/table-components/columns";
import axios from "axios";

export default function PropertiesView({ data }: { data: any[] }) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    // Fetch users for the wizard
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/org/users");
        setUsers(response.data?.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);
  
  if (!isMounted) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle className="cursor-pointer">Properties</CardTitle>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={() => setOpen(false)}>
              <Button className="m-2 cursor-pointer" onClick={() => setOpen(true)}>+</Button>
              <SheetContent className="min-w-[1000px] space-y-2">
                <SheetHeader>
                  <SheetTitle>Create new Property</SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-y-auto">
                  <NewPropertyWizard
                    users={users}
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
          "No properties found"
        ) : (
          <PropertyDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
}


