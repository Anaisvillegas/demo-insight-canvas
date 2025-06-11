"use client";

import { ReactArtifact } from "@/components/artifact/react";
import { CodeBlock } from "@/components/markdown/code-block";
import Markdown from "@/components/markdown/markdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { ArtifactMessagePartData } from "@/lib/utils";
import { CheckIcon, ClipboardIcon, XIcon, SaveIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useSupabase } from "@/lib/supabase/hooks/useSupabase";
import { publishAsMaster, createArtifact } from "@/lib/artifact";
import { toast } from "react-hot-toast";
import { Props as ReactArtifactProps } from "@/components/artifact/react";
import { HTMLArtifact } from "@/components/artifact/html";

type Props = {
  artifact: ArtifactMessagePartData | null;
  isOpen: boolean;
  onClose: () => void;
  recording: boolean;
  onCapture: ReactArtifactProps["onCapture"];
};

export type ArtifactMode = "code" | "preview";

const artifactPreviewSupportedTypes = ["text/html", "application/react"];

export const ArtifactPanelPopup = ({
  artifact,
  isOpen,
  onClose,
  recording,
  onCapture,
}: Props) => {
  const [mode, setMode] = useState<ArtifactMode>("preview");
  const [isMaster, setIsMaster] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { supabase, session } = useSupabase();

  const { isCopied, copyToClipboard } = useCopyToClipboard({
    timeout: 2000,
  });

  if (!artifact) return null;

  const { type, title, language, content, generating } = artifact;

  const onCopy = () => {
    if (isCopied) return;
    copyToClipboard(content);
    toast.success("Código copiado al portapapeles");
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 h-[80vh] flex flex-col z-modal" hideCloseButton={true}>
        <div className="flex flex-col bg-white rounded-xl overflow-hidden h-full shadow-md border">
          <div className="px-4 py-3 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium truncate pr-4">{title || "Generating..."}</h3>
              <div className="flex items-center gap-2">
                {type &&
                  artifactPreviewSupportedTypes.includes(type) &&
                  !generating && (
                    <div className="bg-slate-200 rounded-md overflow-hidden">
                      <Button
                        size="sm"
                        variant={mode === "preview" ? "default" : "ghost"}
                        className="text-xs h-7 rounded-r-none"
                        onClick={() => setMode("preview")}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant={mode === "code" ? "default" : "ghost"}
                        className="text-xs h-7 rounded-l-none"
                        onClick={() => setMode("code")}
                      >
                        Code
                      </Button>
                    </div>
                  )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="h-7 w-7"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
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
          </div>
          <div className="bg-slate-50 border-t py-2 px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
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
              
              <Button
                onClick={handlePublish}
                variant="default"
                size="sm"
                className="gap-1 h-7"
                disabled={publishing || generating}
              >
                {publishing ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SaveIcon className="h-3.5 w-3.5" />
                )}
                Publicar
              </Button>
              
              <Button
                onClick={onCopy}
                variant="outline"
                size="sm"
                className="gap-1 h-7"
              >
                {isCopied ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardIcon className="h-3.5 w-3.5" />
                )}
                Copiar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
