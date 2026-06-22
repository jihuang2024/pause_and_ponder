Deno.serve(() => new Response("Hi from Pause & Ponder! ☀", {
  headers: { "content-type": "text/plain" },
}));
