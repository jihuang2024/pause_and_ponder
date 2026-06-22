Deno.serve(() => new Response("Hello from Pause & Ponder!", {
  headers: { "content-type": "text/plain" },
}));
