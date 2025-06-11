-- Create artifacts table
CREATE TABLE IF NOT EXISTS "public"."artifacts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "title" text,
    "type" text,
    "content" text,
    "user_id" uuid DEFAULT auth.uid() NOT NULL,
    PRIMARY KEY ("id")
);

-- Add RLS policies for artifacts
ALTER TABLE "public"."artifacts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access based on user_id" ON "public"."artifacts" 
    FOR SELECT TO authenticated 
    USING ((auth.uid() = user_id));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."artifacts" 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update access based on user_id" ON "public"."artifacts" 
    FOR UPDATE TO authenticated 
    USING ((auth.uid() = user_id));

CREATE POLICY "Enable delete for users based on user_id" ON "public"."artifacts" 
    FOR DELETE TO authenticated 
    USING ((auth.uid() = user_id));

-- Create system_config table
CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "sector" text DEFAULT 'Tecnología',
    "kpi_1" text DEFAULT 'Retención de usuarios',
    "kpi_2" text DEFAULT 'Conversión',
    "kpi_3" text DEFAULT 'Engagement',
    "preferred_model" text DEFAULT 'GPT-4',
    "data_analysis_enabled" boolean DEFAULT true,
    "code_generation_enabled" boolean DEFAULT true,
    "visualization_enabled" boolean DEFAULT true,
    PRIMARY KEY ("id")
);

-- Add RLS policies for system_config
ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;

-- Only allow admins to modify system_config
CREATE POLICY "Enable read for all authenticated users" ON "public"."system_config" 
    FOR SELECT TO authenticated 
    USING (true);

-- Insert default system_config if not exists
INSERT INTO "public"."system_config" (
    "sector", 
    "kpi_1", 
    "kpi_2", 
    "kpi_3", 
    "preferred_model", 
    "data_analysis_enabled", 
    "code_generation_enabled", 
    "visualization_enabled"
) 
SELECT 
    'Tecnología', 
    'Retención de usuarios', 
    'Conversión', 
    'Engagement', 
    'GPT-4', 
    true, 
    true, 
    true
WHERE NOT EXISTS (SELECT 1 FROM "public"."system_config" LIMIT 1);

-- Grant permissions
GRANT ALL ON TABLE "public"."artifacts" TO "anon";
GRANT ALL ON TABLE "public"."artifacts" TO "authenticated";
GRANT ALL ON TABLE "public"."artifacts" TO "service_role";

GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";
