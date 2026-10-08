---
name: api-schema
description: Add an API endpoint to the contract — zod schema and DTO in app/lib/schemas, a server fetcher in app/lib/data or a client query in app/lib/queries, an MSW handler and a factory — from its OpenAPI path.
---

# API schema

The OpenAPI document is the contract: https://api-dev.redoctorapp.com/api/v1/docs.json
(read the path before writing anything). One contract, three consumers:
`app/lib/data` (server), `app/lib/queries` (client) and `tests/msw` all parse
with the same schema. No duplicated types.

## Steps

1. Schema: `app/lib/schemas/<domain>.ts` — a zod schema for the response
   (and the request body when there is one), named after the API resource,
   plus a `to<Entity>` mapper that returns a DTO with only what the UI needs.
   Nothing sensitive leaks into DTOs (no storage keys, no reasons, no tokens).
   Export the inferred types next to the schema.
2. Reader:
   - Public data rendered on the server → `app/lib/data/<domain>.ts`
     (`import 'server-only'`): `fetch` through `app/lib/api/client`, with
     `next: { revalidate, tags }`, parse with the schema, return the DTO.
     404 → `null`, other failures → throw `ApiError`.
   - Data that needs the user's session → `app/lib/queries/<domain>.ts`:
     `queryOptions` with keys by domain and id, explicit `staleTime`, and
     mutation functions. Writes that must not land twice go through the
     write-once guard of `app/lib/api/write-once`.
3. Errors: known codes get their copy key in `app/lib/api/errors.ts` and in
   `app/lib/i18n/messages/es.json` (`apiErrors.*`, mirroring the app).
4. Mock: `tests/msw/handlers/<domain>.ts` built from a factory in
   `tests/factories/<domain>.ts`; register it in `tests/msw/handlers/index.ts`.
5. Tests: schema parsing with a real-shaped fixture, the fetcher against MSW
   (success, 404, error envelope), retry behavior if the method retries.
6. Run `pnpm check` and summarize in Spanish.
