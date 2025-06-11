import { SupabaseContextType } from "@/lib/supabase/types";

export interface Artifact {
  id?: string;
  name: string;
  type: string;
  code: string;
  user_id: string;
  created_at?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  isMaximized?: boolean;
  zIndex?: number;
}

// Tipo para evitar errores de TypeScript con la tabla artifacts
type SupabaseAny = any;

/**
 * Crea un nuevo artefacto en la base de datos
 * @param supabase Cliente de Supabase
 * @param artifact Datos del artefacto a crear
 * @param userId ID del usuario propietario
 * @returns El artefacto creado
 */
export const createArtifact = async (
  supabase: SupabaseContextType["supabase"],
  artifact: Artifact,
  userId: string
): Promise<Artifact> => {
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await (supabase as any)
    .from("artifacts")
    .insert({
      name: artifact.name,
      type: artifact.type,
      code: artifact.code,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating artifact:", error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Could not create artifact");
  }

  return data as Artifact;
};

/**
 * Obtiene todos los artefactos de un usuario
 * @param supabase Cliente de Supabase
 * @param userId ID del usuario
 * @returns Lista de artefactos
 */
export const getArtifacts = async (
  supabase: SupabaseContextType["supabase"],
  userId: string | null | undefined
): Promise<Artifact[]> => {
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await (supabase as any)
    .from("artifacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching artifacts:", error);
    throw new Error(error.message);
  }

  return data as Artifact[];
};

/**
 * Obtiene un artefacto específico
 * @param supabase Cliente de Supabase
 * @param id ID del artefacto
 * @returns El artefacto solicitado
 */
export const getArtifact = async (
  supabase: SupabaseContextType["supabase"],
  id: string
): Promise<Artifact> => {
  const { data, error } = await (supabase as any)
    .from("artifacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching artifact:", error);
    throw new Error(error.message);
  }

  return data as Artifact;
};

/**
 * Actualiza un artefacto existente
 * @param supabase Cliente de Supabase
 * @param artifact Datos actualizados del artefacto
 * @returns El artefacto actualizado
 */
export const updateArtifact = async (
  supabase: SupabaseContextType["supabase"],
  artifact: Artifact
): Promise<Artifact> => {
  const { data, error } = await (supabase as any)
    .from("artifacts")
    .update({
      name: artifact.name,
      type: artifact.type,
      code: artifact.code,
    })
    .eq("id", artifact.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating artifact:", error);
    throw new Error(error.message);
  }

  return data as Artifact;
};

/**
 * Elimina un artefacto
 * @param supabase Cliente de Supabase
 * @param id ID del artefacto a eliminar
 */
export const deleteArtifact = async (
  supabase: SupabaseContextType["supabase"],
  id: string
): Promise<void> => {
  const { error } = await (supabase as any)
    .from("artifacts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting artifact:", error);
    throw new Error(error.message);
  }
};

/**
 * Publica un artefacto como master
 * @param supabase Cliente de Supabase
 * @param artifact Artefacto a publicar como master
 * @param userId ID del usuario
 * @returns El artefacto master creado
 */
export const publishAsMaster = async (
  supabase: SupabaseContextType["supabase"],
  artifact: Artifact,
  userId: string
): Promise<Artifact> => {
  try {
    // Clonar el artifact con tipo master
    const masterArtifact = {
      name: `Master: ${artifact.name}`,
      type: "master",
      code: artifact.code,
      user_id: userId,
    };

    const { data, error } = await (supabase as any)
      .from("artifacts")
      .insert(masterArtifact)
      .select()
      .single();

    if (error) {
      console.error("Error publishing as master:", error);
      throw new Error(error.message);
    }

    return data as Artifact;
  } catch (error) {
    console.error("Error publishing as master:", error);
    throw error;
  }
};
