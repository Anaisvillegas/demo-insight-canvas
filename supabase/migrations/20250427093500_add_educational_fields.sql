-- Agregar campos educativos a la tabla artifacts
ALTER TABLE artifacts
ADD COLUMN content_type TEXT, -- 'video', 'quiz', 'reading', 'exercise', 'project'
ADD COLUMN progress FLOAT DEFAULT 0, -- 0 a 1 (0% a 100%)
ADD COLUMN status TEXT DEFAULT 'not-started', -- 'not-started', 'in-progress', 'completed'
ADD COLUMN duration INTEGER, -- en minutos
ADD COLUMN difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
ADD COLUMN tags TEXT[], -- array de etiquetas
ADD COLUMN module_id TEXT,
ADD COLUMN course_id TEXT;

-- Crear un índice para búsquedas por estado
CREATE INDEX idx_artifacts_status ON artifacts(status);

-- Crear un índice para búsquedas por tipo de contenido
CREATE INDEX idx_artifacts_content_type ON artifacts(content_type);

-- Comentarios para documentar los campos
COMMENT ON COLUMN artifacts.content_type IS 'Tipo de contenido educativo: video, quiz, reading, exercise, project';
COMMENT ON COLUMN artifacts.progress IS 'Progreso del usuario en este artifact (0 a 1)';
COMMENT ON COLUMN artifacts.status IS 'Estado del artifact: not-started, in-progress, completed';
COMMENT ON COLUMN artifacts.duration IS 'Duración estimada en minutos';
COMMENT ON COLUMN artifacts.difficulty IS 'Nivel de dificultad: beginner, intermediate, advanced';
COMMENT ON COLUMN artifacts.tags IS 'Etiquetas para categorizar el contenido';
COMMENT ON COLUMN artifacts.module_id IS 'ID del módulo al que pertenece este artifact';
COMMENT ON COLUMN artifacts.course_id IS 'ID del curso al que pertenece este artifact';
