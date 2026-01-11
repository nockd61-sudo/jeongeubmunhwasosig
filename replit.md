# 정읍에서뭐하지 (What to do in Jeongeup)

## Overview

This is a personal community platform for Jeongeup City (정읍시), South Korea, operated by "친절한 세웅씨" (Kind Sewoong). The platform allows residents and visitors to share and discover information about cultural events, festivals, exhibitions, performances, local products, and community news. This is NOT an official government website.

Built as a full-stack TypeScript application with a React frontend and Express backend, it follows Material Design principles optimized for Korean language content and accessibility.

## User Preferences

- Preferred communication style: Simple, everyday language
- Site operator: 친절한 세웅씨 (personal, not government)
- Categories: 문화행사, 축제, 전시, 공연, 기타소식 (changed from 시정소식)

## Key Features

### Content Management
- **Cultural Events**: Display events with categories, dates, and locations
- **기타소식 (Other News)**: General news and announcements
- **정읍상품관 (Product Shop)**: Local products marketplace
- **Guest Posts**: User-submitted content with admin moderation workflow

### User-Generated Content System
- Guests can submit posts (events, news, products, general)
- Posts require admin approval before being published
- Admin panel for approving/rejecting submissions
- Three post states: pending, approved, rejected

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Theme System**: Light/dark mode with CSS variables and localStorage persistence
- **Typography**: Noto Sans KR (Korean) and Inter (Latin) font families

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Validation**: Zod schemas for input validation
- **Build System**: Vite for frontend, esbuild for server bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Definition**: Shared TypeScript types in `shared/schema.ts`
- **Validation**: Zod schemas for API input validation
- **Storage Pattern**: Interface-based storage abstraction (`IStorage`) with in-memory implementation

### API Endpoints
- `GET /api/events` - List cultural events
- `GET /api/news` - List news items
- `GET /api/products` - List products
- `GET /api/guest-posts` - List all guest posts (admin)
- `GET /api/guest-posts/approved` - List approved guest posts (public)
- `POST /api/guest-posts` - Submit new guest post
- `PATCH /api/guest-posts/:id/status` - Update post status (approve/reject)
- `GET /api/sources` - List external data sources
- `POST /api/sync` - Sync external data

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
│   └── data-sync.ts # External data integration
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
