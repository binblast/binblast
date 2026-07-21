import { redirect } from "next/navigation";
import { LOCATION_SEO_PAGES } from "@/data/locationSeoPages";

const LEGACY_TO_NEW_SLUG: Record<string, string> = {
  fayetteville: "trash-can-cleaning-fayetteville-ga",
  "peachtree-city": "trash-can-cleaning-peachtree-city-ga",
  atlanta: "trash-can-cleaning-atlanta-ga",
  newnan: "trash-can-cleaning-newnan-ga",
  stockbridge: "trash-can-cleaning-stockbridge-ga",
  mcdonough: "trash-can-cleaning-mcdonough-ga",
};

export function generateStaticParams() {
  return LOCATION_SEO_PAGES.map((page) => ({ slug: page.slug }));
}

export default function LegacyLocationRedirect({ params }: { params: { slug: string } }) {
  const destination = LEGACY_TO_NEW_SLUG[params.slug];
  if (destination) {
    redirect(`/${destination}`);
  }

  redirect("/#service-areas");
}
