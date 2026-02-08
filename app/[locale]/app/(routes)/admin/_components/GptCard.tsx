import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { getOrgOpenAIModel } from "@/lib/org-settings";
import { OPENAI_MODELS } from "@/lib/ai-sdk/providers";

import SetGptModel from "../forms/SetGptModel";
import OnTestButton from "./OnTestButton";

const GptCard = async () => {
  const organizationId = await getCurrentOrgId();
  const currentModelId = await getOrgOpenAIModel(organizationId);
  const currentModel = OPENAI_MODELS.find((model) => model.id === currentModelId);

  return (
    <Card className="min-w-[350px]  max-w-[450px]">
      <CardHeader className="text-lg">
        <CardTitle>AI assistant GPT model</CardTitle>
        <CardDescription className="text-xs">
          actual model:{" "}
          {
            currentModel?.name || currentModelId
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <SetGptModel models={OPENAI_MODELS} currentModelId={currentModelId} />
        <OnTestButton />
      </CardContent>
    </Card>
  );
};

export default GptCard;
