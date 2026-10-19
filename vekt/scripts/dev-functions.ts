// Local dev runner for the VEKT edge functions under plain Deno.
//
// Why: the Supabase edge-runtime container can't always fetch remote imports
// (e.g. behind a TLS-intercepting proxy). Plain Deno can (DENO_CERT works),
// so this loads every function in one process and serves them at
//   http://127.0.0.1:54331/functions/v1/<name>
// Everything else (/rest, /auth, ...) is proxied to the local Supabase
// gateway, so SUPABASE_URL can point here and functions calling each other
// behave as they do in production.
//
// Run: deno run --allow-net --allow-env --allow-read scripts/dev-functions.ts
// (npm run functions does this with the local env file.)

const PORT = Number(Deno.env.get("DEV_FUNCTIONS_PORT") ?? 54331);
const UPSTREAM = Deno.env.get("DEV_SUPABASE_UPSTREAM") ?? "http://127.0.0.1:54321";
const NAMES = ["vekt-invites", "vekt-webhook", "vekt-fit-read", "vekt-coach", "vekt-ghl-webhook"];

type Handler = (req: Request) => Response | Promise<Response>;
const handlers = new Map<string, Handler>();
const realServe = Deno.serve;
let loading = "";

// Capture each function's handler instead of letting it bind a port.
(Deno as unknown as { serve: unknown }).serve = (a: unknown, b?: unknown) => {
  const h = (typeof a === "function" ? a : b ?? (a as { handler: Handler }).handler) as Handler;
  handlers.set(loading, h);
  return { finished: Promise.resolve(), shutdown: async () => {}, ref() {}, unref() {}, addr: { port: PORT } };
};

for (const name of NAMES) {
  loading = name;
  const url = new URL(`../supabase/functions/${name}/index.ts`, import.meta.url);
  await import(url.href);
  console.log(`loaded ${name}`);
}
(Deno as unknown as { serve: unknown }).serve = realServe;

realServe({ port: PORT, hostname: "127.0.0.1" }, async (req) => {
  const url = new URL(req.url);
  const m = url.pathname.match(/^\/functions\/v1\/([a-z0-9-]+)/);
  if (m) {
    const h = handlers.get(m[1]);
    if (!h) return new Response(JSON.stringify({ error: `no function ${m[1]}` }), { status: 404 });
    try {
      return await h(req);
    } catch (e) {
      console.error(`${m[1]} crashed:`, (e as Error).message);
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
  }
  const target = UPSTREAM + url.pathname + url.search;
  const res = await fetch(target, {
    method: req.method, headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
});
console.log(`VEKT functions on http://127.0.0.1:${PORT}/functions/v1/<name> (proxying the rest to ${UPSTREAM})`);
