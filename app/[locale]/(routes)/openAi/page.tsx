import { prismadb } from "@/lib/prisma";
import Container from "../components/ui/Container";
import Chat from "./components/Chat";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import Link from "next/link";
import { getDictionary } from "@/dictionaries";

const ProfilePage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const user = await getCurrentUser();
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const openAiKeyUser = await prismadb.openAi_keys.findFirst({
    where: {
      user: user.id,
    },
  });

  const openAiKeySystem = await prismadb.systemServices.findFirst({
    where: {
      name: "openAiKey",
    },
  });

  //console.log(openAiKeySystem, "openAiKeySystem");

  if (process.env.OPENAI_API_KEY && !openAiKeyUser && !openAiKeySystem)
    return (
      <Container
        title={dict.ChatGPTPage.title}
        description={dict.ChatGPTPage.description}
      >
        <div>
          <h1>{dict.ChatGPTPage.missingKeyTitle}</h1>
          <p>
            {dict.ChatGPTPage.missingKeyPrompt}{" "}
            <Link href={"/profile"} className="text-blue-500">
              {dict.ChatGPTPage.profileSettings}{" "}
            </Link>
            {dict.ChatGPTPage.toUseAssistant}
          </p>
        </div>
      </Container>
    );

  return (
    <Container
      title={dict.ChatGPTPage.title}
      description={dict.ChatGPTPage.description}
    >
      <Suspense fallback={<div>{dict.ChatGPTPage.loading}</div>}>
        <Chat />
      </Suspense>
    </Container>
  );
};

export default ProfilePage;
