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

  // Get the initial result from the LLM
  const result = await streamText({
    model: llm,
    messages: coreMessages,
    system: ArtifactoSystemPrompt,
    ...options,
  });

  // Read the entire response to check for Memgraph query
  let fullResponse = "";
  const reader = result.textStream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += value;
    }
  } finally {
    reader.releaseLock();
  }

  console.log("Initial LLM response:", fullResponse);

  // Check if the response contains a Memgraph query
  const memgraphQueryMatch = fullResponse.match(/<memgraph_query>([\s\S]*?)<\/memgraph_query>/);
  
  if (memgraphQueryMatch && memgraphQueryMatch[1]) {
    const cypherQuery = memgraphQueryMatch[1].trim();
    console.log("==================== CYPHER QUERY ====================");
    console.log(cypherQuery);
    console.log("======================================================");
    
    try {
      // Execute the Cypher query
      const queryResults = await executeCypherQuery(cypherQuery);
      const resultsText = JSON.stringify(queryResults, null, 2);
      console.log("Memgraph query results:", resultsText);
      
      // Create a new message with the query results for the second LLM call
      const secondCallMessages: CoreMessage[] = [
        ...coreMessages,
        { 
          role: 'assistant' as const, 
          content: fullResponse 
        },
        { 
          role: 'system' as const, 
          content: `The Memgraph query \`${cypherQuery}\` was executed. Results:\n${resultsText}\n\nPlease use these results to answer the user's original question. Do not include the <memgraph_query> tags in your response.` 
        }
      ];
      
      // Make a second call to the LLM with the query results
      const secondResult = await streamText({
        model: llm,
        messages: secondCallMessages,
        system: ArtifactoSystemPrompt,
        ...options,
      });
      
      // Return the second response
      return secondResult.toAIStreamResponse();
      
    } catch (error) {
      console.error("Error executing Memgraph query:", error);
      
      // Create a new message with the error for the second LLM call
      const errorMessages: CoreMessage[] = [
        ...coreMessages,
        { 
          role: 'assistant' as const, 
          content: fullResponse 
        },
        { 
          role: 'system' as const, 
          content: `The Memgraph query \`${cypherQuery}\` failed. Error: ${error instanceof Error ? error.message : String(error)}\n\nPlease inform the user about the issue and try to answer their question without this data.` 
        }
      ];
      
      // Make a second call to the LLM with the error
      const errorResult = await streamText({
        model: llm,
        messages: errorMessages,
        system: ArtifactoSystemPrompt,
        ...options,
      });
      
      // Return the error response
      return errorResult.toAIStreamResponse();
    }
  }
  
  // If no Memgraph query was found, we'll still make a second call to the LLM
  // to ensure all responses follow the same path and are displayed correctly
  console.log("No Memgraph query found, making a second call to ensure display compatibility");
  
  // Create messages for the second LLM call with the original response
  const secondCallMessages: CoreMessage[] = [
    ...coreMessages,
    { 
      role: 'assistant' as const, 
      content: fullResponse 
    },
    { 
      role: 'system' as const, 
      content: `The user asked: "${currentMessage.content}". You've already provided a response. Please return that same response without any modifications, as it will be displayed to the user.` 
    }
  ];
  
  // Make a second call to the LLM with the original response
  const secondResult = await streamText({
    model: llm,
    messages: secondCallMessages,
    system: ArtifactoSystemPrompt,
    ...options,
  });
  
  // Return the second response
  return secondResult.toAIStreamResponse();
}
