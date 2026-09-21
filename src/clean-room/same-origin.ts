import { requireBrowserRunOrigin } from "../../lib/browserRunOrigin";
/** Rebuild runs launch Chromium on the server; see lib/browserRunOrigin.ts. */
export function requireRebuildOrigin(request: Request) {
  requireBrowserRunOrigin(request, "Clean-room browser runs");
}
