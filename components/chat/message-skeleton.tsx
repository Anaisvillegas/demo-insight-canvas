"use client";

import { BotIcon, UserIcon, Mountain } from "lucide-react";

// Skeleton component básico
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

type Props = {
  role: "user" | "assistant";
  isLoading?: boolean;
  hasCode?: boolean;
  hasAttachments?: boolean;
};

export const MessageSkeleton = ({ 
  role, 
  isLoading = true, 
  hasCode = false, 
  hasAttachments = false 
}: Props) => {
  return (
    <div className="flex items-start gap-2 px-2 py-2 rounded-md bg-white animate-pulse">
      {/* Avatar */}
      <div
        className={`border rounded-md p-1 ${
          role === "user" ? "bg-white" : "bg-black border-black"
        }`}
      >
        {role === "user" ? (
          <UserIcon size={20} />
        ) : (
          <Mountain size={20} color="white" />
        )}
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {/* Attachments skeleton */}
        {hasAttachments && (
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        )}

        {/* Text content skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Code block skeleton */}
        {hasCode && (
          <div className="mt-4">
            <div className="bg-zinc-700 rounded-t-lg px-4 py-1">
              <Skeleton className="h-3 w-16 bg-zinc-600" />
            </div>
            <div className="bg-zinc-800 rounded-b-lg p-4 space-y-2">
              <Skeleton className="h-3 w-full bg-zinc-600" />
              <Skeleton className="h-3 w-5/6 bg-zinc-600" />
              <Skeleton className="h-3 w-4/5 bg-zinc-600" />
              <Skeleton className="h-3 w-3/4 bg-zinc-600" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Generando respuesta...</span>
          </div>
        )}
      </div>
    </div>
  );
};
