import React, { Suspense } from "react";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getEmployees } from "@/actions/get-empoloyees";
import { EmployeesDataTable } from "./table-components/data-table";
import { columns } from "./table-components/columns";

const EmployeesPage = async () => {
  const users = await getEmployees();

  return (
    <Container
      title="Employees"
      description={"Everything you need to know about Human Resources"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <EmployeesDataTable data={users} columns={columns} />
      </Suspense>
    </Container>
  );
};

export default EmployeesPage;
