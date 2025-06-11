"use client";

import { ChatPanel } from "@/components/chat/panel";
import { SideNavBar } from "@/components/side-navbar";
import { useSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const NewChatPage = () => {
  const { session } = useSupabase();

  if (!session) redirect("/signin");

  return (
    <div className="flex gap-4 w-full h-screen max-h-screen overflow-hidden px-2 pl-0">
      <SideNavBar />

      <ChatPanel key="new-chat" id={null} />
    </div>
  );
};

export default NewChatPage;
