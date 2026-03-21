# Project Conventions

## File Structure Rules

- **One entity per file**: each DTO, interface, type, and enum must be in its own dedicated file. Never group multiple entities in one file.
- **Naming conventions**:
  - DTOs: `kebab-case.dto.ts` (e.g., `create-user.dto.ts`)
  - Interfaces: `kebab-case.interface.ts` (e.g., `user.interface.ts`)
  - Types: `kebab-case.type.ts` (e.g., `pagination-params.type.ts`)
  - Enums: `kebab-case.enum.ts` (e.g., `chat-type.enum.ts`)
- **No `I` prefix**: interface and type names must not start with `I` (e.g., `User` instead of `IUser`).
- Use barrel `index.ts` files to re-export entities from directories.
- **No wildcard re-exports**: always use named exports (`export { Foo } from './foo'`), never `export * from`.
