/**
 * Routes that launch a browser on the server (local browser, native browser,
 * PC research, clean-room rebuild) accept same-origin requests from whichever
 * host serves the app: a laptop on localhost or a self-hosted server with uv
 * and Chromium. Cross-site requests and an Origin that names another host are
 * refused. Forwarded headers are never trusted; only the actual Host and Origin
 * are compared, by host rather than scheme so a TLS-terminating proxy in front
 * of the server still passes.
 *
 * Vercel serverless functions cannot spawn Chromium, so that deployment is
 * refused with an explanation instead of a confusing spawn failure.
 */
export function requireBrowserRunOrigin(request: Request, feature: string) {
  if (process.env.VERCEL)
    throw Error(
      `${feature} needs a server that can launch Chromium with uv; Vercel serverless functions cannot. Run the app on your own machine or server.`,
    );
  const url = new URL(request.url);
  if (!["http:", "https:"].includes(url.protocol))
    throw Error(`${feature} is available only over HTTP or HTTPS.`);
  const host = request.headers.get("host") || url.host;
  const validHost =
    /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d+)?$/i.test(host);
  const origin = request.headers.get("origin");
  let originHost: string | null = null;
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (
        ["http:", "https:"].includes(parsed.protocol) &&
        !parsed.username &&
        !parsed.password
      )
        originHost = parsed.host;
    } catch {
      originHost = null;
    }
  }
  if (
    !validHost ||
    (origin && originHost?.toLowerCase() !== host.toLowerCase()) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw Error(
      `${feature} is available only from this app's own pages (same origin).`,
    );
}
