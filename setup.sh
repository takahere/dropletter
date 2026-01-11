#!/bin/bash

# DropLetter - Initial Setup Script
# This script creates the complete project structure for the DropLetter SaaS

set -e

echo "=== DropLetter Setup Script ==="
echo ""

# =============================================================================
# 1. Create Directory Structure
# =============================================================================
echo "[1/6] Creating directory structure..."

mkdir -p .claude/skills
mkdir -p .claude/agents
mkdir -p src/app/api/chat
mkdir -p src/lib/agents
mkdir -p src/lib/supabase
mkdir -p src/components/ui
mkdir -p inngest/functions
mkdir -p public

echo "  - Directories created"

# =============================================================================
# 2. Create Configuration Files
# =============================================================================
echo "[2/6] Creating configuration files..."

# package.json
cat > package.json << 'EOF'
{
  "name": "dropletter",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@anthropic-ai/sdk": "^0.39.0",
    "groq-sdk": "^0.9.1",
    "ai": "^4.1.0",
    "@ai-sdk/anthropic": "^1.1.0",
    "llamaindex": "^0.8.0",
    "inngest": "^3.29.0",
    "@liveblocks/client": "^2.14.0",
    "@liveblocks/react": "^2.14.0",
    "@supabase/supabase-js": "^2.47.0",
    "@supabase/ssr": "^0.5.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.469.0",
    "framer-motion": "^11.15.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "typescript": "^5.7.2",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "14.2.21"
  }
}
EOF

# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
EOF

# tailwind.config.ts
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
export default config
EOF

# postcss.config.js
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# .env.example
cat > .env.example << 'EOF'
# Anthropic
ANTHROPIC_API_KEY=

# Groq
GROQ_API_KEY=

# LlamaParse
LLAMA_CLOUD_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Liveblocks
LIVEBLOCKS_SECRET_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
EOF

# .gitignore
cat > .gitignore << 'EOF'
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
EOF

echo "  - Configuration files created"

# =============================================================================
# 3. Create Source Code Files
# =============================================================================
echo "[3/6] Creating source code files..."

# src/app/globals.css
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF

# src/app/layout.tsx
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DropLetter",
  description: "AI-powered document processing system",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOF

# src/app/page.tsx
cat > src/app/page.tsx << 'EOF'
import { Dropzone } from "@/components/dropzone"

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">DropLetter</h1>
        <p className="text-muted-foreground mb-8">
          AI-powered document processing system
        </p>
        <Dropzone />
      </div>
    </main>
  )
}
EOF

# src/app/api/chat/route.ts
cat > src/app/api/chat/route.ts << 'EOF'
import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: anthropic("claude-3-5-sonnet-latest"),
    messages,
    system: `You are a helpful document processing assistant.
You help users understand and analyze their documents.`,
  })

  return result.toDataStreamResponse()
}
EOF

# src/lib/utils.ts
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

# src/lib/agents/runner.ts
cat > src/lib/agents/runner.ts << 'EOF'
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export interface AgentResult {
  success: boolean
  output: string
  error?: string
}

export async function runAgent(
  systemPrompt: string,
  userMessage: string
): Promise<AgentResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    const textContent = response.content.find((block) => block.type === "text")
    const output = textContent?.type === "text" ? textContent.text : ""

    return {
      success: true,
      output,
    }
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
EOF

# src/lib/supabase/client.ts
cat > src/lib/supabase/client.ts << 'EOF'
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
EOF

# src/components/dropzone.tsx
cat > src/components/dropzone.tsx << 'EOF'
"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, File, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  name: string
  size: number
  type: string
}

