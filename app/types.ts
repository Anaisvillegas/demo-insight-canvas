import { Database } from "@/app/supabase.types";
import { Message } from "ai";

export type ChatMessageRoles = Message["role"];

export enum Models {
  claude = "claude",
  claude35Sonnet = "claude-3-5-sonnet-20240620",
  claude37Sonnet = "claude-3-7-sonnet-20250219",
  gpt4o = "gpt-4o",
  gpt4oMini = "gpt-4o-mini",
  gpt41 = "gpt-4.1",
  gpt41Mini = "gpt-4.1-mini",
  gpt41Nano = "gpt-4.1-nano",
  gpt35turbo = "gpt-3.5-turbo",
  gpt4turbo = "gpt-4-turbo",
}

export type Chat = Database["public"]["Tables"]["chats"]["Row"];

export type Attachment = {
  contentType?: string;
  url: string;
  name?: string;
};

export enum OAuthProviders {
  google = "google",
  github = "github",
}
