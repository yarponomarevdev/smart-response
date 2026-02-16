# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Smart Response - платформа для создания интеллектуальных форм с AI-генерацией контента. Позволяет создавать формы, которые анализируют данные пользователей (URL, файлы, кастомные поля) и генерируют персонализированные ответы с помощью OpenAI API.

**Tech Stack**: Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + Auth + Storage), OpenAI API, Tailwind CSS, shadcn/ui

## Development Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint (note: TypeScript errors ignored in build via next.config.mjs)
```

## Critical Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only, NEVER expose to client)
- `OPENAI_API_KEY` - OpenAI API key for text/image generation
- `RESEND_API_KEY` - Resend API key for email notifications

See `.env.example` for full list.

## Architecture Overview

### Server vs Client Supabase Clients

**CRITICAL**: This app uses two different Supabase client patterns that MUST be used correctly:

1. **Server-side**: `createClient()` from `@/lib/supabase/server.ts`
   - Use in Server Components, Server Actions, API Routes
   - Handles cookies automatically for authentication
   - Has special domain/subdomain cookie handling for cross-domain auth

2. **Client-side**: `createClient()` from `@/lib/supabase/client.ts`
   - Use in Client Components only
   - Browser-based authentication

**When adding Supabase calls**, determine context first:
- Server Action (files in `app/actions/`) → use server client
- API Route (`app/api/*/route.ts`) → use server client  
- Client Component with `"use client"` → use client client

### Data Flow Architecture

1. **Public Forms** (`app/form/[slug]/page.tsx`)
   - Public-facing form submission interface
   - No authentication required
   - Submits to `/api/generate` for AI content generation
   - Creates lead record in `leads` table

2. **Admin Dashboard** (`app/(main)/`)
   - Authenticated area for form management
   - Protected by Supabase Auth middleware
   - Server Actions in `app/actions/` handle CRUD operations

3. **AI Generation** (`app/api/generate/route.ts`)
   - Accepts form data + URL + custom fields
   - Fetches knowledge base files from Supabase Storage
   - Fetches URL content (with fallback to Jina Reader proxy for blocked sites)
   - Calls OpenAI API (text generation via `streamText`)
   - Returns streaming response for text, static response for images

4. **Server Actions** (`app/actions/`)
   - `forms.ts` - Form CRUD, ownership checks, quota validation
   - `form-fields.ts` - Dynamic form field management
   - `leads.ts` - Lead management, status updates
   - `storage.ts` - File uploads to Supabase Storage (knowledge base)
   - `system-settings.ts` - Global AI prompts, quotas (superadmin only)
   - `users.ts` - User management, role changes (superadmin only)

### Database Schema (Key Tables)

- `users` - User accounts (id matches auth.users), roles (user/superadmin), quotas (max_forms, max_generations, max_storage)
- `forms` - User-created forms, AI prompts, theme settings, lead limits
- `form_fields` - Dynamic form fields (text, url, select, multi-select, checkbox, image, heading, disclaimer)
- `form_knowledge_files` - Uploaded knowledge base files linked to forms (PDF, DOCX, TXT, MD, CSV, JSON)
- `leads` - Form submissions with generated content, status tracking
- `system_settings` - Global AI settings (text/image models, system prompts)

**RLS (Row Level Security)**: All tables have RLS policies. Users can only access their own forms/leads. Superadmins can read all data.

### File Upload Flow

1. Client uploads file via Server Action (`uploadKnowledgeFile` in `app/actions/storage.ts`)
2. File saved to Supabase Storage bucket: `knowledge-files`
3. Metadata stored in `form_knowledge_files` table
4. During generation, files fetched from Storage and parsed by `lib/file-parser.ts`
5. Text extracted and included in AI context (images converted to base64 for multimodal API)

### Quota System

Users have three quotas (NULL = unlimited):
- `max_forms` - Max number of forms user can create
- `max_generations` - Max AI generations allowed (checked in `/api/check-usage`)
- `max_storage` - Max storage in bytes for knowledge base files

Quotas checked before:
- Creating forms (`canCreateMoreForms` in `app/actions/forms.ts`)
- Generating AI content (`/api/check-usage`)
- Uploading files (`app/actions/storage.ts`)

## Key Patterns & Conventions

### TypeScript Configuration

- Path alias: `@/*` maps to root directory
- Strict mode enabled
- **Build configuration**: `typescript.ignoreBuildErrors: true` in `next.config.mjs` - TypeScript errors won't block builds

### Internationalization

- Translations in `lib/i18n/translations/`
- Supported languages: Russian (ru), English (en)
- Use `lib/i18n/client.ts` utilities for client-side translations
- User language preference stored in Supabase `users.language` column

### AI Generation

**Models (configurable in system_settings)**:
- Text: GPT-5 (default) via `@ai-sdk/openai`

**Prompt Composition**:
1. Global system prompt (from `system_settings.global_text_prompt`)
2. Form-specific prompt (from `forms.ai_system_prompt`)
3. Knowledge base context (files from `form_knowledge_files`)
4. URL content (if URL field present in form)
5. User-provided custom field values

**IMPORTANT**: The `/api/generate` endpoint has `maxDuration = 300` (5 minutes) to handle long-running AI requests.

### Form Field Types

Supported field types in `form_fields`:
- `text` - Single-line text input
- `url` - URL input (triggers website content fetching)
- `select` - Dropdown select (options in JSON array)
- `multi-select` - Multiple choice checkboxes (options in JSON array)
- `checkbox` - Single checkbox
- `image` - Image upload field
- `heading_h1`, `heading_h2`, `heading_h3` - Display-only headings
- `disclaimer` - Display-only disclaimer text

Fields support:
- Custom labels and placeholders
- Required/optional validation
- Drag-and-drop reordering via `@dnd-kit`

### API Routes with CORS

Public API routes (e.g., `/api/generate`) include CORS headers to support embedding forms on external sites:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
```

### Email Notifications

- Uses Resend API (`resend` package)
- Templates in `@react-email/render` format
- Emails sent via `/api/send-email` route
- Triggers:
  - New lead notification to form owner (if `notify_on_new_lead` enabled)
  - Result delivery to respondent (if `send_email_to_respondent` enabled)

## Database Migrations

SQL migrations in `supabase/` directory. Apply manually via Supabase Dashboard or CLI in order of numbering (012_*, 013_*, etc.).

**Migration naming pattern**: `###_description.sql` where ### is sequence number.

## Development Principles (from README)

- **KISS** - Simple solutions
- **YAGNI** - Only necessary functionality  
- **DRY** - Reusable code
- **Single Responsibility** - One responsibility per component

## Testing

**NOTE**: No test framework is currently configured. Do NOT assume Jest/Vitest/etc. exists. Check `package.json` before suggesting test commands.

## Common Gotchas

1. **Cookie Domain Issues**: The server Supabase client has custom logic to set cookies across subdomains (`.example.com` format). Do not modify cookie settings without understanding this.

2. **TypeScript Errors**: Build won't fail on TS errors due to `ignoreBuildErrors: true`. Always check types manually.

3. **Image Optimization Disabled**: `next.config.mjs` has `images.unoptimized: true` - all images served as-is.

4. **HEIC Image Conversion**: The app converts HEIC images to JPEG using `heic-convert` package. Keep this dependency when handling image uploads.

5. **URL Fetching with Fallback**: When fetching URL content fails (403/429 errors), the system falls back to Jina Reader proxy (`https://r.jina.ai/`). This is intentional for anti-scraping protection.

6. **Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Only use in Server Actions/API Routes, never expose to client.

7. **File Size Limits**:
   - Respondent uploads: 1 MB (`MAX_FILE_SIZE` in `lib/constants/storage.ts`)
   - Knowledge base files: Limited by user's `max_storage` quota
   - Extracted text from files: 50,000 characters max (`MAX_TEXT_LENGTH` in `lib/file-parser.ts`)

## Directory Structure Reference

```
app/
├── (main)/              # Authenticated admin dashboard
├── actions/             # Server Actions for data mutations
├── api/                 # API routes (generate, check-usage, send-email, etc.)
├── form/[slug]/         # Public form pages
└── auth/                # Authentication pages

components/
├── editor/              # Form builder components (field editor, tabs)
└── ui/                  # shadcn/ui components

lib/
├── ai/                  # OpenAI client setup
├── constants/           # Storage limits, constants
├── hooks/               # React Query hooks for forms, fields, leads
├── i18n/                # Internationalization utilities
├── supabase/            # Supabase client factories (server/client)
├── utils/               # Utility functions
├── file-parser.ts       # File text extraction (PDF, DOCX, etc.)
└── utils.ts             # Generic utilities (cn, etc.)

supabase/                # Database migration SQL files
```

## Security Notes

- All tables protected by RLS policies
- Superadmin role (`users.role = 'superadmin'`) has read access to all forms/leads
- Regular users can only access their own data
- Public form submission does NOT require authentication
- File uploads validated for size and type before storage
