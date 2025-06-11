"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Artifact } from '@/lib/artifact';
import { useSupabase } from '@/lib/supabase/hooks/useSupabase';

/**
 * Test component to create and drag artifacts to the canvas
 */
export default function TestArtifact() {
  const { supabase, session } = useSupabase();
  const [isCreating, setIsCreating] = useState(false);

  const createTestArtifact = async () => {
    if (!session?.user) {
      console.error("User not authenticated");
      return;
    }

    setIsCreating(true);
    
    try {
      // Create a simple React component artifact
      const reactArtifact: Artifact = {
        name: "Test React Component",
        type: "application/react",
        code: `
import React, { useState } from 'react';

export default function TestComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-lg font-bold mb-2">Test Component</h2>
      <p>Count: {count}</p>
      <button 
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  );
}`,
        user_id: session.user.id
      };

      // Create a simple HTML artifact
      const htmlArtifact: Artifact = {
        name: "Test HTML Content",
        type: "text/html",
        code: `
<div style="padding: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: white;">
  <h2 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 8px;">HTML Content</h2>
  <p>This is a simple HTML artifact that can be dragged to the canvas.</p>
  <button style="margin-top: 8px; padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
    Click Me
  </button>
</div>`,
        user_id: session.user.id
      };

      // Insert artifacts into the database
      // Using type assertion to bypass TypeScript errors since the artifacts table
      // might not be included in the generated types
      const { data: reactData, error: reactError } = await (supabase as any)
        .from("artifacts")
        .insert(reactArtifact)
        .select();

      const { data: htmlData, error: htmlError } = await (supabase as any)
        .from("artifacts")
        .insert(htmlArtifact)
        .select();

      if (reactError || htmlError) {
        console.error("Error creating test artifacts:", reactError || htmlError);
        return;
      }

      console.log("Test artifacts created successfully:", { reactData, htmlData });
      
      // Reload the page to show the new artifacts
      window.location.reload();
    } catch (error) {
      console.error("Error creating test artifacts:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button 
        onClick={createTestArtifact}
        disabled={isCreating}
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        {isCreating ? "Creating..." : "Create Test Artifacts"}
      </Button>
    </div>
  );
}
