import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import "./styles/z-index.css";
import { cn } from "@/lib/utils";
import { Toaster } from "react-hot-toast";
import ReactQueryProvider from "@/app/react-query-provider";
import { cookies } from "next/headers";
import { SupabaseProvider } from "@/lib/supabase";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tecnoandina",
  description: "Plataforma de Tecnoandina",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Crear sesión compatible para el provider
  const session = user ? { user } : null;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="/js/animations.js" defer></script>
      </head>
      <body
        className={cn("min-h-screen font-sans antialiased", fontSans.variable)}
      >
        <SupabaseProvider session={session}>
          <ReactQueryProvider>
            {children}

            <Toaster />
          </ReactQueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
