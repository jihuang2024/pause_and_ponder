const kv = await Deno.openKv();

// ── Crypto ───────────────────────────────────────────────────────────────────

async function hashPw(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    // deno-lint-ignore no-explicit-any
    { name: "PBKDF2", hash: "SHA-256", salt: salt as any, iterations: 100_000 }, key, 256,
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function toHex(b: Uint8Array): string {
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function fromHex(h: string): Uint8Array {
  return new Uint8Array(h.match(/.{2}/g)!.map(x => parseInt(x, 16)));
}

function randHex(n: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(n)));
}

// ── Sessions ─────────────────────────────────────────────────────────────────

async function sessionUser(req: Request): Promise<string | null> {
  const m = (req.headers.get("cookie") ?? "").match(/session=([a-f0-9]{64})/);
  if (!m) return null;
  return (await kv.get<string>(["sessions", m[1]])).value ?? null;
}

async function makeSession(username: string): Promise<string> {
  const tok = randHex(32);
  await kv.set(["sessions", tok], username, { expireIn: 7 * 24 * 3600 * 1000 });
  return tok;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });

const htmlResp = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

const cookieSet = (tok: string) =>
  `session=${tok}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 3600}`;

const cookieClear = () => `session=; Path=/; HttpOnly; Max-Age=0`;

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Time gate ─────────────────────────────────────────────────────────────────

const TZ = "America/Vancouver";

function localHour(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, hour: "numeric", hour12: false,
  }).formatToParts(new Date());
  return parseInt(parts.find(p => p.type === "hour")!.value);
}

function mazeOpen(bypass: boolean): boolean {
  return bypass || (localHour() >= 20 && localHour() < 21);
}

