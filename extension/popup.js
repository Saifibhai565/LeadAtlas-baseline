// Reads the business on the current tab and sends it to POST /api/v1/leads.

const $ = (id) => document.getElementById(id);
const status = (text, kind = "") => {
  $("status").textContent = text;
  $("status").className = kind;
};

async function getConfig() {
  const { appUrl = "", apiKey = "" } = await chrome.storage.local.get(["appUrl", "apiKey"]);
  return { appUrl: appUrl.replace(/\/+$/, ""), apiKey };
}

function show(view) {
  $("setup").hidden = view !== "setup";
  $("main").hidden = view !== "main";
}

// Runs inside the web page. Must not use anything from this file's scope.
function readPage() {
  const q = (s) => document.querySelector(s);
  const label = (el) => (el ? (el.getAttribute("aria-label") || el.textContent || "").trim() : "");
  const out = { sourceUrl: location.href };

  if (/(^|\.)google\.[a-z.]+$/.test(location.hostname) && location.pathname.startsWith("/maps")) {
    out.name = (q("h1.DUwDvf") || q('div[role="main"] h1') || q("h1"))?.textContent?.trim() || "";
    out.address = label(q('button[data-item-id="address"]')).replace(/^Address:\s*/i, "");
    out.phone = label(q('button[data-item-id^="phone"]')).replace(/^Phone:\s*/i, "");
    out.website = q('a[data-item-id="authority"]')?.href || "";
    out.category = q("button.DkEaL")?.textContent?.trim() || "";
    const rating = q('div.F7nice span[aria-hidden="true"]')?.textContent?.replace(",", ".");
    if (rating) out.rating = parseFloat(rating);
    const reviews = q('div.F7nice span[aria-label*="review"]')?.getAttribute("aria-label");
    if (reviews) out.reviews = parseInt(reviews.replace(/[^\d]/g, ""), 10);
    const dataId = location.href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
    if (dataId) out.placeId = dataId[1];
    out.mapsUrl = location.href;
    return out;
  }

  // LinkedIn company page you're looking at (not personal profiles)
  if (/(^|\.)linkedin\.com$/.test(location.hostname) && location.pathname.startsWith("/company/")) {
    const og = (p) => q(`meta[property="${p}"]`)?.content || "";
    out.name = (q("h1")?.innerText || og("og:title")).replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
    const site = Array.from(document.querySelectorAll("a[href]")).find((a) => /visit website|website/i.test(a.innerText) && !/linkedin\.com/.test(a.href));
    if (site) out.website = site.href;
    out.category = q(".org-top-card-summary-info-list__info-item")?.innerText?.trim() || "";
    out.linkedin = location.origin + location.pathname.split("/").slice(0, 3).join("/");
    return out;
  }

  // Facebook business page you're looking at (not personal profiles or groups)
  if (/(^|\.)facebook\.com$/.test(location.hostname) && !/^\/(groups|profile\.php|people)\b/.test(location.pathname)) {
    const og = (p) => q(`meta[property="${p}"]`)?.content || "";
    out.name = (og("og:title") || q("h1")?.innerText || "").trim();
    const text = document.body.innerText;
    const mail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (mail) out.email = mail[0];
    const phone = text.match(/(\+?\d[\d\s-]{8,}\d)/);
    if (phone) out.phone = phone[1].trim();
    const site = Array.from(document.querySelectorAll("a[href*='l.facebook.com/l.php']")).map((a) => {
      try {
        return new URL(a.href).searchParams.get("u");
      } catch {
        return null;
      }
    }).find(Boolean);
    if (site) out.website = site;
    out.facebook = location.origin + location.pathname.split("/").slice(0, 2).join("/");
    return out;
  }

  // Any other website: use the page's own details
  const og = (p) => q(`meta[property="${p}"]`)?.content || "";
  out.name = og("og:site_name") || document.title.split(/[|\-–]/)[0].trim();
  out.website = location.origin;
  const html = document.documentElement.innerHTML;
  const mail = html.match(/mailto:([^"'?\s>]+)/i) || document.body.innerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (mail) out.email = decodeURIComponent(mail[1] || mail[0]);
  const tel = q('a[href^="tel:"]');
  if (tel) out.phone = decodeURIComponent(tel.getAttribute("href").slice(4));
  out.address = q("address")?.innerText?.trim()?.slice(0, 200) || "";
  return out;
}

async function fillFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) {
    status("Open a business on Google Maps or a business website, then click the icon again.");
    return null;
  }
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
    const form = $("form");
    for (const key of ["name", "category", "phone", "email", "website", "address"]) {
      if (result[key]) form.elements.namedItem(key).value = result[key];
    }
    if (!result.name) status("Couldn't read a business name here. Type it in, or open the business's own page on Maps.");
    return result;
  } catch {
    status("This page can't be read. Fill in the details by hand.");
    return null;
  }
}

let pageData = {};

async function init() {
  const cfg = await getConfig();
  $("appUrl").value = cfg.appUrl || "http://localhost:3000";
  $("apiKey").value = cfg.apiKey;
  if (!cfg.appUrl || !cfg.apiKey) {
    show("setup");
    return;
  }
  show("main");
  pageData = (await fillFromTab()) || {};
}

$("gear").addEventListener("click", () => show($("setup").hidden ? "setup" : "main"));

$("saveSetup").addEventListener("click", async () => {
  const appUrl = $("appUrl").value.trim().replace(/\/+$/, "");
  const apiKey = $("apiKey").value.trim();
  status("Checking…");
  try {
    const res = await fetch(`${appUrl}/api/v1/me`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const b = await res.json();
    if (!res.ok) return status(b.error || "That didn't work. Check the key.", "err");
    await chrome.storage.local.set({ appUrl, apiKey });
    status(`Connected to ${b.account}. ${b.credits} credits left.`, "ok");
    show("main");
    pageData = (await fillFromTab()) || {};
  } catch {
    status("Can't reach the app. Is it running at that address?", "err");
  }
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cfg = await getConfig();
  const f = e.target;
  // Read fields through elements.namedItem: form.name is the form's own name attribute, not the input.
  const val = (n) => f.elements.namedItem(n).value;
  const body = {
    ...pageData,
    name: val("name"),
    category: val("category"),
    phone: val("phone"),
    email: val("email"),
    website: val("website"),
    address: val("address"),
    check: f.elements.namedItem("check").checked,
  };
  const btn = f.querySelector("button");
  btn.disabled = true;
  status("Saving…");
  try {
    const res = await fetch(`${cfg.appUrl}/api/v1/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
    });
    const b = await res.json();
    if (!res.ok) status(b.error || "Couldn't save.", "err");
    else status(b.created ? "Saved to your leads." : "You already have this business.", "ok");
  } catch {
    status("Can't reach the app.", "err");
  } finally {
    btn.disabled = false;
  }
});

init();
