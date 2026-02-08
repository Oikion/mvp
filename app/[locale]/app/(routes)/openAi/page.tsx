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

  const openAiKeyUser = await prismadb.systemServices.findFirst({
    where: {
      name: "openAiKey",
      serviceId: user.id,
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
        title={dict.chatgpt.title}
        description={dict.chatgpt.description}
      >
        <div>
          <h1>{dict.chatgpt.missingKeyTitle}</h1>
          <p>
            {dict.chatgpt.missingKeyPrompt}{" "}
            <Link href={"/profile"} className="text-blue-500">
              {dict.chatgpt.profileSettings}{" "}
            </Link>
            {dict.chatgpt.toUseAssistant}
          </p>
        </div>
      </Container>
    );

  return (
    <Container
      title={dict.chatgpt.title}
      description={dict.chatgpt.description}
    >
      <Suspense fallback={<div>{dict.chatgpt.loading}</div>}>
        <Chat />
      </Suspense>
    </Container>
  );
};

export default ProfilePage;
