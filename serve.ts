// Dependency-free static server for the LABrador functional frontend.
// Serves only app/ — the frozen mockup file stays in the repo for the
// verifier (node verify_mockup.mjs) but is no longer served.
// Usage: bun serve.ts [port]   (default 4173, loopback only)
const port = Number(process.argv[2] ?? 4173);
const root = `${import.meta.dir}/app`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const name = path.endsWith("/") ? `${path}index.html` : path;
    if (name.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }
    const file = Bun.file(root + name);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  },
});

console.log(`Serving ${root} at http://localhost:${server.port}/`);
