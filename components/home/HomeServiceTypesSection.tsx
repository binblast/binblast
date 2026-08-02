import Link from "next/link";
import Image from "next/image";

const SERVICE_TYPES = [
  {
    title: "Residential Bin Cleaning",
    description: "Professional cleaning for household trash and recycling bins.",
    href: "/residential-trash-can-cleaning",
    image: "/residential-bin-service.jpg",
    imageAlt: "Bin Blast Co. technician power washing a residential trash bin at the curb",
  },
  {
    title: "HOA & Neighborhood Service",
    description: "Scheduled service options for communities that want cleaner and more presentable curbsides.",
    href: "/hoa-trash-can-cleaning",
    image: "/hoa-neighborhood-service.jpg",
    imageAlt: "Bin Blast Co. branded trash bins lined up along a neighborhood curb for HOA service",
  },
  {
    title: "Restaurant Bin Cleaning",
    description: "Cleaning options for businesses dealing with food residue, odors, and frequent waste use.",
    href: "/restaurant-trash-bin-cleaning",
    image: "/restaurant-bin-service.jpg",
    imageAlt: "Bin Blast Co. technician power washing a commercial dumpster behind a restaurant",
  },
  {
    title: "Commercial Bin Cleaning",
    description: "Custom service plans for apartments, offices, property managers, and commercial locations.",
    href: "/commercial-trash-bin-cleaning",
    image: "/commercial-bin-service.jpg",
    imageAlt: "Bin Blast Co. technician power washing a row of commercial trash bins at a business property",
  },
] as const;

export function HomeServiceTypesSection() {
  return (
    <section id="services-overview" className="home-service-types">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: "center" }}>
          Trash Bin Cleaning for Homes, Communities, and Businesses
        </h2>
        <p className="section-subtitle" style={{ textAlign: "center", margin: "0.75rem auto 0" }}>
          Bin Blast Co. serves homeowners, HOAs, restaurants, apartment communities, property managers, and commercial businesses across South Metro Atlanta.
        </p>
        <div className="home-service-types__grid">
          {SERVICE_TYPES.map((service) => (
            <Link key={service.href} href={service.href} className="home-service-type-card">
              <div className="home-service-type-card__media">
                <Image
                  src={service.image}
                  alt={service.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
              <div className="home-service-type-card__body">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="home-service-type-card__link">Learn more →</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="home-section-cta">
          <Link href="#pricing" className="btn btn-primary btn-large">
            Book Your Cleaning
          </Link>
        </div>
      </div>
    </section>
  );
}
