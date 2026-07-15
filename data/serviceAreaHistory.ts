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
  Newnan: {
    name: "Newnan",
    county: "Coweta County",
    tagline: "A historic courthouse town with one of Georgia's most beautiful downtown squares.",
    timeline: [
      {
        year: "1828",
        title: "Coweta County seat",
        detail:
          "Newnan was established as the seat of Coweta County and quickly became a market town for cotton planters across the surrounding countryside.",
      },
      {
        year: "1860s",
        title: "Hospital town of the Confederacy",
        detail:
          "During the Civil War, Newnan's distance from major battle lines made it a hospital center — several historic homes still carry stories from that era.",
      },
      {
        year: "1900s",
        title: "Textiles & downtown growth",
        detail:
          "Mills and manufacturing joined agriculture as economic pillars, while the courthouse square filled with brick storefronts that still define downtown today.",
      },
      {
        year: "Today",
        title: "South metro hub",
        detail:
          "Newnan blends walkable historic character with rapid suburban growth — a regional center for shopping, dining, healthcare, and family neighborhoods.",
      },
    ],
    funFacts: [
      "Newnan's downtown is famous for its film-friendly streetscape — dozens of movies and TV shows have shot scenes on and around the square.",
      "The Coweta County Courthouse anchors a classic Georgia town square lined with restaurants, boutiques, and community events.",
      "Newnan sits at the crossroads of I-85 and US-27, making it a natural hub between Atlanta, LaGrange, and the south metro.",
      "The city hosts seasonal festivals, farmers markets, and parades that draw visitors from across Coweta and Fayette counties.",
    ],
  },
  Brooks: {
    name: "Brooks",
    county: "Fayette County",
    tagline: "A quiet rural community in southern Fayette County.",
    timeline: [
      {
        year: "1900s",
        title: "Farming community",
        detail:
          "Brooks developed as a small agricultural settlement in southern Fayette County, where cotton, livestock, and timber shaped daily life for generations.",
      },
      {
        year: "Today",
        title: "Rural Fayette character",
        detail:
          "Brooks remains one of the most rural corners of Fayette County — larger lots, open land, and a slower pace just minutes from Peachtree City and Senoia.",
      },
    ],
    funFacts: [
      "Brooks offers a country-living feel while still being inside one of Georgia's most sought-after school districts.",
      "Residents enjoy quick access to Peachtree City paths, Senoia's Main Street, and Fayetteville's shopping corridors.",
      "The area is popular with families who want space for gardens, animals, and outdoor projects without leaving south metro.",
    ],
  },
  Atlanta: {
    name: "Atlanta",
    county: "Fulton County",
    tagline: "The capital of the South — born as a railroad crossroads and rebuilt into a global city.",
    timeline: [
      {
        year: "1837",
        title: "Terminus",
        detail:
          "Atlanta began as a railroad junction called Terminus, connecting Georgia to the rest of the country and setting the stage for explosive growth.",
      },
      {
        year: "1864",
        title: "Civil War & rebuilding",
        detail:
          "The city was a Confederate supply hub before falling to Union forces. Atlantans rebuilt quickly afterward — earning a reputation for resilience that still defines the city.",
      },
      {
        year: "1960s",
        title: "Civil Rights movement",
        detail:
          "Atlanta was home to Dr. Martin Luther King Jr. and a center of the Civil Rights movement — shaping the city's identity as a capital of progress and leadership.",
      },
      {
        year: "1996",
        title: "Olympic city",
        detail:
          "The Summer Olympics put modern Atlanta on the world stage, spurring new infrastructure, parks, and investment across the metro.",
      },
      {
        year: "Today",
        title: "Metro Atlanta",
        detail:
          "The city anchors one of America's fastest-growing regions — home to Fortune 500 companies, Hartsfield-Jackson (the world's busiest airport), and diverse neighborhoods from Buckhead to the BeltLine.",
      },
    ],
    funFacts: [
      "Atlanta has more than 70 streets with 'Peachtree' in the name — but the name comes from the Native American village of Standing Peachtree, not the fruit tree.",
      "Hartsfield-Jackson International Airport has held the title of world's busiest airport for decades.",
      "The Atlanta BeltLine is transforming old rail corridors into one of the country's largest urban trail and transit projects.",
      "Metro Atlanta spans dozens of cities and counties — Bin Blast serves residential and commercial properties across the region.",
    ],
  },
  "East Point": {
    name: "East Point",
    county: "Fulton County",
    tagline: "A historic southside city with deep railroad roots near Hartsfield-Jackson.",
    timeline: [
      {
        year: "1870",
        title: "Railroad depot town",
        detail:
          "East Point grew around a Atlanta & West Point Railroad depot — the name itself marks the eastern end of the West Point line.",
      },
      {
        year: "1887",
        title: "Incorporated",
        detail:
          "The city was officially incorporated, developing as a working-class community with shops, churches, and neighborhoods along the rail corridor.",
      },
      {
        year: "Today",
        title: "Airport-adjacent growth",
        detail:
          "Just minutes from Hartsfield-Jackson, East Point balances historic bungalows and downtown redevelopment with new residential and commercial investment.",
      },
    ],
    funFacts: [
      "East Point's downtown district is on the National Register of Historic Places — classic early-20th-century commercial architecture.",
      "The city is a major access point for airport workers, logistics businesses, and travelers across south Fulton.",
      "Camp Creek Marketplace and other nearby retail corridors make East Point a shopping hub for the southside.",
    ],
  },
  "College Park": {
    name: "College Park",
    county: "Fulton County",
    tagline: "A historic city at the doorstep of the world's busiest airport.",
    timeline: [
      {
        year: "1890",
        title: "City of College Park",
        detail:
          "Originally incorporated as Atlantic City, the town was renamed College Park for the nearby Cox College — a women's institution of the era.",
      },
      {
        year: "1900s",
        title: "Streetcar suburb",
        detail:
          "Streetcar lines connected College Park to Atlanta, spurring Victorian and Craftsman homes that still line many neighborhoods today.",
      },
      {
        year: "Today",
        title: "Airport city",
        detail:
          "College Park wraps around the western edge of Hartsfield-Jackson — a mix of historic neighborhoods, hotels, and commercial corridors serving global travelers.",
      },
    ],
    funFacts: [
      "College Park has one of the largest collections of historic homes on the southside — many dating to the streetcar era.",
      "The city hosts the annual College Park Main Street Festival and other events that celebrate local arts and food.",
      "Georgia International Convention Center in nearby College Park hosts major trade shows and events year-round.",
    ],
  },
  Hapeville: {
    name: "Hapeville",
    county: "Fulton County",
    tagline: "A tight-knit city with Ford heritage and airport-adjacent charm.",
    timeline: [
      {
        year: "1891",
        title: "Hapeville founded",
        detail:
          "Dr. Samuel Hape and investors platted the town along the Atlanta & West Point Railroad, building a community of homes, churches, and local businesses.",
      },
      {
        year: "1947",
        title: "Ford assembly plant",
        detail:
          "Ford Motor Company opened a major assembly plant in Hapeville — for decades it was one of the area's largest employers and a pillar of the local economy.",
      },
      {
        year: "Today",
        title: "Redevelopment & community",
        detail:
          "After the Ford plant closed, the site became Aerotropolis Atlanta. Hapeville keeps its small-town feel with a walkable downtown of restaurants and local shops.",
      },
    ],
    funFacts: [
      "Hapeville is the birthplace of Chick-fil-A — the original Dwarf House restaurant still operates on North Central Avenue.",
      "The city's downtown has become a food destination, with breweries, bakeries, and chef-driven restaurants in a walkable district.",
      "Hapeville sits directly south of the airport — many residents work in aviation, hospitality, and logistics.",
    ],
  },
  "South Fulton": {
    name: "South Fulton",
    county: "Fulton County",
    tagline: "Georgia's newest city — uniting diverse south Fulton communities.",
    timeline: [
      {
        year: "2017",
        title: "City incorporated",
        detail:
          "Voters approved incorporation for the City of South Fulton, bringing together unincorporated communities across roughly 90 square miles of south Fulton County.",
      },
      {
        year: "Today",
        title: "Growing together",
        detail:
          "South Fulton includes neighborhoods from Camp Creek to Sandtown, combining suburban subdivisions, rural acreage, and commercial corridors along I-285 and I-85.",
      },
    ],
    funFacts: [
      "South Fulton is one of the largest cities in Georgia by land area — bigger than Atlanta proper.",
      "The city includes diverse communities like Sandtown, Red Oak, and areas near Wolf Creek Amphitheater.",
      "Residents enjoy proximity to Cascade Springs Nature Preserve, Cochran Mill Park, and other southside outdoor gems.",
    ],
  },
  Fairburn: {
    name: "Fairburn",
    county: "Fulton County",
    tagline: "A railroad town with a walkable downtown and south-metro momentum.",
    timeline: [
      {
        year: "1854",
        title: "Town of Fairburn",
        detail:
          "Fairburn developed as a stop on the Atlanta & West Point Railroad, serving farmers and merchants in south Fulton and north Coweta.",
      },
      {
        year: "1870s",
        title: "Rebuilt after the war",
        detail:
          "Like many Georgia towns, Fairburn rebuilt its commercial district after the Civil War — brick storefronts along the railroad still anchor downtown.",
      },
      {
        year: "Today",
        title: "South Fulton growth",
        detail:
          "Fairburn has seen major residential and commercial growth while preserving a historic main street with local shops, events, and community pride.",
      },
    ],
    funFacts: [
      "Fairburn hosts the annual Georgia Renaissance Festival nearby — one of the largest Renaissance fairs in the country.",
      "The city's downtown is listed on the National Register of Historic Places.",
      "Fairburn sits between Atlanta, Peachtree City, and Union City — a convenient crossroads for south-metro commuters.",
    ],
  },
  "Union City": {
    name: "Union City",
    county: "Fulton County",
    tagline: "A south Fulton city at the crossroads of film, logistics, and growth.",
    timeline: [
      {
        year: "1908",
        title: "Incorporated",
        detail:
          "Union City was established as a railroad community in south Fulton, named for the intersection of rail lines that connected the region to Atlanta.",
      },
      {
        year: "2000s",
        title: "Studios & development",
        detail:
          "Major film and TV production facilities opened nearby, bringing jobs and investment while residential neighborhoods expanded along the I-85 corridor.",
      },
      {
        year: "Today",
        title: "South metro corridor",
        detail:
          "Union City balances industrial and studio employment with family neighborhoods — a key link between Atlanta, Fairburn, and Fayette County.",
      },
    ],
    funFacts: [
      "Pinewood Atlanta Studios and Trilith are minutes away — Union City residents are neighbors to major Hollywood productions.",
      "The city is home to one of the largest IKEA stores in the southeastern United States.",
      "Union City's location along I-85 makes it a hub for distribution, film crews, and south-metro commuters.",
    ],
  },
  Jonesboro: {
    name: "Jonesboro",
    county: "Clayton County",
    tagline: "The Clayton County seat — historic streets with a literary legend.",
    timeline: [
      {
        year: "1823",
        title: "County seat",
        detail:
          "Jonesboro was established as the seat of Clayton County, serving as the government and market center for the surrounding farmland.",
      },
      {
        year: "1864",
        title: "Battle of Jonesborough",
        detail:
          "The final battle of the Atlanta Campaign was fought nearby — Union victory here helped seal the fate of Atlanta and the Confederacy's western theater.",
      },
      {
        year: "1936",
        title: "Gone With the Wind",
        detail:
          "Margaret Mitchell's novel placed the fictional Tara in the Jonesboro area — the town has embraced its connection to one of America's most famous stories.",
      },
      {
        year: "Today",
        title: "South metro center",
        detail:
          "Jonesboro anchors Clayton County government and courts while new development along GA-54 and I-75 serves a growing residential population.",
      },
    ],
    funFacts: [
      "The Road to Tara Museum and Stately Oaks plantation tell the area's Civil War and literary history.",
      "Clayton County was named for Augustine Clayton, a Georgia judge and congressman.",
      "Jonesboro is a short drive from Atlanta, the airport, and Lake Spivey — popular for fishing and recreation.",
    ],
  },
  Hampton: {
    name: "Hampton",
    county: "Henry County",
    tagline: "A Henry County city where small-town life meets racing country.",
    timeline: [
      {
        year: "1873",
        title: "Hampton established",
        detail:
          "The community grew as a railroad stop in Henry County, named for Wade Hampton, a Confederate cavalry leader and later South Carolina governor.",
      },
      {
        year: "1960",
        title: "Atlanta Motor Speedway",
        detail:
          "NASCAR racing came to Hampton when Atlanta Motor Speedway opened — putting the city on the map for motorsports fans nationwide.",
      },
      {
        year: "Today",
        title: "Henry County growth",
        detail:
          "Hampton keeps its hometown feel while benefiting from Henry County's rapid suburban expansion and easy access to I-75.",
      },
    ],
    funFacts: [
      "Atlanta Motor Speedway hosts two NASCAR Cup Series weekends each year — a major economic driver for the whole region.",
      "Hampton's historic downtown has local shops and restaurants with classic small-town Georgia character.",
      "The city sits between McDonough, Stockbridge, and Griffin — a convenient base for south-metro families.",
    ],
  },
  Stockbridge: {
    name: "Stockbridge",
    county: "Henry County",
    tagline: "A fast-growing Henry County city along the I-75 corridor.",
    timeline: [
      {
        year: "1829",
        title: "Crossroads settlement",
        detail:
          "Stockbridge began as a stagecoach stop and market point in Henry County, named for Professor Stockbridge, a traveling professor who once taught in the area.",
      },
      {
        year: "1895",
        title: "Incorporated",
        detail:
          "The city was officially incorporated, developing around local commerce, churches, and farms south of Atlanta.",
      },
      {
        year: "Today",
        title: "I-75 boom",
        detail:
          "Stockbridge has become one of Henry County's fastest-growing cities — new neighborhoods, retail at Eagle's Landing, and commuter access to Atlanta.",
      },
    ],
    funFacts: [
      "Panola Mountain State Park and Arabia Mountain are a short drive away — popular for hiking and outdoor adventure.",
      "The Eagle's Landing commercial district is a major shopping and dining destination for south metro.",
      "Stockbridge is home to Atlanta Motor Speedway's neighbor communities and a growing restaurant scene.",
    ],
  },
  McDonough: {
    name: "McDonough",
    county: "Henry County",
    tagline: "The Henry County seat with a charming historic square.",
    timeline: [
      {
        year: "1823",
        title: "County seat",
        detail:
          "McDonough was established as the seat of Henry County, named for naval officer Thomas Macdonough, hero of the War of 1812.",
      },
      {
        year: "1900s",
        title: "Courthouse town",
        detail:
          "The historic courthouse square became the heart of community life — a pattern that still defines downtown McDonough today.",
      },
      {
        year: "Today",
        title: "Henry County hub",
        detail:
          "McDonough anchors one of Georgia's fastest-growing counties, blending a walkable downtown with sprawling new subdivisions and commercial growth along I-75.",
      },
    ],
    funFacts: [
      "McDonough's Geranium Festival is a beloved spring tradition that fills the square with flowers, food, and local vendors.",
      "The historic district around the square features local restaurants, antique shops, and seasonal events.",
      "Henry County is one of the top ten fastest-growing counties in the United States — McDonough is at the center of it.",
    ],
  },
  Douglasville: {
    name: "Douglasville",
    county: "Douglas County",
    tagline: "The Douglas County seat — west-metro growth with small-town roots.",
    timeline: [
      {
        year: "1874",
        title: "County seat",
        detail:
          "Douglasville was established as the seat of Douglas County when the Georgia General Assembly created the county from parts of Campbell and Carroll.",
      },
      {
        year: "1900s",
        title: "Railroad & courthouse",
        detail:
          "The town grew around the Georgia Pacific Railway and a classic courthouse square — still the civic heart of the community.",
      },
      {
        year: "Today",
        title: "West metro expansion",
        detail:
          "Douglasville serves as a retail and government center for west metro Atlanta, with new residential development stretching toward the Chattahoochee.",
      },
    ],
    funFacts: [
      "Douglas County was named for Stephen A. Douglas, the Illinois senator who debated Abraham Lincoln.",
      "The Douglasville Conference Center and O'Neal Plaza host concerts, farmers markets, and community gatherings.",
      "Sweetwater Creek State Park and the historic mill ruins are nearby — a favorite for hiking and photography.",
    ],
  },
};

export function getServiceAreaProfile(area: ServiceArea): ServiceAreaProfile {
  return SERVICE_AREA_PROFILES[area];
}
