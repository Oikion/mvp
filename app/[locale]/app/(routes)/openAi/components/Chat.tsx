"use client";
import { useState, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export default function AiHelpCenter() {
  const [input, setInput] = useState("");
  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const stop = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setCompletion("");
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch("/api/openai/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get completion");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let result = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          result += chunk;
          setCompletion(result);
        }
      }

      toast.success("Response received");
      setInput("");
    } catch (error: unknown) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Error: no API key found");
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  //console.log(input, "input");

  return (
    <div className="mx-auto w-full h-full p-20 flex flex-col items-center justify-center gap-5 overflow-auto">
      <div className="flex items-start w-2/3">
        <form onSubmit={handleSubmit} className="w-full px-10">
          <div>
            <div>
              <input
                className="w-full  bottom-0 border border-gray-300 rounded p-2 shadow-xl"
                value={input}
                placeholder="Napište Váš dotaz ..."
                onChange={handleInputChange}
              />
            </div>
            <div className="flex gap-2 justify-end pt-5">
              <Button type="button" onClick={stop} variant={"destructive"}>
                Stop
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader className="animate-spin" /> : "Submit"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <div className=" h-full w-2/3 px-10 ">
        <div className="my-6">{completion}</div>
      </div>
    </div>
  );
}
