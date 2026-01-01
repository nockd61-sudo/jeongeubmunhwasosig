# Jeongeup City Cultural Information App

## Overview

This is a civic cultural information web application for Jeongeup City (정읍시), South Korea. The app provides residents and visitors with information about cultural events, festivals, exhibitions, performances, and city news. Built as a full-stack TypeScript application with a React frontend and Express backend, it follows Material Design principles optimized for Korean language content and accessibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for Korean civic design
- **Theme System**: Light/dark mode with CSS variables and localStorage persistence
- **Typography**: Noto Sans KR (Korean) and Inter (Latin) font families

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Build System**: Vite for frontend, esbuild for server bundling
- **Development**: Hot module replacement via Vite dev server

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Definition**: Shared TypeScript types in `shared/schema.ts`
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Storage Pattern**: Interface-based storage abstraction (`IStorage`) with in-memory implementation for development

### Project Structure
```
├── client/          # React frontend application
│   └── src/
│       ├── components/  # UI components (shadcn/ui)
│       ├── pages/       # Route page components
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities and query client
├── server/          # Express backend
│   ├── routes.ts    # API endpoint definitions
│   ├── storage.ts   # Data access layer
│   └── static.ts    # Static file serving
├── shared/          # Shared types and schemas
└── migrations/      # Drizzle database migrations
```

### Design Patterns
- **Monorepo Structure**: Client and server in single repository with shared types
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **Component Library**: Pre-built accessible components via shadcn/ui
- **API Client**: Centralized fetch wrapper with error handling in `queryClient.ts`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migration and schema push tooling

### UI Framework Dependencies
- **Radix UI**: Headless accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management
- **date-fns**: Date formatting with Korean locale support

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit integration (dev only)