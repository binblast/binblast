import type { ServiceArea } from "@/lib/service-areas";

export interface ServiceAreaTimelineEntry {
  year: string;
  title: string;
  detail: string;
}

export interface ServiceAreaProfile {
  name: ServiceArea;
  county: string;
  tagline: string;
  timeline: ServiceAreaTimelineEntry[];
  funFacts: string[];
}

export const SERVICE_AREA_PROFILES: Record<ServiceArea, ServiceAreaProfile> = {
  "Peachtree City": {
    name: "Peachtree City",
    county: "Fayette County",
    tagline: "Georgia's master-planned community famous for golf cart paths and lakes.",
    timeline: [
      {
        year: "1959",
        title: "A town built on purpose",
        detail:
          "Developer Joel Cowan and a Ford-affiliated group began planning Peachtree City as one of the South's first large-scale planned communities — designed from the ground up instead of growing randomly along a railroad.",
      },
      {
        year: "1960s",
        title: "Lakes and village centers take shape",
        detail:
          "Early phases added Lake Peachtree and distinct village clusters (Kedron, Aberdeen, and others), each with its own neighborhood feel while sharing green space and paths.",
      },
      {
        year: "1970s–80s",
        title: "Atlanta suburb boom",
        detail:
          "As metro Atlanta expanded south, Peachtree City became a magnet for families who wanted suburban space with thoughtful layout — schools, parks, and paths were part of the plan from day one.",
      },
      {
        year: "Today",
        title: "Cart paths & community life",
        detail:
          "With 100+ miles of multi-use paths, Peachtree City is one of the few places in America where golf carts are everyday transportation — to schools, shops, and neighborhood events.",
      },
    ],
    funFacts: [
      "Peachtree City is the largest city in Fayette County and one of Georgia's best-known planned communities.",
      "The path network connects villages, lakes, and commercial areas — many residents ride carts more than cars for local errands.",
      "Lake Peachtree and Lake Kedron are centerpieces of outdoor life: fishing, kayaking, and community gatherings.",
      "The city hosts events like the Frederick Brown Jr. Amphitheater concert series and seasonal festivals that draw the whole south metro.",
    ],
  },
  Fayetteville: {
    name: "Fayetteville",
    county: "Fayette County",
    tagline: "The Fayette County seat with a historic square and deep local roots.",
    timeline: [
      {
        year: "1821",
        title: "Fayette County is born",
        detail:
          "The Georgia legislature created Fayette County from parts of neighboring counties, naming it after the Marquis de Lafayette — the French hero of the American Revolution.",
      },
      {
        year: "1823",
        title: "Fayetteville becomes the county seat",
        detail:
          "The town of Fayetteville was established as the government center for the county, anchoring courts, commerce, and community life around what would become the historic downtown square.",
      },
      {
        year: "1860s",
        title: "Civil War era",
        detail:
          "During the Atlanta Campaign, Union and Confederate forces moved through Fayette County. Local homes and churches still tell stories of that period, and the courthouse square remained the heart of the community afterward.",
      },
      {
        year: "1900s",
        title: "Courthouse & cotton economy",
        detail:
          "The current Fayette County Courthouse (built in the 1920s on the square) became a landmark as agriculture and small-town retail defined daily life around Broad Street.",
      },
      {
        year: "1990s–200s",
        title: "South metro growth",
        detail:
          "As Peachtree City and surrounding areas boomed, Fayetteville evolved too — new neighborhoods, shops, and roads while keeping its walkable historic core.",
      },
      {
        year: "Today",
        title: "Historic square + modern Fayette",
        detail:
          "Downtown still hosts local restaurants, shops, and events, while newer corridors along GA-54 and nearby development serve one of the fastest-growing corners of metro Atlanta.",
      },
    ],
    funFacts: [
      "Fayetteville's downtown square is a classic Georgia courthouse town — perfect for strolling, local dining, and community events.",
      "The Holliday-Dorsey-Fife House Museum on the square preserves 19th-century life in Fayette County.",
      "Fayette County was named for Lafayette, who visited the United States multiple times and was celebrated nationwide in the 1800s.",
      "Pinewood Atlanta Studios and Trilith are just minutes away — major film and TV production has put this whole region on the map.",
      "Local schools, parks, and the county library system make Fayetteville a hub for families across south metro.",
    ],
  },
  Tyrone: {
    name: "Tyrone",
    county: "Fayette County",
    tagline: "A quiet Fayette County town with small-community charm.",
    timeline: [
      {
        year: "Late 1800s",
        title: "Railroad & farming roots",
        detail:
          "Like many south-metro towns, Tyrone grew up around agriculture and rail connections that linked Fayette County to Atlanta and beyond.",
      },
      {
        year: "1911",
        title: "Official incorporation",
        detail:
          "Tyrone was incorporated as a town, giving the community a formal local government as Fayette County developed.",
      },
      {
        year: "Today",
        title: "Residential growth corridor",
        detail:
          "Tyrone remains a favorite for families who want Fayette County schools and suburban space with a calmer, small-town feel between Peachtree City and Fairburn.",
      },
    ],
    funFacts: [
      "The name Tyrone comes from County Tyrone in Ireland — a common pattern for railroad-era town names in Georgia.",
      "Tyrone sits along the Flat Creek area and is known for wooded neighborhoods and easy access to I-85.",
      "Many residents commute to Atlanta, Hartsfield-Jackson, or nearby business parks while living on larger lots than intown.",
    ],
  },
  Sharpsburg: {
    name: "Sharpsburg",
    county: "Coweta County",
    tagline: "A small historic town on the edge of Senoia and south metro.",
    timeline: [
      {
        year: "1871",
        title: "Town established",
        detail:
          "Sharpsburg was incorporated as a small railroad community in Coweta County, serving farmers and merchants in the surrounding countryside.",
      },
      {
        year: "1900s",
        title: "Crossroads community",
        detail:
          "For generations, Sharpsburg was the kind of place where everyone knew the general store, the church, and the neighbors — a classic Georgia crossroads town.",
      },
      {
        year: "Today",
        title: "Quiet base near Senoia",
        detail:
          "Sharpsburg keeps its small-town scale while benefiting from growth along the Senoia and Peachtree City corridor — close to shops, studios, and new development.",
      },
    ],
    funFacts: [
      "Sharpsburg was named for Elias Sharp, a local judge and community leader.",
      "It's one of the smallest incorporated towns in the region — blink and you're through, but the community identity runs deep.",
      "Residents often shop and dine in nearby Senoia or Peachtree City while enjoying Sharpsburg's slower pace at home.",
    ],
  },
  Senoia: {
    name: "Senoia",
    county: "Coweta County",
    tagline: "Historic Main Street charm — and a Hollywood-famous downtown.",
    timeline: [
      {
        year: "1860",
        title: "Community takes root",
        detail:
          "Settlers established Senoia during the cotton era; the town grew as a market point for farmers in Coweta and Fayette counties.",
      },
      {
        year: "1905",
        title: "Incorporated",
        detail:
          "Senoia became an official city, with a classic brick storefront Main Street that still defines the town today.",
      },
      {
        year: "2010s",
        title: "Walking Dead & film tourism",
        detail:
          "When AMC filmed The Walking Dead in and around Senoia, the downtown became a destination — fans from around the world visit the shops, tours, and recognizable streets.",
      },
      {
        year: "Today",
        title: "Small town, big spotlight",
        detail:
          "Senoia balances historic character with new neighborhoods nearby — it's a favorite stop for coffee, boutiques, and weekend strolls.",
      },
    ],
    funFacts: [
      "The name Senoia likely comes from a Native American word linked to the Senoah Mountain area in North Georgia.",
      "Downtown Senoia has been used for numerous films and TV shows beyond The Walking Dead — the streetscape reads as 'anywhere America' on camera.",
      "The Senoia Raceway (historically local racing culture) and community events keep hometown traditions alive alongside tourism.",
      "It's a popular place for Peachtree City and Fayetteville residents to spend a Saturday — ice cream, antiques, and photos on Main Street.",
    ],
  },
};

export function getServiceAreaProfile(area: ServiceArea): ServiceAreaProfile {
  return SERVICE_AREA_PROFILES[area];
}
