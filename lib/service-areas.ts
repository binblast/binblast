export const SERVICE_AREAS = [
  "Peachtree City",
  "Fayetteville",
  "Senoia",
  "Tyrone",
  "Sharpsburg",
] as const;

export type ServiceArea = (typeof SERVICE_AREAS)[number];

export const SERVICE_AREA_SUMMARY =
  "Bin Blast Co. serves Peachtree City, Fayetteville, Senoia, Tyrone, and Sharpsburg in south metro Atlanta.";

export function getServiceAreasPayload() {
  return {
    areas: [...SERVICE_AREAS],
    summary: SERVICE_AREA_SUMMARY,
    region: "South metro Atlanta, Georgia",
  };
}
