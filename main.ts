// Temporary: test deploy without KV to confirm pipeline is working
Deno.serve(() => new Response("Login page coming — pipeline test v2", {
  headers: { "content-type": "text/plain; charset=utf-8" },
}));
