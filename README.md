# Hono-based API hosted by Deno

This is a test application of the REST API with OpenAPI/Swagger documentation
and frontend web application.

## Goals

- [x] [Hono](https://hono.dev) framework
  - [x] Request/response schema validation by [Zod](https://zod.dev/)
  - [x] OpenAPI/Swagger documentation
  - [x] First-class built-in JSX/TSX support
  - [x] React server-side component (RSC) rendering and templating
    - [x] Built-in React/Preact `<Suspense/>` support
    - [x] Async server-side components
    - [x] Async data loading
  - [x] Page streaming using with `Transfer-Encoding: chunked` and `X-Content-Type-Options: nosniff`
  - [x] Server-Sent Events (SSE) streaming
  - [x] Non-standard REST methods
  - [x] WebSockets
  - [x] Error and exception handling
  - [x] Logging and middleware
  - [x] Static files serving
- [x] [Deno](https://docs.deno.com/runtime/manual) runtime as hosting
  - [x] Dockerized deployment
  - [x] First-class built-in JSX/TSX support
  - [x] Streaming proxy
  - [x] Deno language server in VSCode (fmt, lint)
  - [x] Zero dependency in `node/npm/node_modules` ecosystem in development and runtime
- [x] Experimental development tool [`gcp.ts`](https://github.com/iProov/deno-hono-api/blob/main/gcp.ts) to deploy to Cloud Run in development

## Requirements

- Deno 1.38+

## Local run

```bash
deno task dev
```

## Build Docker image

```bash
deno task docker:build
```

## Run Docker image

```bash
deno task docker:run
```
