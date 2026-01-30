"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { useAppToast } from "@/hooks/use-app-toast";
import axios from "axios";
import React from "react";

const OnTestButton = () => {
  const [loading, setLoading] = React.useState(false);
  const { toast } = useAppToast();

  async function onTest() {
    setLoading(true);
    try {
      const response = await axios.get("/api/cron/send-daily-task-ai");
      //console.log(response, "response");
      toast.success("GPT model tested", { description: response.data.message, isTranslationKey: false });
    } catch (error) {
      toast.error("GPT model test failed", { isTranslationKey: false });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-col space-y-2">
      <Label>Send test</Label>
      <Button onClick={onTest} disabled={loading}>
        {loading ? <Icons.spinner className="animate-spin" /> : "Test"}
      </Button>
    </div>
  );
};

export default OnTestButton;
