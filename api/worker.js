// Cloudflare Worker v6 (no CSV): Reddit + Twitter + Threads(optional) + Chat + News preview
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });

    // ---------- Reddit ----------
    if (request.method === "POST" && path.endsWith("/reddit/search")) {
      const body = await request.json().catch(()=>({}));
      const subs = Array.isArray(body.subreddits) ? body.subreddits : [];
      const limit = Math.min(50, body.limit || 25);
      if (!subs.length) return json([]);

      let posts = [];
      for (const sub of subs) {
        let ok = false;
        try {
          const r = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=${limit}`, {
            headers: { "User-Agent": "cf-worker" }
          });
          if (r.ok) { posts.push(...pluckReddit(await r.json())); ok = true; }
        } catch {}
        if (!ok) {
          try {
            const r = await fetch(`https://r.jina.ai/http://www.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=${limit}`);
            if (r.ok) { posts.push(...pluckReddit(await r.json())); ok = true; }
          } catch {}
        }
      }
      posts.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
      return json(posts.slice(0, limit));
    }

    // ---------- Twitter (X) ----------
    if (request.method === "POST" && path.endsWith("/twitter/search")) {
      const body = await request.json().catch(()=>({}));
      const handles = Array.isArray(body.handles) ? body.handles : [];
      const hashtags = Array.isArray(body.hashtags) ? body.hashtags : [];
      const limit = Math.min(100, body.limit || 50);
      if (!env.TWITTER_BEARER) return json([]);
      if (!handles.length && !hashtags.length) return json([]);

      const qParts = [];
      for (const h of handles) if (h) qParts.push(`from:${h}`);
      for (const tag of hashtags) if (tag) qParts.push(`#${tag}`);
      const query = encodeURIComponent(qParts.join(" OR "));
      const endpoint = `https://api.twitter.com/2/tweets/search/recent?max_results=${Math.min(100, limit)}&tweet.fields=created_at,lang`;
      try {
        const r = await fetch(`${endpoint}&query=${query}`, {
          headers: { "Authorization": `Bearer ${env.TWITTER_BEARER}` }
        });
        if (!r.ok) return json([]);
        const d = await r.json();
        const out = (d.data||[]).map(t=>({ text: t.text, created_at: t.created_at, source: "twitter" }));
        return json(out);
      } catch { return json([]); }
    }

    // ---------- Threads (placeholder) ----------
    if (request.method === "POST" && path.endsWith("/threads/search")) {
      return json([]);
    }

    // ---------- News preview ----------
    if (request.method === "POST" && path.endsWith("/news/fetch")) {
      try {
        const body = await request.json().catch(()=>({}));
        const urlIn = String(body.url || "").trim();
        const limit = Math.min(12, body.limit || 6);
        if (!urlIn) return json([]);

        const res = await fetch(urlIn, { headers: { "User-Agent": "cf-worker" } });
        if (!res.ok) return json([]);

        const html = await res.text();
        const base = new URL(urlIn);

        const items = [];
        const seen = new Set();
        const re = /<a\\s+[^>]*href="([^"]+)"[^>]*>([\\s\\S]*?)<\\/a>/gi;
        let m;
        while ((m = re.exec(html))) {
          const hrefRaw = m[1];
          let text = m[2]
            .replace(/<[^>]*>/g, " ")
            .replace(/\\s+/g, " ")
            .trim();

          if (!text || text.length < 18) continue; // avoid nav links
          const href = new URL(hrefRaw, base).toString();
          const u = new URL(href);
          if (u.origin !== base.origin) continue;   // same-site only
          if (seen.has(href) || seen.has(text.toLowerCase())) continue;

          // tiny heuristic: prefer news/blog/date-ish links + longer titles
          const s1 = /news|blog|article|updates?/i.test(href) ? 2 : 0;
          const s2 = /\\b(20\\d{{2}})\\b/.test(href) ? 1 : 0;
          const score = s1 + s2 + Math.min(2, Math.floor(text.length / 40));

          items.push({ title: text, href, score });
          seen.add(href); seen.add(text.toLowerCase());
        }

        items.sort((a,b)=> b.score - a.score);
        const out = items.slice(0, limit).map(x => ({ title: x.title, href: x.href, src: base.hostname }));
        return json(out);
      } catch {
        return json([]);
      }
    }

    // ---------- Chat (OpenAI) ----------
    if (request.method === "POST" && path.endsWith("/chat")) {
      if (!env.OPENAI_API_KEY) return json({ answer: "Chat disabled (server key missing)." });
      const body = await request.json().catch(()=>({}));
      const question = String(body.question||"").slice(0, 2000);
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are 'Pulse', an assistant for mobile FPS community analytics. Be concise and helpful." },
              { role: "user", content: question }
            ]
          })
        });
        if (!resp.ok) return json({ answer: "OpenAI error." });
        const data = await resp.json();
        const answer = data.choices?.[0]?.message?.content || "No answer.";
        return json({ answer });
      } catch { return json({ answer: "Error contacting chat service." }); }
    }

    return new Response("OK", { status: 200, headers: cors() });
  }
}

function pluckReddit(data){
  const out=[];
  for (const c of (data?.data?.children || [])) {
    const p=c.data; if (p.stickied||p.over_18) continue;
    out.push({
      title:p.title||"",
      text:p.selftext||"",
      url:p.url||`https://www.reddit.com${p.permalink}`,
      created_at:new Date((p.created_utc||0)*1000).toISOString(),
      source:"reddit",
      domain:p.domain||"reddit.com"
    });
  }
  return out;
}

function json(obj, status=200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(), "Content-Type":"application/json" }
  });
}
function cors(){
  return {
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Methods":"POST,GET,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type"
  };
}