function isoWeek(): string {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const w1 = new Date(jan4);
  w1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const week = Math.ceil(((d.getTime() - w1.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f9f9f9; --fg: #333; --fg2: #666;
    --g1: #667eea; --g2: #764ba2;
    --card: #fff; --input-bg: #f3f3f8; --input-border: #ddd;
    --err: #c0392b;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14121d; --fg: #e9e6f5; --fg2: #b3aacb;
      --card: #1e1b2e; --input-bg: #2a2740; --input-border: #3d3860;
    }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(1200px 600px at 50% -10%, rgba(102,126,234,0.15), transparent 60%),
      var(--bg);
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    color: var(--fg); padding: 1.5rem;
  }
  .card {
    background: var(--card);
    border-radius: 1.5rem;
    padding: 2.5rem 2rem;
    width: min(420px, 100%);
    box-shadow: 0 8px 40px rgba(118,75,162,0.12);
  }
  .logo {
    font-size: 3.5rem; line-height: 1;
    background: linear-gradient(135deg, var(--g1), var(--g2));
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.25rem;
  }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  .sub { color: var(--fg2); font-size: 0.95rem; margin-bottom: 1.8rem; line-height: 1.5; }
  label {
    display: block; font-size: 0.85rem; font-weight: 600;
    color: var(--fg2); margin-bottom: 0.3rem; margin-top: 1rem;
  }
  input[type=text], input[type=password] {
    width: 100%; padding: 0.75rem 1rem;
    background: var(--input-bg); border: 1.5px solid var(--input-border);
    border-radius: 0.75rem; font-size: 1rem; color: var(--fg);
    outline: none; transition: border-color 0.2s;
  }
  input:focus { border-color: var(--g1); }
  button[type=submit] {
    margin-top: 1.5rem; width: 100%; padding: 0.9rem;
    background: linear-gradient(135deg, var(--g1), var(--g2));
    color: white; border: none; border-radius: 0.75rem;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    box-shadow: 0 4px 20px rgba(118,75,162,0.3);
    transition: opacity 0.2s;
  }
  button:hover { opacity: 0.88; }
  .link { margin-top: 1.2rem; text-align: center; font-size: 0.9rem; color: var(--fg2); }
  .link a { color: var(--g1); text-decoration: none; font-weight: 600; }
  .error {
    margin-top: 0.75rem; padding: 0.65rem 1rem;
    background: rgba(192,57,43,0.1); border-radius: 0.5rem;
    color: var(--err); font-size: 0.9rem;
  }
  .maze-card { text-align: center; }
  .maze-body { margin-top: 1.5rem; padding: 1.5rem 0; }
  .gate-msg { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.6rem; }
  .gate-sub { color: var(--fg2); font-size: 0.95rem; line-height: 1.6; }
  .badge {
    display: inline-block; margin-top: 1.2rem;
    padding: 0.4rem 1rem; border-radius: 999px;
    background: linear-gradient(135deg, var(--g1), var(--g2));
    color: white; font-size: 0.85rem; font-weight: 600;
  }
`;

// ── Page templates ────────────────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — The Maze</title>
  <style>${CSS}</style>
</head>
<body>${body}</body>
</html>`;
}

function loginPage(err?: string): string {
  return wrap("Sign in", `<div class="card">
  <div class="logo">π</div>
  <h1>The Maze</h1>
  <p class="sub">Pause &amp; Ponder · sign in to enter</p>
  ${err ? `<div class="error">${escHtml(err)}</div>` : ""}
  <form method="POST" action="/login">
    <label for="u">Username</label>
    <input id="u" name="username" type="text" autocomplete="username" required autofocus>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Enter the Maze →</button>
  </form>
  <p class="link">No account? <a href="/register">Register here</a></p>
</div>`);
}

function registerPage(err?: string): string {
  return wrap("Register", `<div class="card">
  <div class="logo">π</div>
  <h1>Join The Maze</h1>
  <p class="sub">Choose a username and password — no email needed</p>
  ${err ? `<div class="error">${escHtml(err)}</div>` : ""}
  <form method="POST" action="/register">
    <label for="u">Username</label>
    <input id="u" name="username" type="text" autocomplete="username" required autofocus>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="new-password" required>
    <label for="p2">Confirm password</label>
    <input id="p2" name="password2" type="password" autocomplete="new-password" required>
    <button type="submit">Create account →</button>
  </form>
  <p class="link">Already have an account? <a href="/">Sign in</a></p>
</div>`);
}

function mazePage(username: string, open: boolean, usedThisWeek: boolean): string {
  let body = "";
  if (!open) {
    body = `<p class="gate-msg">The Maze opens at 8 pm ✨</p>
    <p class="gate-sub">It's open for just one hour.<br>Come back tonight.</p>
    <div class="badge">Opens 8 – 9 pm · once a week</div>`;
  } else if (usedThisWeek) {
    body = `<p class="gate-msg">You've already submitted this week.</p>
    <p class="gate-sub">Come back next week for a new challenge.<br>The thinking can keep going though.</p>
    <div class="badge">See you next week</div>`;
  } else {
    body = `<p class="gate-msg">The Maze is open 🌙</p>
    <p class="gate-sub">The Tower of Hanoi awaits.<br>Coming soon…</p>
    <div class="badge">8 – 9 pm · one shot</div>`;
  }

  return wrap("The Maze", `<div class="card maze-card">
  <div class="logo">π</div>
  <h1>The Maze</h1>
  <p class="sub">Welcome, <strong>${escHtml(username)}</strong></p>
  <div class="maze-body">${body}</div>
  <p class="link" style="margin-top:2rem"><a href="/logout">Sign out</a></p>
</div>`);
}

// ── Router ────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname: path, searchParams } = url;
  const method = req.method;

  // GET / → login or redirect to maze
  if (path === "/" && method === "GET") {
    const user = await sessionUser(req);
    if (user) return redirect("/maze");
    return htmlResp(loginPage());
  }

  // POST /login
  if (path === "/login" && method === "POST") {
    const form = await req.formData();
    const username = (form.get("username") as string ?? "").trim().toLowerCase();
    const password = form.get("password") as string ?? "";
    if (!username || !password) return htmlResp(loginPage("Please fill in all fields."));

    const record = await kv.get<{ hash: string; salt: string }>(["users", username]);
    if (!record.value) return htmlResp(loginPage("Incorrect username or password."));

    const attempt = await hashPw(password, fromHex(record.value.salt));
    if (attempt !== record.value.hash) return htmlResp(loginPage("Incorrect username or password."));

    const token = await makeSession(username);
    return new Response(null, {
      status: 302,
      headers: { location: "/maze", "set-cookie": cookieSet(token) },
    });
  }

  // GET /register
  if (path === "/register" && method === "GET") {
    const user = await sessionUser(req);
    if (user) return redirect("/maze");
    return htmlResp(registerPage());
  }

  // POST /register
  if (path === "/register" && method === "POST") {
    const form = await req.formData();
    const username = (form.get("username") as string ?? "").trim().toLowerCase();
    const password = form.get("password") as string ?? "";
    const password2 = form.get("password2") as string ?? "";

    if (!username || !password) return htmlResp(registerPage("Please fill in all fields."));
    if (username.length < 2) return htmlResp(registerPage("Username must be at least 2 characters."));
    if (!/^[a-z0-9_-]+$/.test(username)) return htmlResp(registerPage("Username may only contain letters, numbers, _ and -."));
    if (password.length < 4) return htmlResp(registerPage("Password must be at least 4 characters."));
    if (password !== password2) return htmlResp(registerPage("Passwords don't match."));

    const existing = await kv.get(["users", username]);
    if (existing.value !== null) return htmlResp(registerPage("That username is already taken."));

    const salt = randHex(16);
    const hash = await hashPw(password, fromHex(salt));
    await kv.set(["users", username], { hash, salt });

    return redirect("/");
  }

  // GET /maze
  if (path === "/maze" && method === "GET") {
    const user = await sessionUser(req);
    if (!user) return redirect("/");

    const bypass = searchParams.get("xyzzy") === "1";
    const open = mazeOpen(bypass);
    const subRecord = await kv.get<string>(["submissions", user]);
    const usedThisWeek = subRecord.value === isoWeek();

    return htmlResp(mazePage(user, open, usedThisWeek));
  }

  // GET /logout
  if (path === "/logout") {
    return new Response(null, {
      status: 302,
      headers: { location: "/", "set-cookie": cookieClear() },
    });
  }

  return new Response("Not found", { status: 404 });
});
