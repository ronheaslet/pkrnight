import type { JWTPayload } from "./lib/auth";

declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}
