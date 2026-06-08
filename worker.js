/**
 * FBDL — Cloudflare Worker
 * Proxies Facebook page fetching server-side to extract video URLs.
 * Deploy this as a Cloudflare Worker (see README for instructions).
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Only handle /extract?url=... requests
    if (url.pathname !== "/extract") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const fbUrl = url.searchParams.get("url");
    if (!fbUrl) {
      return jsonError("Missing ?url= parameter", 400);
    }

    // Validate it's a Facebook URL
    if (!isFacebookUrl(fbUrl)) {
      return jsonError("URL must be a Facebook URL", 400);
    }

    try {
      const result = await extractVideoLinks(fbUrl);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    } catch (err) {
      return jsonError("Extraction failed: " + err.message, 500);
    }
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function isFacebookUrl(url) {
  try {
    const u = new URL(url);
    return /facebook\.com|fb\.watch|fb\.com/i.test(u.hostname);
  } catch {
    return false;
  }
}

// ── Core extraction ───────────────────────────────────────────────────────────

async function extractVideoLinks(fbUrl) {
  // Facebook embeds video data as JSON inside the page HTML.
  // We fetch it server-side (no CORS restriction here) and parse it out.

  const html = await fetchFacebookPage(fbUrl);
  const data = parseVideoData(html);

  if (!data.hd && !data.sd) {
    throw new Error(
      "No video streams found. The video may be private or require login."
    );
  }

  return data;
}

async function fetchFacebookPage(fbUrl) {
  // Use a desktop User-Agent so Facebook serves the full HTML with embedded data
  const res = await fetch(fbUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Facebook returned HTTP ${res.status}`);
  }

  return res.text();
}

function parseVideoData(html) {
  const result = {
    title: null,
    thumbnail: null,
    duration: null,
    hd: null,
    sd: null,
  };

  // ── Title ─────────────────────────────────────────────────────────────────
  const titleMatch =
    html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    html.match(/"title"\s*:\s*"([^"]+)"/);
  if (titleMatch) {
    result.title = decodeEntities(titleMatch[1].replace(" | Facebook", "").trim());
  }

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  const thumbMatch =
    html.match(/"thumbnailImage"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/) ||
    html.match(/og:image[^>]*content="([^"]+)"/) ||
    html.match(/"preferred_thumbnail"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/);
  if (thumbMatch) {
    result.thumbnail = unescapeUrl(thumbMatch[1]);
  }

  // ── Duration ──────────────────────────────────────────────────────────────
  const durMatch =
    html.match(/"video_duration_seconds"\s*:\s*(\d+)/) ||
    html.match(/"duration"\s*:\s*(\d+)/);
  if (durMatch) {
    result.duration = formatDuration(parseInt(durMatch[1], 10));
  }

  // ── Video URLs — HD ───────────────────────────────────────────────────────
  // Facebook uses several different keys across page types
  const hdPatterns = [
    /"hd_src"\s*:\s*"([^"]+)"/,
    /"browser_native_hd_url"\s*:\s*"([^"]+)"/,
    /"playable_url_quality_hd"\s*:\s*"([^"]+)"/,
    /"video_url"\s*:\s*"([^"]+\.mp4[^"]*)"/,
  ];
  for (const pat of hdPatterns) {
    const m = html.match(pat);
    if (m) {
      result.hd = unescapeUrl(m[1]);
      break;
    }
  }

  // ── Video URLs — SD ───────────────────────────────────────────────────────
  const sdPatterns = [
    /"sd_src"\s*:\s*"([^"]+)"/,
    /"browser_native_sd_url"\s*:\s*"([^"]+)"/,
    /"playable_url"\s*:\s*"([^"]+)"/,
    /"playable_url_quality_sd"\s*:\s*"([^"]+)"/,
  ];
  for (const pat of sdPatterns) {
    const m = html.match(pat);
    if (m) {
      result.sd = unescapeUrl(m[1]);
      break;
    }
  }

  // ── Fallback: scan entire page for fbcdn mp4 links ────────────────────────
  if (!result.hd && !result.sd) {
    const allUrls = [...html.matchAll(/"(https:\/\/[^"]*fbcdn[^"]*\.mp4[^"]*)"/g)].map(
      (m) => unescapeUrl(m[1])
    );
    const unique = [...new Set(allUrls)];
    if (unique.length > 0) result.sd = unique[0];
    if (unique.length > 1) result.hd = unique[1];
  }

  return result;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function unescapeUrl(str) {
  // Facebook encodes forward slashes as \/ in JSON
  return str.replace(/\\\//g, "/").replace(/\\u0026/g, "&");
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
