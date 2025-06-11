-- Add message_type column to messages table
ALTER TABLE "public"."messages" ADD COLUMN "message_type" text;

-- Create index for faster queries on message_type
CREATE INDEX IF NOT EXISTS "idx_messages_message_type" ON "public"."messages" ("message_type");

-- Comment on the column to document its purpose
COMMENT ON COLUMN "public"."messages"."message_type" IS 'Tipo de mensaje (ej: "context" para mensajes de contexto invisibles)';
