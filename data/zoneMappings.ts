// data/zoneMappings.ts
// Zone-to-county/city mappings for Metro Atlanta

export interface ZoneMapping {
  zone: string;
  counties: string[];
  cities: string[];
  customizable: boolean;
}

export const defaultZoneMappings: ZoneMapping[] = [
  {
    zone: "Metro Atlanta Core",
    counties: ["Fulton"],
    cities: [
      "Atlanta",
      "Midtown",
      "Buckhead",
      "Downtown Atlanta",
      "Virginia-Highland",
      "Inman Park",
      "Old Fourth Ward",
      "Poncey-Highland",
    ],
    customizable: true,
  },
  {
    zone: "North Metro",
    counties: ["Fulton", "Gwinnett", "Forsyth", "Cherokee"],
    cities: [
      "Alpharetta",
      "Roswell",
      "Sandy Springs",
      "Johns Creek",
      "Milton",
      "Cumming",
      "Suwanee",
      "Duluth",
      "Lawrenceville",
      "Buford",
    ],
    customizable: true,
  },
  {
    zone: "South Metro",
    counties: ["Fulton", "Clayton", "Fayette"],
    cities: [
      "College Park",
      "East Point",
      "Hapeville",
      "Union City",
      "Forest Park",
      "Jonesboro",
      "Riverdale",
      "Fayetteville",
    ],
    customizable: true,
  },
  {
    zone: "East Metro",
    counties: ["DeKalb", "Gwinnett", "Rockdale"],
    cities: [
      "Decatur",
      "Stone Mountain",
      "Snellville",
      "Tucker",
      "Lithonia",
      "Conyers",
      "Chamblee",
      "Doraville",
      "Norcross",
      "Lilburn",
    ],
    customizable: true,
  },
  {
    zone: "West Metro",
    counties: ["Cobb", "Douglas", "Paulding"],
    cities: [
      "Marietta",
      "Smyrna",
      "Mableton",
      "Kennesaw",
      "Acworth",
      "Powder Springs",
      "Austell",
      "Douglasville",
      "Hiram",
    ],
    customizable: true,
  },
  {
    zone: "Extended/Suburban",
    counties: [
      "Barrow",
      "Bartow",
      "Carroll",
      "Coweta",
      "Fayette",
      "Henry",
      "Newton",
      "Spalding",
      "Walton",
    ],
    cities: [
      "Winder",
      "Cartersville",
      "Carrollton",
      "Newnan",
      "McDonough",
      "Covington",
      "Griffin",
      "Monroe",
    ],
    customizable: true,
  },
  {
    zone: "Out-of-area (manual approval)",
    counties: [],
    cities: [],
    customizable: false, // Requires manual approval, no auto-assignment
  },
];

export function getZoneMapping(zoneName: string): ZoneMapping | null {
  return defaultZoneMappings.find((m) => m.zone === zoneName) || null;
}

export function customerMatchesZone(
  customerCounty: string,
  customerCity: string,
  zones: string[],
  counties: string[]
): boolean {
  // First check if customer's county matches employee's direct counties
  if (counties.includes(customerCounty)) {
    return true;
  }

  // Then check if customer matches any of the employee's zones
  for (const zone of zones) {
    const mapping = getZoneMapping(zone);
    if (!mapping) continue;

    // Check if customer's county matches zone's counties
    if (mapping.counties.includes(customerCounty)) {
      return true;
    }

    // Check if customer's city matches zone's cities
    const customerCityLower = customerCity.toLowerCase().trim();
    if (
      mapping.cities.some(
        (city) => city.toLowerCase().trim() === customerCityLower
      )
    ) {
      return true;
    }
  }

  return false;
}

export default defaultZoneMappings;

