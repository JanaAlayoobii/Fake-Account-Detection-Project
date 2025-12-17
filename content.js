const UI_ID = "__fake_detector_badge__";

function showBadge(text, color = "#4b5563") {
  let el = document.getElementById(UI_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = UI_ID;
    el.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      top: 8px;
      left: 8px;
      font: 600 12px/1.1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;
      color: #fff;
      background: ${color};
      padding: 6px 10px;
      border-radius: 999px;
      box-shadow: 0 2px 10px rgba(0,0,0,.25);
      pointer-events: none;
    `;
    document.documentElement.appendChild(el);
  }
  el.textContent = text;
  el.style.background = color;
}

function numLike(s) {
  if (!s) return 0;
  s = ("" + s).trim().toLowerCase();
  const m = s.match(/([\d.,]+)\s*([km])?/);
  if (!m) return Number(s.replace(/[^\d.]/g, "")) || 0;
  let v = parseFloat(m[1].replace(/,/g, ""));
  if (m[2] === "k") v *= 1e3;
  if (m[2] === "m") v *= 1e6;
  return Math.round(v);
}

// Normalization constants used by the model
const MEAN = [
  22.6232638889,      // description length
  107.4895833333,     // #posts
  85307.2361111111,   // #followers
  508.3819444444      // #follows
];

const SCALE = [
  37.6702443052,
  401.685290754,
  909358.0550265901,
  917.1840338967
];

function getUsernameAndFullname() {
  let username = "";
  let fullname = "";

  const header = document.querySelector("header");
  if (header) {
    const h2 = header.querySelector("h2");
    const h1 = header.querySelector("h1");
    if (h2) username = h2.innerText.trim();
    if (h1) fullname = h1.innerText.trim();
  }

  if (!username) {
    const path = location.pathname.split("/").filter(Boolean);
    username = path[0] || "";
  }

  if (!fullname) fullname = username;

  return { username, fullname };
}

function getStatsGlobal() {
  let posts = 0;
  let followers = 0;
  let following = 0;

  const nodes = Array.from(document.querySelectorAll("li, span"));
  for (const el of nodes) {
    const t = (el.innerText || "").toLowerCase();
    if (!t) continue;

    if (t.includes("followers") || t.includes("follower")) {
      const v = numLike(t);
      if (v > 0) followers = v;
    } else if (t.includes("following")) {
      const v = numLike(t);
      if (v > 0) following = v;
    } else if (t.includes("posts") || t.includes("post")) {
      const v = numLike(t);
      if (v > 0) posts = v;
    }
  }

  return { posts, followers, following };
}

function getBioText(username) {
  const uname = (username || "").toLowerCase();

  let candidates = Array.from(
    document.querySelectorAll(
      "header div[dir='auto'], main div[dir='auto'], section div[dir='auto']"
    )
  )
    .map((el) => (el.innerText || "").trim())
    .filter((txt) => txt && txt.length > 0);

  candidates = candidates.filter((t) => {
    const tl = t.toLowerCase();
    if (tl === uname) return false;
    if (tl.startsWith(uname + " ")) return false;
    if (/followers?|following|posts?/.test(tl)) return false;
    return true;
  });

  if (!candidates.length) return "";
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

function isVerified() {
  return document.querySelector('svg[aria-label="Verified"]') ? 1 : 0;
}

// --- Business-like profile detection ---
function isBusinessLikeProfile(username, fullname, bio, stats) {
  const text = (username + " " + fullname + " " + bio).toLowerCase();

  const businessKeywords = [
    "shop", "store", "brand", "ksa", "saudi",
    "design", "fashion", "boutique", "style",
    "beauty", "makeup", "salon", "clinic",
    "cafe", "restaurant", "resturant", "bakery",
    "market", "trading", "company", "co.",
    "abya", "abaya", "abayaa", "abyaa",
    "delivery", "orders", "order now", "shop online",
    "official", "agency", "school", "college", "university"
  ];

  const hasBusinessKeyword = businessKeywords.some((k) =>
    text.includes(k)
  );

  const hasPhone = /\d{7,}/.test(bio);
  const hasWhatsApp = /whatsapp|wa\.me/i.test(bio);
  const hasLink = /http|www\.|linktr\.ee|shopify|\.store|\.shop/i.test(bio);

  const { followers, following, posts } = stats;

  const statsLookBusiness =
    (followers >= 300 && following <= 150) ||
    followers >= 1000 ||
    (posts >= 15 && followers >= 200);

  return (
    (hasBusinessKeyword || hasPhone || hasWhatsApp || hasLink) &&
    statsLookBusiness
  );
}

// --- Normal private personal profile detection ---
function isNormalPrivateProfile(stats, bioLength, isPrivate, businessLike, verified) {
  if (!isPrivate) return false;
  if (businessLike) return false;
  if (verified) return false;

  const { followers, following, posts } = stats;

  // typical "normal private account" ranges
  const followersOk = followers >= 80 && followers <= 1500;
  const followingOk = following >= 150 && following <= 2500;
  const postsOk = posts >= 5 && posts <= 200;
  const bioOk = bioLength <= 40; // short / simple bio is fine

  // avoid weird extremes
  if (followers === 0 && posts === 0) return false;
  if (following > 4000) return false;

  return followersOk && followingOk && postsOk && bioOk;
}

function buildFeatures() {
  const header = document.querySelector("header");
  const { username, fullname } = getUsernameAndFullname();
  const bio = getBioText(username);
  const stats = getStatsGlobal();
  const verified = isVerified();

  const posts = stats.posts;
  const followers = stats.followers;
  const following = stats.following;

  const hasPic = header && header.querySelector("img") ? 1 : 0;
  const isPrivate = /this account is private/i.test(
    document.body.innerText || ""
  )
    ? 1
    : 0;
  const hasUrl = /http|www\./i.test(bio) ? 1 : 0;

  const numsInUser = (username.match(/\d/g) || []).length;
  const numsInFull = (fullname.match(/\d/g) || []).length;

  const digitsUserRatio = username.length ? numsInUser / username.length : 0;
  const fullNameWordCount = fullname
    ? fullname.trim().split(/\s+/).length
    : 0;
  const digitsFullRatio = fullname.length ? numsInFull / fullname.length : 0;

  const sameName =
    fullname.replace(/\s+/g, "").toLowerCase() ===
    username.toLowerCase()
      ? 1
      : 0;

  const descScaled = (bio.length - MEAN[0]) / SCALE[0];
  const postsScaled = (posts - MEAN[1]) / SCALE[1];
  const followersScaled = (followers - MEAN[2]) / SCALE[2];
  const followingScaled = (following - MEAN[3]) / SCALE[3];

  const features = [
    hasPic,
    digitsUserRatio,
    fullNameWordCount,
    digitsFullRatio,
    sameName,
    descScaled,
    hasUrl,
    isPrivate,
    postsScaled,
    followersScaled,
    followingScaled
  ];

  const businessLike = isBusinessLikeProfile(username, fullname, bio, stats);

  console.log("[content] DEBUG values:", {
    username,
    fullname,
    bioLength: bio.length,
    posts,
    followers,
    following,
    verified,
    businessLike,
    isPrivate
  });
  console.log("[content] built features:", features);

  return {
    features,
    stats,
    verified,
    businessLike,
    isPrivate,
    bioLength: bio.length
  };
}

function waitForFollowersText(maxMs = 12000, intervalMs = 250) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      const nodes = Array.from(document.querySelectorAll("li, span"));
      const hasFollowers = nodes.some((el) => {
        const t = (el.innerText || "").toLowerCase();
        return t.includes("followers") || t.includes("follower");
      });

      if (hasFollowers) {
        resolve(true);
        return;
      }

      if (Date.now() - start > maxMs) {
        resolve(false);
        return;
      }
      setTimeout(check, intervalMs);
    }
    check();
  });
}

async function runDetector() {
  try {
    if (!/instagram\.com\/[^\/]+\/?$/i.test(location.href)) {
      return;
    }

    showBadge("Waiting for profile…", "#6b7280");

    const ready = await waitForFollowersText();
    if (!ready) {
      showBadge("Profile not ready", "#dc2626");
      return;
    }

    const {
      features,
      stats,
      verified,
      businessLike,
      isPrivate,
      bioLength
    } = buildFeatures();

    showBadge("Analyzing…", "#6b7280");

    chrome.runtime.sendMessage({ type: "PREDICT", features }, (resp) => {
      if (!resp || !resp.ok) {
        showBadge("Error: " + (resp?.error || "no response"), "#dc2626");
        return;
      }

      let pFake = Number(resp.score);
      if (isNaN(pFake)) pFake = 0.5;

      // --- Temperature scaling (extra calibration) ---
      const T = 1.5;
      const eps = 1e-9;
      let p = Math.min(Math.max(pFake, eps), 1 - eps);
      let logit = Math.log(p / (1 - p));
      logit = logit / T;
      pFake = 1 / (1 + Math.exp(-logit));
      // ------------------------------------------------

      const { followers, following, posts } = stats;

      // --- Celebrity rules ---
      if (verified === 1 && followers > 1_000_000)
        pFake = Math.min(pFake, 0.05);

      if (verified === 1 && followers > 5_000_000)
        pFake = 0.01;

      if (followers > 2_000_000 && following < 400)
        pFake = Math.min(pFake, 0.10);
      // -----------------------

      // --- Tiny / empty accounts ---
      if (posts === 0 && followers === 0 && following === 0) {
        pFake = Math.max(pFake, 0.95);
      } else if (posts === 0 && followers < 10 && following < 10) {
        pFake = Math.max(pFake, 0.9);
      } else if (followers < 5 && following < 5) {
        pFake = Math.max(pFake, 0.8);
      }
      // ----------------------------

      // --- Business-like profile correction ---
      if (businessLike) {
        let factor = 0.6; // default soften
        if (followers >= 10_000) {
          factor = 0.4; // stronger for big brands
        }
        pFake = pFake * factor;
      }

      // --- Normal private-account correction (Option 2: medium) ---
      const looksNormalPrivate = isNormalPrivateProfile(
        stats,
        bioLength,
        !!isPrivate,
        businessLike,
        verified === 1
      );

      if (looksNormalPrivate) {
        const factorPrivate = 0.45; // reduce fake by 55%
        pFake = pFake * factorPrivate;
      }
      // ------------------------------------------------------------

      // clamp final prob
      pFake = Math.min(Math.max(pFake, 0), 1);

      const pctFake = (pFake * 100).toFixed(1);
      const pctReal = (100 - pFake * 100).toFixed(1);
      const isFake = pFake >= 0.5;

      showBadge(
        isFake ? `Likely Fake (${pctFake}%)` : `Likely Real (${pctReal}%)`,
        isFake ? "#dc2626" : "#16a34a"
      );
    });
  } catch (e) {
    console.error("[content] detector error:", e);
    showBadge("Error", "#dc2626");
  }
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  runDetector();
} else {
  window.addEventListener("DOMContentLoaded", runDetector);
}