export function Dropzone() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))

    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">
          Drop your documents here
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          PDF, Word, or text files
        </p>
      </motion.div>

      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={`${file.name}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-3 p-3 bg-muted rounded-lg"
          >
            <File className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => removeFile(index)}
              className="p-1 hover:bg-background rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
EOF

# src/components/streaming-status.tsx
cat > src/components/streaming-status.tsx << 'EOF'
"use client"

import { motion } from "framer-motion"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

type Status = "idle" | "loading" | "success" | "error"

interface StreamingStatusProps {
  status: Status
  message?: string
}

export function StreamingStatus({ status, message }: StreamingStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {status === "loading" && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-4 h-4 text-primary" />
        </motion.div>
      )}
      {status === "success" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <CheckCircle className="w-4 h-4 text-green-500" />
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <AlertCircle className="w-4 h-4 text-destructive" />
        </motion.div>
      )}
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  )
}
EOF

# inngest/client.ts
cat > inngest/client.ts << 'EOF'
import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "dropletter",
  name: "DropLetter",
})
EOF

# inngest/functions/process-document.ts
cat > inngest/functions/process-document.ts << 'EOF'
import { inngest } from "../client"

export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    name: "Process Document",
  },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    const { fileUrl, fileName } = event.data

    // Step 1: Parse document with LlamaParse
    const parsed = await step.run("parse-document", async () => {
      // TODO: Implement LlamaParse integration
      return {
        text: "",
        metadata: {},
      }
    })

    // Step 2: Analyze with AI
    const analysis = await step.run("analyze-document", async () => {
      // TODO: Implement AI analysis
      return {
        summary: "",
        entities: [],
        sentiment: "",
      }
    })

    // Step 3: Store results
    await step.run("store-results", async () => {
      // TODO: Store in Supabase
      return { success: true }
    })

    return {
      fileName,
      parsed,
      analysis,
    }
  }
)
EOF

echo "  - Source code files created"

# =============================================================================
# 4. Create Claude Skills and Agents
# =============================================================================
echo "[4/6] Creating Claude skills and agents..."

# .claude/skills/llama-parse.md
cat > .claude/skills/llama-parse.md << 'EOF'
# LlamaParse Skill

## Description
Parse PDF documents into structured data using LlamaParse API.
This skill extracts text, tables, and images from PDF documents.

## Input
- `file_url`: URL or path to the PDF file
- `options`: Optional parsing configuration

## Output
- `text`: Extracted text content
- `tables`: Array of extracted tables
- `images`: Array of extracted images with descriptions
- `metadata`: Document metadata

## Usage
```typescript
import { LlamaParseReader } from "llamaindex"

const reader = new LlamaParseReader()
const documents = await reader.loadData(filePath)
```

## API Key Required
Set `LLAMA_CLOUD_API_KEY` environment variable.
EOF

# .claude/skills/document-analysis.md
cat > .claude/skills/document-analysis.md << 'EOF'
# Document Analysis Skill

## Description
Analyze documents to extract key information, summarize content,
and identify important entities.

## Capabilities
- Summarization: Generate concise summaries
- Entity extraction: Identify people, organizations, dates, etc.
- Sentiment analysis: Determine document tone
- Key phrase extraction: Find important terms

## Input
- `text`: Document text content
- `analysis_type`: Type of analysis to perform

## Output
- `summary`: Brief summary of the document
- `entities`: List of extracted entities
- `sentiment`: Overall sentiment score
- `key_phrases`: Important phrases
EOF

# .claude/agents/document-processor.md
cat > .claude/agents/document-processor.md << 'EOF'
# Document Processor Agent

## Role
You are a document processing specialist. Your job is to:
1. Accept uploaded documents
2. Parse them using LlamaParse
3. Analyze the content
4. Return structured insights

## Skills
- llama-parse: For PDF parsing
- document-analysis: For content analysis

## Workflow
1. Receive document upload event
2. Parse document to extract text
3. Analyze text for key information
4. Store results in database
5. Return summary to user

## Guidelines
- Always validate file types before processing
- Handle errors gracefully
- Provide progress updates during long operations
- Respect document confidentiality
EOF

echo "  - Claude skills and agents created"

# =============================================================================
# 5. Install Dependencies
# =============================================================================
echo "[5/6] Installing dependencies..."
npm install

# =============================================================================
# 6. Initialize Shadcn UI
# =============================================================================
echo "[6/6] Initializing Shadcn UI..."
npx shadcn@latest init -d -y --defaults
npx shadcn@latest add button card -y

# =============================================================================
# Done
# =============================================================================
echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and fill in your API keys"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Open http://localhost:3000 in your browser"
echo ""
