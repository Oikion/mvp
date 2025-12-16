"use server";

import { prismadb } from "@/lib/prisma";

const updateModel = async (model: any) => {
  await prismadb.gpt_models.updateMany({
    data: {
      status: "INACTIVE",
    },
  });

  await prismadb.gpt_models.update({
    where: {
      id: model,
    },
    data: {
      status: "ACTIVE",
    },
  });
};

export default updateModel;
