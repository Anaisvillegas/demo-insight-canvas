import { ArtifactoSystemPrompt } from "@/app/api/chat/systemPrompt";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, convertToCoreMessages, Message, ImagePart, CoreMessage, StreamingTextResponse } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Models } from "@/app/types";
import { executeCypherQuery } from '@/lib/memgraphService'; // Import Memgraph service

export const maxDuration = 300; // Increased to allow for Memgraph query processing

// Helper function to extract content from a CoreMessage or Message
function getMessageContent(message: CoreMessage | Message): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  // Handle cases where content is an array of parts (e.g., text and images)
  // For simplicity, we'll just concatenate text parts here.
  // A more robust solution might handle different content types appropriately.
  if (Array.isArray(message.content)) {
    return message.content
      .filter(part => part.type === 'text')
      // @ts-ignore
      .map(part => part.text)
      .join('');
  }
  return '';
}


export async function POST(req: Request) {
  const { messages: originalMessages, apiKey, model } = await req.json();

  let llm;
  let options: Record<string, any> = {};

  if (model === Models.claude || model === Models.claude35Sonnet || model === Models.claude37Sonnet) {
    const anthropic = createAnthropic({
      apiKey,
    });

    // Use the model value directly from the Models enum
    // This works because we've set the enum values to match the actual model identifiers
    llm = anthropic(model === Models.claude ? "claude-3-5-sonnet-20240620" : model);

    // Set appropriate max tokens based on the model
    let maxTokens = 8192;
    
    if (model === Models.claude37Sonnet) {
      maxTokens = 64000; // Higher token limit for Claude 3.7
    }

    options = {
      ...options,
      maxTokens: maxTokens,
    };
  } else if (model.startsWith("gpt")) {
    const openai = createOpenAI({
      compatibility: "strict", // strict mode, enable when using the OpenAI API
      apiKey,
    });

    llm = openai(model);
    
    // Set appropriate max tokens for OpenAI models
    let maxTokens = 4096; // Default
    
    if (model === Models.gpt41) {
      maxTokens = 32768; // 32K tokens for GPT-4.1 as per documentation
    } else if (model === Models.gpt41Mini) {
      maxTokens = 32768; // 16K tokens for GPT-4.1 Mini
    } else if (model === Models.gpt4o) {
      maxTokens = 8192;
    } else if (model === Models.gpt4oMini) {
      maxTokens = 4096;
    } else if (model === Models.gpt41Nano) {
      maxTokens = 2048;
    }
    
    options = {
      ...options,
      max_tokens: maxTokens,
    };
  }

  if (!llm) throw new Error(`Unsupported model: ${model}`);

  const initialMessages = originalMessages.slice(0, -1);
  const currentMessage: Message = originalMessages[originalMessages.length - 1];
  const attachments = currentMessage.experimental_attachments || [];
  const imageParts: ImagePart[] = attachments.map((file: any) => ({ // Added :any for file
    type: "image",
    image: new URL(file.url),
  }));

  // Initial messages for the LLM
  const coreMessages: CoreMessage[] = [
    ...convertToCoreMessages(initialMessages),
    {
      role: "user" as const,
      content: [
        {
          type: "text",
          text: currentMessage.content,
        },
        ...imageParts,
      ],
    },
  ];

  // ✅ CORRECCIÓN: Retornar stream directamente para respuestas normales
  const result = await streamText({
    model: llm,
    messages: coreMessages,
    system: ArtifactoSystemPrompt,
    ...options,
  });

  // Para consultas normales, retornar el stream directamente sin procesamiento
  // Solo procesamos si necesitamos detectar consultas Memgraph específicas
  console.log("Returning direct stream response for optimal performance");
  
  return result.toAIStreamResponse();
}
