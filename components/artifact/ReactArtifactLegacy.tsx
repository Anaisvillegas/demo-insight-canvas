"use client";

import SelectionTool from "@/components/selection-tool";
import React, { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Props as SelectionToolProps } from "@/components/selection-tool";

export type Props = {
  code: string;
  mode: "preview" | "code";
  recording: boolean;
  onCapture: (params: { selectionImg: string; artifactImg: string }) => void;
};

export const ReactArtifactLegacy = ({ code, mode, recording, onCapture }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleRender = () => {
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "RENDER_ARTIFACT",
        payload: {
          code,
          type: "react"
        }
      },
      "*"
    );
  };

  const handleSendCaptureMessage: SelectionToolProps["onSelect"] = (
    selection
  ) => {
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "CAPTURE_SELECTION",
        selection,
      },
      "*"
    );
  };

  const handleMessage = (event: any) => {
    if (event?.data?.type === "RENDERER_READY") {
      setIframeLoaded(true);
      handleRender();
    } else if (event?.data?.type === "RENDER_COMPLETE") {
      // Renderizado completado exitosamente
      console.log("Render completado");
    } else if (event?.data?.type === "RENDER_ERROR") {
      // Error en el renderizado
      console.error("Error en renderizado:", event.data.error);
    } else if (event?.data?.type === "SELECTION_DATA") {
      onCapture({
        selectionImg: event.data.data.selectionImg,
        artifactImg: event.data.data.artifactImg,
      });
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    handleRender();
  }, [code]);

  if (mode === "preview") {
    return (
      <>
        <div ref={contentRef} className="w-full h-full">
          <iframe
            ref={iframeRef}
            src="/renderer-frame.html"
            className="w-full h-full"
            loading="lazy"
          />
        </div>

        {recording && iframeLoaded && (
          <SelectionTool
            targetRef={contentRef}
            onSelect={handleSendCaptureMessage}
          />
        )}
      </>
    );
  }

  return (
    <SyntaxHighlighter
      language="tsx"
      style={oneDark}
      customStyle={{
        margin: 0,
        borderRadius: 0,
        width: "100%",
        overflow: "auto",
        height: "100%",
        maxHeight: "100%",
      }}
      codeTagProps={{
        style: {
          fontSize: "0.9rem",
          fontFamily: "var(--font-inter)",
        },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};
