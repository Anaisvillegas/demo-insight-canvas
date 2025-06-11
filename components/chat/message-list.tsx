"use client";

import { Models } from "@/app/types";
import { OptimizedProgressiveMessage } from "@/components/chat/progressive-message";
import { Separator } from "@/components/ui/separator";
import { ArtifactMessagePartData } from "@/lib/utils";
import { Message } from "ai";
import { RefObject } from "react";

type Props = {
  messages: Message[];
  setCurrentArtifact: (data: ArtifactMessagePartData) => void;
  containerRef: RefObject<HTMLDivElement>;
};

export const ChatMessageList = ({
  messages,
  setCurrentArtifact,
  containerRef,
}: Props) => {
  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col gap-4 max-w-3xl mx-auto w-full pt-1"
    >
      {messages.map((message, index) => (
        <div key={`message-${message.id || index}`}>
          <OptimizedProgressiveMessage
            role={message.role}
            model={Models.claude}
            text={message.content}
            attachments={message.experimental_attachments || []}
            setCurrentArtifact={setCurrentArtifact}
            isStreaming={false}
          />

          {index !== messages.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
};
