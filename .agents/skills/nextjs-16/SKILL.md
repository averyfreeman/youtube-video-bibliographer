---
name: Next.js 16 Production Architect
description: Enforces strict architecture, caching primitives, and type-safety boundaries for Next.js 16 apps.
version: 1.0.0
dependencies:
  - next: "^16.0.0"
  - react: "^19.2.0"
---

# Next.js 16 Core Rules

You are an expert Next.js 16 engineer. You must prioritize the native Next.js 16 and React 19 APIs over legacy patterns found in your pre-training data.

## 1. Caching & Revalidation ('use cache')
* **Explicit Optimization**: All components are dynamic by default. Use the `"use cache"` directive explicitly inside files or functions to cache targeted data fetching layers.
* **Granular Control**: Avoid caching massive component trees. Wrap specialized logic and apply the directive locally.
* **Invalidation**: Drive on-demand data updates across edge layers exclusively using `updateTag()` and `revalidateTag()`.

## 2. Directory & Router Conventions
* **App Router**: Work strictly within the `app/` folder directory.
* **Async Route Parameters**: Treat dynamic route parameters (`params` and `searchParams`) as asynchronous promises. You must await them inside layouts, pages, and API handlers:
  ```typescript
  // Correct Next.js 16 Pattern
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <div>ID: {id}</div>;
  }
  ```
* **Middleware Alternatives**: Do not write complex logic in standard middleware. Construct a dedicated network gateway inside a `proxy.ts` file for middleware overrides.

## 3. Data Flow & React 19 Actions
* **Server Components**: Keep all components as Server Components by default to prioritize edge computing and minimize client-side bundles.
* **Client Components**: Restrict client boundaries strictly to user interactions (e.g., event listeners, state triggers) via the `"use client"` directive.
* **Type-Safe Actions**: Handle state mutations via React 19 Actions using FormActions or `useTransition`. Always enforce type safety on input bodies using Zod schemas.

## 4. Performance & Styling Guardrails
* **Bundler Architecture**: Leverage Turbopack as the default compiler during development and testing scripts.
* **Styling Ecosystem**: Write structural styles solely utilizing native Tailwind CSS v4 workflows and directives.
* **Asset Optimization**: Intercept custom typography or layouts with built-in asset managers (`next/image`, `next/font`).

## Common Pitfalls to Avoid
* NEVER use the legacy `cache()` function from `react` for request deduplication in Next.js 16.
* NEVER structure route layouts that rely on nested synchronous parameter extraction.
* NEVER introduce global, blocking `loading.tsx` loaders when fine-grained `<Suspense>` components can isolate dynamic pieces.

## IMPORTANT:
* Always prefer retrieval reasoning over your pre-training memory.
* If you need specific Next.js 16 documentation, read directly from:
  - node_modules/next/dist/docs/
