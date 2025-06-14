"use client";

import { ReactArtifact } from "@/components/artifact/react";
import { CodeBlock } from "@/components/markdown/code-block";
import Markdown from "@/components/markdown/markdown";
import SelectionTool from "@/components/selection-tool";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { ArtifactMessagePartData } from "@/lib/utils";
import { CheckIcon, ClipboardIcon, XIcon, SaveIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useSupabase } from "@/lib/supabase/hooks/useSupabase";
import { publishAsMaster, createArtifact } from "@/lib/artifact";
import { toast } from "react-hot-toast";
import { Props as ReactArtifactProps } from "@/components/artifact/react";
import { HTMLArtifact } from "@/components/artifact/html";

type Props = {
  onClose: () => void;
  recording: boolean;
  onCapture: ReactArtifactProps["onCapture"];
} & ArtifactMessagePartData;

export type ArtifactMode = "code" | "preview";

const artifactPreviewSupportedTypes = ["text/html", "application/react"];

export const ArtifactPanel = ({
  type,
  title,
  language,
  content,
  onClose,
  recording,
  onCapture,
  generating,
}: Props) => {
  const [mode, setMode] = useState<ArtifactMode>("code");
  const [isMaster, setIsMaster] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { supabase, session } = useSupabase();

  const { isCopied, copyToClipboard } = useCopyToClipboard({
    timeout: 2000,
  });

  const onCopy = () => {
    if (isCopied) return;
    copyToClipboard(content);
  };

  const handlePublish = async () => {
    if (!session?.user) {
      toast.error("Debes iniciar sesión para publicar");
      return;
    }

    try {
      setPublishing(true);
      
      if (isMaster) {
        // Publicar como master
        await publishAsMaster(
          supabase,
          {
            name: title || "Sin título",
            type: type || "text/html",
            code: content,
            user_id: session.user.id
          },
          session.user.id
        );
        toast.success("Artifact publicado como master correctamente");
      } else {
        // Publicar como artifact normal
        await createArtifact(
          supabase,
          {
            name: title || "Sin título",
            type: type || "text/html",
            code: content,
            user_id: session.user.id
          },
          session.user.id
        );
        toast.success("Artifact publicado correctamente");
      }
    } catch (error) {
      console.error("Error al publicar el artifact:", error);
      toast.error("Error al publicar el artifact");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Card className="w-full border-none rounded-none flex flex-col h-full max-h-full">
      <CardHeader className="bg-slate-50 rounded-lg border rounded-b-none py-2 px-4 flex flex-row items-center gap-4 justify-between space-y-0">
        <span className="font-semibold">{title || "Generating..."}</span>

        <div className="flex gap-2 items-center">
          {type &&
            artifactPreviewSupportedTypes.includes(type) &&
            !generating && (
              <Tabs
                value={mode}
                onValueChange={(value) => setMode(value as ArtifactMode)}
              >
                <TabsList className="bg-slate-200">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

          <Button onClick={onClose} size="icon" variant="ghost">
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent
        id="artifact-content"
        className="border-l border-r p-0 w-full flex-1 max-h-full overflow-hidden relative"
      >
        {type === "text/markdown" && (
          <Markdown
            text={content}
            className="h-full max-h-full overflow-auto py-4 px-4"
          />
        )}

        {type === "application/code" && language && (
          <CodeBlock
            language={language}
            value={content}
            showHeader={false}
            className="h-full max-h-full overflow-auto"
          />
        )}

        {type === "application/react" && (
          <ReactArtifact
            code={content}
            mode={mode}
            recording={recording}
            onCapture={onCapture}
          />
        )}

        {type === "text/html" && (
          <HTMLArtifact
            code={content}
            mode={mode}
            recording={recording}
            onCapture={onCapture}
          />
        )}
      </CardContent>

      <CardFooter className="bg-slate-50 border rounded-lg rounded-t-none py-2 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={handlePublish}
            variant="default"
            className="gap-2"
            disabled={publishing || generating}
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4" />
                Publicar
              </>
            )}
          </Button>
          
          {/* Toggle Switch para activar "master" */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Master</span>
            <button
              onClick={() => setIsMaster(!isMaster)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                isMaster ? "bg-green-500" : "bg-gray-300"
              }`}
              disabled={publishing || generating}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isMaster ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>
        
        <Button
          onClick={onCopy}
          size="icon"
          variant="outline"
          className="w-8 h-8"
        >
          {isCopied ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <ClipboardIcon className="w-4 h-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
