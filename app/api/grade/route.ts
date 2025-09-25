import { NextRequest, NextResponse } from "next/server";

const ETSY_API = "https://openapi.etsy.com/v3/application";

// Crude helpers to be resilient to small API shape diffs
function asArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray(x.results)) return x.results;
  if (Array.isArray(x.data)) return x.data;
  return [];
}

function parseShopName(input: string): string {
  try {
    const u = new URL(input);
    // Handles https://www.etsy.com/shop/YourShop
    const idx = u.pathname.toLowerCase().indexOf("/shop/");
    if (idx >= 0) {
      return u.pathname.slice(idx + "/shop/".length).split("/")[0];
    }
    // If someone pasted a listing URL, try to extract after /shop/
    return input.trim();
  } catch {
    return input.trim();
  }
}

export async function GET(req: NextRequest) {
  const shopInput = req.nextUrl.searchParams.get("shop");
  const apiKey = process.env.ETSY_API_KEY;
  if (!shopInput) return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "Server missing ETSY_API_KEY" }, { status: 500 });

  const shopName = parseShopName(shopInput);

  // 1) Resolve shop_id by name
  const shopRes = await fetch(`${ETSY_API}/shops?shop_name=${encodeURIComponent(shopName)}`, {
    headers: { "x-api-key": apiKey }
  });
  if (!shopRes.ok) {
    const t = await shopRes.text();
    return NextResponse.json({ error: `Etsy /shops lookup failed: ${t}` }, { status: shopRes.status });
  }
  const shopJson = await shopRes.json();
  const shops = asArray(shopJson);
  if (!shops.length) {
    return NextResponse.json({ error: `No shop found for '${shopName}'` }, { status: 404 });
  }
  const shop = shops[0];
  const shop_id = shop.shop_id ?? shop.shopId ?? shop.id;

  // 2) Pull active listings (first page is enough for a quick grade)
  const listingsRes = await fetch(`${ETSY_API}/shops/${shop_id}/listings/active?limit=50`, {
    headers: { "x-api-key": apiKey }
  });
  if (!listingsRes.ok) {
    const t = await listingsRes.text();
    return NextResponse.json({ error: `Etsy listings fetch failed: ${t}` }, { status: listingsRes.status });
  }
  const listingsJson = await listingsRes.json();
  const listings = asArray(listingsJson);

  // --- Scoring rubric (very simple starter) ---
  const total = listings.length;
  const avgTitleLen = Math.round(
    listings.reduce((s: number, l: any) => s + ((l.title ?? "").length), 0) / Math.max(total, 1)
  );

  const avgTags = Math.round(
    listings.reduce((s: number, l: any) => s + (Array.isArray(l.tags) ? l.tags.length : 0), 0) / Math.max(total, 1)
  );

  const prices: number[] = listings.map((l: any) => {
    // Try common shapes
    if (typeof l.price === "number") return l.price;
    if (l.price && typeof l.price.amount === "number" && typeof l.price.divisor === "number") {
      return l.price.amount / l.price.divisor;
    }
    if (l.price?.amount) return Number(l.price.amount) / (l.price?.divisor || 100);
    return NaN;
  }).filter((n) => Number.isFinite(n));

  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 0;

  // Baseline score out of 100
  let score = 0;
  // Listing volume
  score += Math.min(40, total * 2);             // up to 20 listings → 40 pts
  // Title hygiene
  score += Math.min(20, Math.max(0, avgTitleLen - 24)); // longer, descriptive titles get more
  // Tags usage (Etsy allows many; reward >= 10 avg)
  score += Math.min(20, avgTags * 2);
  // Price spread (some variation looks healthier)
  score += Math.min(20, (priceMax - priceMin));

  score = Math.max(0, Math.min(100, Math.round(score)));
  const letter = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  const tips: string[] = [];
  if (total < 10) tips.push("Add more listings (aim 20+) to look active and capture more search terms.");
  if (avgTitleLen < 40) tips.push("Enrich titles with primary keywords + attributes (material, size, style).");
  if (avgTags < 10) tips.push("Use more tags (think synonyms & gift occasions).");
  if (priceMax - priceMin < 5) tips.push("Offer varied price points (entry, mid, premium) to widen audience.");

  return NextResponse.json({
    letter,
    score,
    metrics: {
      shop_id,
      listings_sampled: total,
      avg_title_length: avgTitleLen,
      avg_tags_per_listing: avgTags,
      price_range: prices.length ? `$${priceMin.toFixed(2)}–$${priceMax.toFixed(2)}` : "n/a"
    },
    tips
  });
}
