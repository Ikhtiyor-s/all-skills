---
name: openapi-from-codebase
description: Generates an OpenAPI/Swagger specification by reading a project's existing route/handler code — for stacks with no built-in spec generation (Express, Next.js API routes, and similar). Use when the user asks for Swagger docs, an OpenAPI spec, or API documentation "from the code"/"kod bazasidan". Always check for a framework-native generator first (FastAPI, NestJS with @nestjs/swagger, Flask-RESTX) — this skill is for when none exists.
---

# OpenAPI From Codebase

Reads a project's actual route handlers and writes a real, validated OpenAPI 3.0 document — no prior spec or Postman collection required. (Postman's own `api-documentation` skill assumes a spec/collection already exists; this is the step before that, for stacks that don't auto-generate one.)

## Step 0: check whether this is even needed

Some frameworks already generate OpenAPI natively — **don't duplicate that work**:
- **FastAPI**: serves `/openapi.json` and Swagger UI at `/docs` automatically from the route code's type hints/Pydantic models. If the project is FastAPI, tell the user it's already there — just run the server and open `/docs`. Nothing to build.
- **NestJS** with `@nestjs/swagger` already wired, or **Flask** with `flasgger`/`flask-restx`: same — check for the decorator/setup first; if present, point the user at the existing output instead of generating a second, divergent spec.

Only proceed past this point for stacks with no such generator in place — most commonly **Express/TypeScript** route files and **Next.js API routes** (App Router `app/api/**/route.ts`, or Pages Router `pages/api/**/*.ts`).

## Mechanics

1. **Find the routes.** Express: `router.get/post/put/patch/delete(path, ...handlers)` calls, usually under `src/routes/` or similar. Next.js App Router: every `route.ts` exporting `GET`/`POST`/etc. functions, with the path derived from its folder (`app/api/orders/[id]/route.ts` → `/orders/{id}`). Pages Router: `pages/api/**/*.ts`, one file per route, `[id].ts` → `{id}`.

2. **Read each handler** (and whatever it imports) to determine, per operation:
   - **Request shape**: a Zod/Yup/Joi schema used for validation, a TypeScript interface/type on `req.body`, or a Prisma model referenced for the write — any of these is a reliable source for `requestBody`. If none exists (raw `req.body.x` access with no validation), infer the shape from usage but say in the report that it's inferred, not verified.
   - **Response shape(s)**: every distinct `res.status(N).json(...)`/`NextResponse.json(..., {status:N})` call is a separate response entry under that status code — don't collapse a 200 success and a 404 error into one shared schema.
   - **Path/query parameters**: from the route path itself (`:id`/`[id]`) and from `req.query`/`searchParams` reads in the body.
   - **Auth**: a recognizable auth middleware (`requireAuth`, `authenticateApiToken`, a `Bearer` header check, a session/cookie check) → mark the operation as requiring that security scheme; an explicitly public/unauthenticated route → no security requirement, don't guess one onto it.

3. **Group into tags** by resource (top-level path segment, or the route file's folder) so the generated doc reads as organized sections, not one flat list.

4. **Write `openapi.yaml`** (ask where, default to the project root) as OpenAPI 3.0.3: `info` (title/version — pull version from `package.json` if present), a `components.securitySchemes` entry for whatever auth was detected, `components.schemas` for the request/response shapes (reused across operations via `$ref`, not inlined-and-duplicated), and `paths` with one operation per route found in step 1-2.

5. **Validate before reporting success:**
   ```
   node scripts/validate.mjs --spec openapi.yaml
   ```
   Prints `{ok, openapiVersion, title, version, pathCount, operationCount, schemaCount}` on success, or `{ok:false, error}` naming exactly what's wrong (bad `$ref`, missing required field, etc.) — fix the spec and re-run until it passes. Never hand back a spec you haven't run this against.

6. **Report**: operation count vs. the number of routes actually found in step 1 (if they don't match, say which routes were skipped and why — don't silently drop one), and which request/response shapes were inferred rather than taken from an explicit schema (step 2's caveat) so the user knows what to double-check.

## Limitations

- This documents what the code currently does, not what it *should* do — a genuinely undocumented/inconsistent endpoint produces a spec that faithfully describes the inconsistency. Flag anything that looks like a bug rather than silently "fixing" it into a cleaner spec.
- Doesn't handle GraphQL, gRPC, or WebSocket endpoints — OpenAPI itself only models REST-shaped HTTP.
