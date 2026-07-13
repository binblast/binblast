export const SERVICE_AREAS = [
  "Peachtree City",
  "Fayetteville",
  "Tyrone",
  "Sharpsburg",
  "Senoia",
] as const;

export type ServiceArea = (typeof SERVICE_AREAS)[number];

export const SERVICE_AREA_SUMMARY =
  "Bin Blast Co. serves Peachtree City, Fayetteville, Tyrone, Sharpsburg, and Senoia in south metro Atlanta.";

export function getServiceAreasPayload() {
  return {
    areas: [...SERVICE_AREAS],
    summary: SERVICE_AREA_SUMMARY,
    region: "South metro Atlanta, Georgia",
  };
}
