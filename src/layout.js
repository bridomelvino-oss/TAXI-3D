import layoutData from "./data/andalatraLayout.json";

// World units per layout pixel. Keeps the city roughly the same overall
// footprint as the original 4x4 grid V1 map despite the richer 6-zone plan.
const SCALE = 0.22;

function toWorld(x, y) {
  return {
    x: (x - layoutData.viewBox.width / 2) * SCALE,
    z: (y - layoutData.viewBox.height / 2) * SCALE,
  };
}

let cached = null;

export function getLayout() {
  if (cached) return cached;

  const zones = layoutData.zones.map((z) => {
    const center = toWorld(z.rect.x + z.rect.width / 2, z.rect.y + z.rect.height / 2);
    return {
      id: z.id,
      name: z.name,
      subtitle: z.subtitle,
      type: z.type,
      courseDensity: z.course_density,
      center,
      halfW: (z.rect.width / 2) * SCALE,
      halfD: (z.rect.height / 2) * SCALE,
    };
  });

  const bay = layoutData.bay.polygon.map(([x, y]) => toWorld(x, y));

  const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]));
  const roads = layoutData.main_roads.map((r) => ({
    from: zoneById[r.from].center,
    to: zoneById[r.to].center,
  }));

  let mapRadius = 0;
  for (const z of zones) {
    mapRadius = Math.max(mapRadius, Math.hypot(z.center.x, z.center.z) + Math.max(z.halfW, z.halfD));
  }
  for (const p of bay) {
    mapRadius = Math.max(mapRadius, Math.hypot(p.x, p.z));
  }

  cached = { zones, bay, roads, zoneById, mapRadius, scale: SCALE };
  return cached;
}
