"use client";

import React, { useState, useEffect } from 'react';
import { Artifact, getArtifacts, deleteArtifact } from '@/lib/artifact';
import { useSupabase } from '@/lib/supabase/hooks/useSupabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, X, Trash2 } from 'lucide-react';

interface ArtifactSearchProps {
  onClose?: () => void;
}

function ArtifactSearch({ onClose }: ArtifactSearchProps) {
  const { supabase, session } = useSupabase();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [filteredArtifacts, setFilteredArtifacts] = useState<Artifact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArtifacts = async () => {
      if (!session?.user) return;
      
      try {
        setLoading(true);
        const data = await getArtifacts(supabase, session.user.id);
        setArtifacts(data);
        setFilteredArtifacts(data);
      } catch (error) {
        console.error("Error loading artifacts:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadArtifacts();
  }, [session, supabase]);

  useEffect(() => {
    // Filtrar por búsqueda y tipo
    let filtered = artifacts;
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        artifact => 
          artifact.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por tipo
    if (selectedType !== 'todos') {
      filtered = filtered.filter(artifact => artifact.type === selectedType);
    }
    
    setFilteredArtifacts(filtered);
  }, [searchTerm, selectedType, artifacts]);

  const handleDragStart = (e: React.DragEvent, artifact: Artifact) => {
    e.dataTransfer.setData('artifact', JSON.stringify(artifact));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleDeleteArtifact = async (id: string) => {
    if (!session?.user) return;
    
    if (confirm('¿Está seguro que desea eliminar este artifact?')) {
      try {
        await deleteArtifact(supabase, id);
        // Actualizar la lista de artifacts después de eliminar
        setArtifacts(prevArtifacts => prevArtifacts.filter(a => a.id !== id));
        setFilteredArtifacts(prevFiltered => prevFiltered.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting artifact:', error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="text-base font-semibold">Artifacts</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="p-3 border-b">
        <div className="relative">
          <Input
            placeholder="Buscar artifacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="todos" value={selectedType} onValueChange={setSelectedType} className="flex-1 flex flex-col">
        <div className="px-3 pt-2">
          <TabsList className="w-full text-sm">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="application/react">React</TabsTrigger>
            <TabsTrigger value="text/html">HTML</TabsTrigger>
            <TabsTrigger value="master">Master</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value={selectedType} className="flex-1 overflow-y-auto p-3 max-h-[calc(100vh-200px)]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <p>Cargando artifacts...</p>
            </div>
          ) : filteredArtifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Search className="h-8 w-8 mb-2" />
              <p>No se encontraron artifacts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredArtifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="border rounded p-3 cursor-grab hover:bg-gray-50"
                  draggable
                  onDragStart={(e) => handleDragStart(e, artifact)}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm">{artifact.name || 'Sin nombre'}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteArtifact(artifact.id || '');
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ArtifactSearch;
