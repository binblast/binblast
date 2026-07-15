/** Primary routes — based in and around Fayette County */
export const PRIMARY_SERVICE_AREAS = [
  "Fayetteville",
  "Peachtree City",
  "Tyrone",
  "Senoia",
  "Sharpsburg",
  "Newnan",
  "Brooks",
] as const;

/** Metro Atlanta communities we are actively expanding into */
export const ADDITIONAL_METRO_ATLANTA_AREAS = [
  "Atlanta",
  "East Point",
  "College Park",
  "Hapeville",
  "South Fulton",
  "Fairburn",
  "Union City",
  "Jonesboro",
  "Hampton",
  "Stockbridge",
  "McDonough",
  "Douglasville",
] as const;

/** Cities with local history / fun-facts panels on the marketing site */
export const SERVICE_AREAS_WITH_HISTORY = [
  "Peachtree City",
  "Fayetteville",
  "Senoia",
  "Tyrone",
  "Sharpsburg",
] as const;

export type PrimaryServiceArea = (typeof PRIMARY_SERVICE_AREAS)[number];
export type AdditionalServiceArea = (typeof ADDITIONAL_METRO_ATLANTA_AREAS)[number];
export type ServiceAreaWithHistory = (typeof SERVICE_AREAS_WITH_HISTORY)[number];

/** @deprecated Prefer PRIMARY_SERVICE_AREAS — kept for existing imports */
export const SERVICE_AREAS = PRIMARY_SERVICE_AREAS;

/** Used by service area history data */
export type ServiceArea = ServiceAreaWithHistory;

export const METRO_ATLANTA_TAGLINE = "Serving Metro Atlanta • Based in Fayette County";

export const SERVICE_AREA_SUMMARY =
  "Bin Blast Co. is based in Fayette County and provides residential, HOA, restaurant, apartment, and commercial curbside trash bin cleaning throughout Metro Atlanta.";

export function getServiceAreasPayload() {
  return {
    primaryAreas: [...PRIMARY_SERVICE_AREAS],
    additionalAreas: [...ADDITIONAL_METRO_ATLANTA_AREAS],
    areas: [...PRIMARY_SERVICE_AREAS, ...ADDITIONAL_METRO_ATLANTA_AREAS],
    summary: SERVICE_AREA_SUMMARY,
    region: "Metro Atlanta, Georgia",
    headquarters: "Fayette County, Georgia",
  };
}
