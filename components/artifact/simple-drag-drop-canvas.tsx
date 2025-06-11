"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Artifact } from '@/lib/artifact';
import { ReactArtifact } from '@/components/artifact/react';
import { HTMLArtifact } from '@/components/artifact/html';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, Save } from 'lucide-react';

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

export default function SimpleDragDropCanvas({ initialArtifacts = [], onPublishAsMaster }: DragDropCanvasProps) {
  // State for artifacts and their properties
  const [artifacts, setArtifacts] = useState<ArtifactWithPosition[]>([]);
  
  // State for tracking interactions
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [highestZIndex, setHighestZIndex] = useState(100); // Iniciar con un valor base más alto

  // Handle mouse move for dragging and resizing
  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle dragging
    if (dragging && !resizing && canvasRef.current) {
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
    
    // Handle resizing
    if (resizing && !dragging && canvasRef.current) {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;
      
      // Ensure minimum size
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

  // Handle drop from sidebar to add new artifacts
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const artifactData = e.dataTransfer.getData('artifact');
    console.log("Dropped artifact data:", artifactData);
    
    if (!artifactData) {
      console.error("No artifact data found in drop event");
      return;
    }
    
    try {
      const dropArtifact = JSON.parse(artifactData);
      console.log("Parsed artifact:", dropArtifact);
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate drop position
      const dropX = e.clientX - canvasRect.left;
      const dropY = e.clientY - canvasRect.top;
      
      // Generate a unique ID for the new artifact
      const id = `artifact-${Date.now()}`;
      
      // Create new artifact with position
      const newZIndex = Math.max(...artifacts.map(a => a.zIndex || 0), highestZIndex) + 1;
      setHighestZIndex(newZIndex);
      
      const newArtifact: ArtifactWithPosition = {
        ...dropArtifact,
        id: id,
        position: { x: Math.max(0, dropX - 150), y: Math.max(0, dropY - 20) },
        width: 300,
        height: 300,
        isMaximized: false,
        zIndex: newZIndex
      };
      
      // Add to artifacts array
      setArtifacts(prev => [...prev, newArtifact]);
      console.log(`Added new artifact with ID: ${id}`);
    } catch (error) {
      console.error("Error processing dropped artifact:", error);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle mouse up to stop dragging and resizing
  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  // Handle drag start
  const handleDragStart = (id: string, e: React.MouseEvent) => {
    // Check if we're clicking on the resize handle
    const target = e.target as HTMLElement;
    if (target.classList && target.classList.contains('resize-handle')) return;
    if (typeof target.className === 'string' && target.className.includes('resize-handle')) return;
    
    // Bring the artifact to the front
    const newZIndex = Math.max(...artifacts.map(a => a.zIndex || 0), highestZIndex) + 1;
    setHighestZIndex(newZIndex);
    
    setArtifacts(prev => {
      return prev.map(a => a.id === id ? {...a, zIndex: newZIndex} : a);
    });
    
    setDragging(id);
    const artifactEl = e.currentTarget as HTMLElement;
    const rect = artifactEl.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle resize start
  const handleResizeStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(id);
    
    // Find the current size of the artifact
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

  // Toggle maximize state
  const toggleMaximize = (id: string) => {
    // Find the artifact
    const artifact = artifacts.find(a => a.id === id);
    
    // Toggle maximized state
    if (artifact) {
      // If we're maximizing, hide the search
      if (!artifact.isMaximized) {
        if (typeof window !== 'undefined' && window.toggleSearchOpen) {
          window.toggleSearchOpen(false);
        }
      } else {
        // If we're minimizing, show the search
        if (typeof window !== 'undefined' && window.toggleSearchOpen) {
          window.toggleSearchOpen(true);
        }
      }
      
      // Update the artifact
      setArtifacts(prev =>
        prev.map(a =>
          a.id === id
            ? { ...a, isMaximized: !a.isMaximized }
            : a
        )
      );
    }
  };
  
  // Remove artifact
  const removeArtifact = (id: string) => {
    // Find the artifact
    const artifact = artifacts.find(a => a.id === id);
    
    // If it's maximized, restore the search
    if (artifact?.isMaximized) {
      if (typeof window !== 'undefined' && window.toggleSearchOpen) {
        window.toggleSearchOpen(true);
      }
    }
    
    // Remove the artifact
    setArtifacts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div 
      ref={canvasRef}
      className="w-full h-full min-h-[600px] bg-gray-50 border rounded-lg relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Canvas content */}
      
      {/* Render all artifacts */}
      {artifacts.map((artifact) => {
        const id = artifact.id || '';
        
        return (
          <div
            key={id}
            className="absolute shadow-md rounded-lg"
            style={{
              left: artifact.isMaximized ? 0 : artifact.position.x,
              top: artifact.isMaximized ? 0 : artifact.position.y,
              width: artifact.isMaximized ? '100%' : artifact.width,
              height: artifact.isMaximized ? '100%' : artifact.height,
              zIndex: (dragging === id || resizing === id) ? 
                'var(--z-index-artifact-active)' : 
                Math.max(artifact.zIndex, 100),
            }}
          >
            <div 
              className="bg-white p-2 rounded-t-lg cursor-move flex justify-between items-center"
              onMouseDown={(e) => handleDragStart(id, e)}
            >
              <span className="font-medium truncate text-sm">{artifact.name || `Artifact`}</span>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleMaximize(id)}
                >
                  {artifact.isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeArtifact(id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-b-lg h-[calc(100%-36px)] overflow-auto">
              {artifact.type === "text/html" ? (
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
                  artifactId={artifact.name}
                />
              )}
            </div>
            
            {/* Resize handle */}
            {!artifact.isMaximized && (
              <div 
                className="resize-handle absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize"
                style={{
                  background: 'linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.3) 50%)',
                  borderBottomRightRadius: '4px',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleResizeStart(id, e)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
