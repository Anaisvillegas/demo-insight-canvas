"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Artifact } from '@/lib/artifact';
import { ReactArtifact } from '@/components/artifact/react';
import { HTMLArtifact } from '@/components/artifact/html';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, Save } from 'lucide-react';

// Declare global interface to extend Window
declare global {
  interface Window {
    toggleSearchOpen?: (isOpen: boolean) => void;
  }
}

interface DragDropCanvasProps {
  initialArtifacts?: Artifact[];
  onPublishAsMaster?: (artifact: Artifact) => void;
}

interface ArtifactWithPosition extends Artifact {
  position: { x: number; y: number };
  width: number;
  height: number;
  isMaximized: boolean;
  zIndex: number;
}

function DragDropCanvas({ initialArtifacts = [], onPublishAsMaster }: DragDropCanvasProps) {
  const [artifacts, setArtifacts] = useState<ArtifactWithPosition[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  // Usamos un valor base alto para asegurar que los artifacts siempre estén por encima de elementos básicos
  const [highestZIndex, setHighestZIndex] = useState(100);

  // Initialize artifacts with positions
  useEffect(() => {
    // If we have initial artifacts, use them
    if (initialArtifacts.length > 0) {
      const artifactsWithPositions = initialArtifacts.map((artifact, index) => ({
        ...artifact,
        position: {
          x: 50 + (index * 25),
          y: 50 + (index * 25),
        },
        width: 300,
        height: 300,
        isMaximized: false,
        zIndex: index,
      }));
      setArtifacts(artifactsWithPositions);
      setHighestZIndex(initialArtifacts.length - 1);
    } 
    // Otherwise, create some sample artifacts for testing
    else {
      console.log("No initial artifacts, creating sample artifacts for testing");
      const sampleArtifacts: ArtifactWithPosition[] = [
        {
          id: "sample-react-1",
          name: "Sample React Component",
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
          user_id: "sample-user",
          position: { x: 50, y: 50 },
          width: 300,
          height: 300,
          isMaximized: false,
          zIndex: 0,
        },
        {
          id: "sample-html-1",
          name: "Sample HTML Content",
          type: "text/html",
          code: `
<div style="padding: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: white;">
  <h2 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 8px;">HTML Content</h2>
  <p>This is a simple HTML artifact that can be dragged around the canvas.</p>
  <button style="margin-top: 8px; padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
    Click Me
  </button>
</div>`,
          user_id: "sample-user",
          position: { x: 400, y: 50 },
          width: 300,
          height: 300,
          isMaximized: false,
          zIndex: 1,
        }
      ];
      
      console.log("Sample artifacts created:", sampleArtifacts);
      setArtifacts(sampleArtifacts);
      setHighestZIndex(1);
    }
  }, [initialArtifacts]);

  const handleDragStart = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList && target.classList.contains('resize-handle')) return;
    if (typeof target.className === 'string' && target.className.includes('resize-handle')) return;
    
    // Bring the dragged artifact to the front
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    
    setArtifacts(prev => 
      prev.map(a => a.id === id ? {...a, zIndex: newZIndex} : a)
    );
    
    setDragging(id);
    const artifactEl = e.currentTarget as HTMLElement;
    const rect = artifactEl.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleResizeStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(id);
    const artifact = artifacts.find(a => a.id === id);
    if (artifact) {
      setInitialSize({
        width: artifact.width,
        height: artifact.height
      });
      setInitialMousePos({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging !== null && !resizing && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - offset.x;
      const newY = e.clientY - canvasRect.top - offset.y;
      
      setArtifacts(prev =>
        prev.map((item) =>
          item.id === dragging
            ? { ...item, position: { x: newX, y: newY } }
            : item
        )
      );
    }
    
    if (resizing !== null && !dragging && canvasRef.current) {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;
      const newWidth = Math.max(200, initialSize.width + deltaX);
      const newHeight = Math.max(150, initialSize.height + deltaY);
      
      setArtifacts(prev =>
        prev.map((item) =>
          item.id === resizing
            ? { ...item, width: newWidth, height: newHeight }
            : item
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const artifactData = e.dataTransfer.getData('artifact');
    if (!artifactData) return;
    
    try {
      const dropArtifact = JSON.parse(artifactData);
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate the exact position where the artifact was dropped
      const dropX = e.clientX - canvasRect.left;
      const dropY = e.clientY - canvasRect.top;
      
      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);
      
      const newArtifact: ArtifactWithPosition = {
        ...dropArtifact,
        position: {
          x: Math.max(0, dropX - 150), // Center horizontally (width/2)
          y: Math.max(0, dropY - 20),
        },
        width: 300,
        height: 300,
        isMaximized: false,
        zIndex: newZIndex,
      };
      
      setArtifacts(prev => [...prev, newArtifact]);
    } catch (error) {
      console.error("Error processing dropped artifact:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const removeArtifact = (id: string) => {
    setArtifacts(prevArtifacts => prevArtifacts.filter(a => a.id !== id));
  };

  const toggleMaximize = (id: string) => {
    const updatedArtifact = artifacts.find(artifact => artifact.id === id);
    if (updatedArtifact && !updatedArtifact.isMaximized) {
      if (typeof window !== 'undefined' && window.toggleSearchOpen) {
        window.toggleSearchOpen(false);
      }
    }
    
    setArtifacts(prev =>
      prev.map(artifact =>
        artifact.id === id
          ? { ...artifact, isMaximized: !artifact.isMaximized }
          : artifact
      )
    );
  };

  const publishAsMaster = (artifact: Artifact) => {
    if (onPublishAsMaster) {
      onPublishAsMaster(artifact);
    }
  };

  // Log the current artifacts for debugging
  useEffect(() => {
    console.log("Current artifacts:", artifacts);
  }, [artifacts]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full min-h-[600px] bg-gray-50 border rounded-lg relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-white p-2 rounded shadow z-50 text-xs">
        Artifacts: {artifacts.length}
      </div>
      
      {artifacts.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No artifacts to display. Drag and drop artifacts here.</p>
        </div>
      ) : (
        artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className={`absolute shadow-md rounded-lg artifact-container ${
            artifact.isMaximized ? 'w-full h-full left-0 top-0' : ''
          }`}
          style={{
            left: artifact.isMaximized ? 0 : artifact.position.x,
            top: artifact.isMaximized ? 0 : artifact.position.y,
            width: artifact.isMaximized ? '100%' : artifact.width,
            height: artifact.isMaximized ? '100%' : artifact.height,
            zIndex: (dragging === artifact.id || resizing === artifact.id) ? 
              'var(--z-index-artifact-active)' : 
              Math.max(artifact.zIndex, 100),
          }}
        >
          <div
            className="bg-white p-2 rounded-t-lg cursor-move flex justify-between items-center"
            onMouseDown={(e) => handleDragStart(artifact.id || '', e)}
          >
            <span className="font-medium truncate">{artifact.name || `Artifact`}</span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleMaximize(artifact.id || '')}
              >
                {artifact.isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeArtifact(artifact.id || '')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-b-lg h-[calc(100%-36px)] overflow-auto">
            {artifact.code.trim().startsWith('import') ? (
              <ReactArtifact
                code={artifact.code}
                mode="preview"
                recording={false}
                onCapture={() => {}}
              />
            ) : artifact.type === "text/html" ? (
              <HTMLArtifact 
                code={artifact.code} 
                mode="preview" 
                recording={false}
                onCapture={() => {}}
              />
            ) : (
              <ReactArtifact 
                code={artifact.code} 
                mode="preview" 
                recording={false}
                onCapture={() => {}}
              />
            )}
          </div>
          {!artifact.isMaximized && (
            <div 
              className="resize-handle absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize"
              style={{
                background: 'linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.3) 50%)',
                borderBottomRightRadius: '4px',
                zIndex: 10
              }}
              onMouseDown={(e) => handleResizeStart(artifact.id || '', e)}
            />
          )}
        </div>
        ))
      )}
    </div>
  );
}

export default DragDropCanvas;
