"use client";

import { ChatItem } from "@/components/side-navbar/chat-item";
import { UserSettings } from "@/components/side-navbar/user-settings";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/components/user-button";
import { getChats } from "@/lib/db";
import { useSupabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, SidebarIcon, SquarePenIcon, LayoutDashboardIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export const SideNavBar = () => {
  const [open, setOpen] = useState(false);

  const params = useParams();

  const { supabase, session } = useSupabase();
  const userId = session?.user.id;

  const {
    data: chats,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => await getChats(supabase, userId),
    enabled: !!userId,
  });

  if (open) {
    return (
      <div className="h-screen max-h-screen overflow-hidden flex flex-col gap-4 justify-between px-2 py-2 pb-4 bg-[#f9fafb] w-[200px] border-r border-[#e5e7eb]">
        <div className="flex flex-col gap-2">
          <Link href="/new" className="flex items-center justify-center">
            <Image src="/Logo_500x500.png" alt="Tecnoandina Logo" width={150} height={150} className="h-16 w-auto" />
          </Link>

          <div className="flex items-center justify-between gap-2">
            <Button onClick={() => setOpen(false)} size="icon" variant="ghost" className="text-[#1a56db] hover:bg-[#f3f4f6] hover:text-[#1e429f]">
              <SidebarIcon className="w-4 h-4" />
            </Button>

            <Button 
              size="icon" 
              variant="ghost"
              className="text-[#1a56db] hover:bg-[#f3f4f6] hover:text-[#1e429f]"
              onClick={() => {
                // Si estamos en la página de artifact-workspace, mantener en la misma página pero sin ID
                if (window.location.pathname.includes('artifact-workspace')) {
                  history.pushState({}, '', '/artifact-workspace');
                  // Forzar recarga de la página para reiniciar el componente ChatPanel
                  window.location.reload();
                } else {
                  // En otras páginas, comportamiento normal
                  window.location.href = '/new';
                }
              }}
            >
              <SquarePenIcon className="w-4 h-4" />
            </Button>

            <Link href={params.id ? `/artifact-workspace?chat=${params.id}` : "/artifact-workspace"}>
              <Button size="icon" variant="ghost" className="text-[#1a56db] hover:bg-[#f3f4f6] hover:text-[#1e429f]" title="Workspace de Artifacts">
                <LayoutDashboardIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-2 overflow-hidden">
          <span className="font-medium">Chats</span>
          {chats && (
            <div className="flex flex-col flex-1 gap-2 overflow-auto">
              {chats.map((item, index) => (
                <ChatItem
                  key={index}
                  id={item.id}
                  title={item.title}
                  selected={item.id === params.id}
                />
              ))}
            </div>
          )}

          {isLoading && <Loader2Icon className="w-4 h-4 animate-spin" />}
          {error && <p className="text-red-500">Could not fetch chats</p>}
        </div>

        
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col gap-2 justify-between px-2 py-2 pb-4 items-center border-r border-[#e5e7eb]">
      <div className="flex flex-col gap-2">
        <Link href="/new" className="flex items-center justify-center">
          <Image src="/Logo_500x500.png" alt="Tecnoandina Logo" width={150} height={150} className="h-16 w-auto" />
        </Link>

        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)} size="icon" variant="ghost" className="text-[#1a56db] hover:bg-[#f3f4f6] hover:text-[#1e429f]">
            <SidebarIcon className="w-4 h-4" />
          </Button>

          <Button 
            size="icon" 
            variant="ghost"
            className="text-[#1a56db] hover:bg-[#f3f4f6] hover:text-[#1e429f]"
            onClick={() => {
              // Si estamos en la página de artifact-workspace, mantener en la misma página pero sin ID
              if (window.location.pathname.includes('artifact-workspace')) {
                history.pushState({}, '', '/artifact-workspace');
                // Forzar recarga de la página para reiniciar el componente ChatPanel
                window.location.reload();
              } else {
                // En otras páginas, comportamiento normal
                window.location.href = '/new';
              }
            }}
          >
            <SquarePenIcon className="w-4 h-4" />
          </Button>

          <Link href={params.id ? `/artifact-workspace?chat=${params.id}` : "/artifact-workspace"}>
            <Button size="icon" variant="ghost" className="text-[#1a56db] hover:bg-[#f3f4f6] hover:text-[#1e429f]" title="Workspace de Artifacts">
              <LayoutDashboardIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        
        <UserSettings />
        <UserButton />
      </div>
    </div>
  );
};
