import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "./components/BaseLayout";

interface VercelInviteUserEmailProps {
  taskFromUser: string;
  username: string;
  userLanguage: string;
  taskData: any;
  boardData: any;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const UpdatedTaskFromProject = ({
  taskFromUser,
  username,
  userLanguage,
  taskData,
  boardData,
  userTheme,
}: VercelInviteUserEmailProps) => {
  const colors = resolveColors(userTheme);
  const previewText =
    userLanguage === "en"
      ? `New task from ${process.env.NEXT_PUBLIC_APP_NAME} app`
      : `Nový úkolu z aplikace  ${process.env.NEXT_PUBLIC_APP_NAME}`;

  const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/app/crm/tasks/viewtask/${taskData.id}`;

  return (
    <BaseLayout
      previewText={previewText}
      footerText={
        userLanguage === "en"
          ? `This message was intended for - ${username}.`
          : `Tato zpráva  byla určeno pro - ${username}.`
      }
      footerNote={
        userLanguage === "en"
          ? "If you were not expecting this message, you can ignore this email."
          : "Pokud jste tuto zprávu neočekávali, můžete tento e-mail ignorovat."
      }
      emailTheme={userTheme}
    >
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-normal text-center p-0 my-8 mx-0"
      >
        {userLanguage === "en"
          ? `There is a updated task from Project - ${boardData.title} module`
          : `Úkol z modulu Projekty  - ${boardData.title} - byl aktualizován`}
      </Heading>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {userLanguage === "en"
          ? `Hello ${username},`
          : `Dobrý den ${username},`}
      </Text>
      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        <strong>{taskFromUser}</strong>
        {userLanguage === "en"
          ? ` has updated a task and assigned to you. `
          : ` aktualizoval úkol a přiřadil vás k němu. `}
      </Text>
      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {userLanguage === "en"
          ? `Details you can find here: `
          : `Podrobnosti najdete zde: `}
        <strong>{taskUrl}</strong>
      </Text>
      <Section className="text-center mb-8">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-md py-3 px-4 text-xs font-semibold no-underline text-center inline-block"
          href={taskUrl}
        >
          {userLanguage === "en" ? "View task detail" : "Zobrazit úkol"}
        </Button>
      </Section>
      <Hr style={{ borderColor: colors.hrColor }} className="my-6 w-full" />
    </BaseLayout>
  );
};

export default UpdatedTaskFromProject;
