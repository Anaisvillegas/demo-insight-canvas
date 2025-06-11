"use client";

import { useEffect, useState, useRef } from 'react';
import { useSupabase } from '@/lib/supabase/hooks/useSupabase';
import { Artifact, getArtifacts, publishAsMaster } from '@/lib/artifact';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SimpleDragDropCanvas from '@/components/artifact/simple-drag-drop-canvas';
import { ChatPanel } from '@/components/chat/panel';
import ArtifactSearch from '@/components/artifact/artifact-search';
import TestArtifact from '@/components/artifact/test-artifact';
import { MessageSquare, X, Maximize2, SquarePenIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from "next/navigation";
import '@/app/styles/drag-drop-canvas.css';

// Declarar la interfaz global para permitir extender Window
declare global {
  interface Window {
    toggleSearchOpen?: (isOpen: boolean) => void;
  }
}

export default function ArtifactWorkspace({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { supabase, session } = useSupabase();
  
  // Redirect to signin if not authenticated
  if (!session) redirect("/signin");
  
  const [displayedArtifacts, setDisplayedArtifacts] = useState<Artifact[]>([]);
  const [searchOpen, setSearchOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(
    searchParams.chat ? String(searchParams.chat) : null
  );

  // Exponer función para abrir/cerrar el buscador globalmente
  useEffect(() => {
    window.toggleSearchOpen = (isOpen: boolean) => {
      setSearchOpen(isOpen);
    };
    
    return () => {
      delete window.toggleSearchOpen;
    };
  }, []);

  // Abrir el chat automáticamente si hay un chatId en la URL
  useEffect(() => {
    if (searchParams.chat && !chatOpen) {
      setChatOpen(true);
    }
  }, [searchParams.chat]);
  
  // Escuchar cambios en la URL sin recargar la página
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const chatIdFromUrl = params.get('chat');
      
      console.log("🔄 Detectado cambio en URL, chatId:", chatIdFromUrl);
      
      if (chatIdFromUrl && chatIdFromUrl !== chatId) {
        console.log("✅ Actualizando chatId desde URL sin recargar:", chatIdFromUrl);
        setChatId(chatIdFromUrl);
        setChatOpen(true);
      }
    };

    // Escuchar eventos de navegación
    window.addEventListener('popstate', handleUrlChange);
    
    // También podemos escuchar cambios en el historial
    const originalPushState = window.history.pushState;
    window.history.pushState = function(data, unused, url) {
      originalPushState.call(this, data, unused, url);
      handleUrlChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.history.pushState = originalPushState;
    };
  }, [chatId]);

  // Cargar artifacts iniciales (opcionales)
  useEffect(() => {
    const loadInitialArtifacts = async () => {
      if (!session?.user) return;
      
      try {
        // Cargar algunos artifacts iniciales si lo deseas
        const data = await getArtifacts(supabase, session.user.id);
        setDisplayedArtifacts(data.slice(0, 3)); // Mostrar solo los primeros 3
      } catch (error) {
        console.error("Error loading initial artifacts:", error);
      }
    };
    
    loadInitialArtifacts();
  }, [session, supabase]);

  const handlePublishAsMaster = async (artifact: Artifact) => {
    if (!session?.user) {
      toast.error("Debes iniciar sesión para publicar como master");
      return;
    }
    
    try {
      const publishedArtifact = await publishAsMaster(
        supabase, 
        artifact, 
        session.user.id
      );
      
      toast.success("Artifact publicado como master correctamente");
    } catch (error) {
      console.error("Error publicando artifact como master:", error);
      toast.error("Error al publicar como master");
    }
  };

  return (
    <div className="container mx-auto py-4 h-[calc(100vh-8rem)]">
      <header className="flex justify-between items-center mb-4">
        <Image
          src="/LogoTecnoandina.png"
          alt="Tecnoandina"
          width={300}
          height={75}
          className="h-16 w-auto"
        />
        
        <div className="flex space-x-2">
          {!searchOpen && (
            <Button 
              variant="outline" 
              onClick={() => setSearchOpen(true)}
            >
              <span className="text-sm">Mostrar buscador</span>
            </Button>
          )}
          
          {!chatOpen ? (
            <Button 
              variant="outline" 
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="text-sm">Abrir chat</span>
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setChatId(null);
                  // Mantener el chat abierto pero sin ID
                  history.pushState({}, '', '/artifact-workspace');
                  // Forzar recarga del componente
                  window.location.reload();
                }}
              >
                <SquarePenIcon className="h-4 w-4 mr-2" />
                <span className="text-sm">Nuevo tablero</span>
              </Button>
            </div>
          )}
        </div>
      </header>
      
      <div className="flex h-full gap-4">
        {searchOpen && (
          <div className="w-72 h-full border rounded-lg overflow-hidden">
            <ArtifactSearch 
              onClose={() => setSearchOpen(false)} 
            />
          </div>
        )}
        
        <div className={`flex-grow ${searchOpen ? 'md:w-3/4' : 'w-full'}`}>
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <SimpleDragDropCanvas 
                initialArtifacts={displayedArtifacts} 
                onPublishAsMaster={handlePublishAsMaster}
              />
              
              {chatOpen && (
                <div className="fixed bottom-4 right-4 w-96 shadow-lg h-[60vh] min-w-[450px] min-h-[500px] z-chat">
                  <Card className="flex flex-col h-full">
                    <CardContent className="p-0 flex flex-col h-full">
                      <div className="bg-slate-100 p-3 flex justify-between items-center border-b">
                        <h3 className="font-semibold text-base">Chat</h3>
                        <div className="flex items-center gap-2">
                          {chatId && (
                            <Link href={`/chat/${chatId}`} passHref>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6"
                                title="Expandir chat"
                              >
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setChatOpen(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <ChatPanel 
                          key={chatId || 'new-chat'} 
                          id={chatId} 
                          onChatCreated={(id) => setChatId(id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
