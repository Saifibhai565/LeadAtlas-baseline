import "server-only";

/** Business types we can look up on OpenStreetMap, mapped to its tags. */
export const OSM_CATEGORIES: Record<string, { label: string; tags: string[] }> = {
  restaurant: { label: "Restaurants", tags: ['amenity="restaurant"', 'amenity="fast_food"'] },
  cafe: { label: "Cafes", tags: ['amenity="cafe"'] },
  bakery: { label: "Bakeries", tags: ['shop="bakery"', 'shop="pastry"'] },
  dentist: { label: "Dentists", tags: ['amenity="dentist"', 'healthcare="dentist"'] },
  clinic: { label: "Clinics and doctors", tags: ['amenity="clinic"', 'amenity="doctors"'] },
  pharmacy: { label: "Pharmacies", tags: ['amenity="pharmacy"'] },
  hospital: { label: "Hospitals", tags: ['amenity="hospital"'] },
  school: { label: "Schools", tags: ['amenity="school"', 'amenity="college"'] },
  hotel: { label: "Hotels and guest houses", tags: ['tourism="hotel"', 'tourism="guest_house"'] },
  gym: { label: "Gyms", tags: ['leisure="fitness_centre"'] },
  beauty: { label: "Salons and beauty", tags: ['shop="beauty"', 'shop="hairdresser"'] },
  clothes: { label: "Clothing shops", tags: ['shop="clothes"', 'shop="boutique"'] },
  electronics: { label: "Electronics and mobile shops", tags: ['shop="electronics"', 'shop="mobile_phone"'] },
  furniture: { label: "Furniture", tags: ['shop="furniture"'] },
  car: { label: "Car repair and dealers", tags: ['shop="car_repair"', 'shop="car"'] },
  supermarket: { label: "Supermarkets", tags: ['shop="supermarket"', 'shop="convenience"'] },
  estate: { label: "Real estate agents", tags: ['office="estate_agent"'] },
  lawyer: { label: "Lawyers", tags: ['office="lawyer"'] },
};

type OsmEl = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

export async function osmSearch(cityName: string, category: string) {
  const cat = OSM_CATEGORIES[category];
  if (!cat) throw new Error("Choose a business type.");
  const safeCity = cityName.replace(/["\\]/g, "").slice(0, 60);
  const q = `[out:json][timeout:90];
area["name"="${safeCity}"]["boundary"="administrative"]->.a;
(${cat.tags.map((t) => `nwr[${t}]["name"](area.a);`).join("")});
out center tags 2000;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": `${process.env.NEXT_PUBLIC_APP_NAME || "LeadAtlas"}/1.0` },
    body: `data=${encodeURIComponent(q)}`,
  });
  if (!res.ok) throw new Error(res.status === 429 ? "OpenStreetMap is busy. Try again in a minute." : `OpenStreetMap answered ${res.status}.`);
  const j = (await res.json()) as { elements?: OsmEl[] };
  return (j.elements ?? [])
    .map((e) => {
      const t = e.tags ?? {};
      const lat = e.lat ?? e.center?.lat ?? null;
      const lon = e.lon ?? e.center?.lon ?? null;
      const address = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:city"] ?? safeCity].filter(Boolean).join(", ");
      return {
        placeKey: `osm|${e.type}|${e.id}`,
        title: t.name,
        category: t.cuisine ? `${cat.label.replace(/s$/, "")} (${t.cuisine.replace(/;/g, ", ")})` : cat.label.replace(/s$/, ""),
        phone: t.phone ?? t["contact:phone"] ?? null,
        website: t.website ?? t["contact:website"] ?? null,
        emails: t.email ?? t["contact:email"] ?? null,
        address: address || null,
        latitude: lat,
        longitude: lon,
        openHours: t.opening_hours ?? null,
        mapsUrl: lat != null ? `https://www.openstreetmap.org/${e.type}/${e.id}` : null,
      };
    })
    .filter((l) => l.title);
}
