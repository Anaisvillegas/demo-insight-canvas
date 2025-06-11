"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { Check, Copy, Download } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { twMerge } from "tailwind-merge";

// Lazy import del SyntaxHighlighter
const SyntaxHighlighter = React.lazy(() => 
  import("react-syntax-highlighter").then(module => ({
    default: module.Prism
  }))
);

interface Props {
  language: string;
  value: string;
  showHeader?: boolean;
  className?: string;
}

interface languageMap {
  [key: string]: string | undefined;
}

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  c: ".c",
  cpp: ".cpp",
  "c++": ".cpp",
  "c#": ".cs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  "objective-c": ".m",
  kotlin: ".kt",
  typescript: ".ts",
  go: ".go",
  perl: ".pl",
  rust: ".rs",
  scala: ".scala",
  haskell: ".hs",
  lua: ".lua",
  shell: ".sh",
  sql: ".sql",
  html: ".html",
  css: ".css",
};

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return lowercase ? result.toLowerCase() : result;
};

// Skeleton para el código mientras carga
const CodeSkeleton = () => (
  <div className="bg-zinc-800 rounded-b-lg p-4 space-y-2">
    <div className="h-3 bg-zinc-600 rounded w-full animate-pulse" />
    <div className="h-3 bg-zinc-600 rounded w-5/6 animate-pulse" />
    <div className="h-3 bg-zinc-600 rounded w-4/5 animate-pulse" />
    <div className="h-3 bg-zinc-600 rounded w-3/4 animate-pulse" />
    <div className="h-3 bg-zinc-600 rounded w-full animate-pulse" />
    <div className="h-3 bg-zinc-600 rounded w-2/3 animate-pulse" />
  </div>
);

// Hook para intersection observer (lazy loading)
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
};

const LazyCodeBlock = ({
  language,
  value,
  showHeader = true,
  className = "",
}: Props) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    timeout: 2000,
  });
  
  const { ref, isVisible } = useIntersectionObserver(0.1);
  const [shouldRender, setShouldRender] = useState(false);

  // Usar requestAnimationFrame para renderizado suave
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => {
        setShouldRender(true);
      });
    }
  }, [isVisible]);

  function onCopy() {
    if (isCopied) return;
    copyToClipboard(value);
  }

  const downloadAsFile = () => {
    const fileExtension = programmingLanguages[language] || ".file";
    const suggestedFileName = `file-${generateRandomString(3, true)}${fileExtension}`;
    const fileName = window.prompt("Enter file name" || "", suggestedFileName);

    if (!fileName || fileName.trim() === "") return;

    // Usar requestAnimationFrame para operaciones DOM
    requestAnimationFrame(() => {
      const blob = new Blob([value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      // Cleanup en el siguiente frame
      requestAnimationFrame(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    });
  };

  return (
    <div 
      ref={ref}
      className={twMerge("codeblock relative w-full font-sans", className)}
    >
      {showHeader && (
        <div className="flex items-center justify-between rounded-t-lg bg-zinc-700 px-4 py-1">
          <span className="text-xs lowercase text-white">{language}</span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Copy code"
              className="flex items-center gap-1.5 rounded bg-none p-1 text-xs text-white hover:bg-zinc-600 transition-colors"
              onClick={onCopy}
            >
              {isCopied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {isCopied ? "Copied!" : "Copy code"}
            </button>
            <button
              aria-label="Download code"
              className="flex items-center rounded bg-none p-1 text-xs text-white hover:bg-zinc-600 transition-colors"
              onClick={downloadAsFile}
            >
              <Download className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {shouldRender ? (
        <Suspense fallback={<CodeSkeleton />}>
          <LazyHighlighter language={language} value={value} />
        </Suspense>
      ) : (
        <CodeSkeleton />
      )}
    </div>
  );
};

// Componente separado para el highlighter
const LazyHighlighter = ({ language, value }: { language: string; value: string }) => {
  const [style, setStyle] = useState<any>(null);

  useEffect(() => {
    // Cargar el estilo de forma asíncrona
    import("react-syntax-highlighter/dist/cjs/styles/prism")
      .then((module: any) => setStyle(module.oneDark))
      .catch(() => setStyle({})); // Fallback a estilo vacío
  }, []);

  return (
    <SyntaxHighlighter
      language={language}
      style={style || {}}
      PreTag="div"
      showLineNumbers
      customStyle={{
        margin: 0,
        width: "100%",
        padding: "1.5rem 1rem",
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
      }}
      codeTagProps={{
        style: {
          fontSize: "0.9rem",
          fontFamily: "var(--font-inter)",
        },
      }}
    >
      {value}
    </SyntaxHighlighter>
  );
};

LazyCodeBlock.displayName = "LazyCodeBlock";

export { LazyCodeBlock };
