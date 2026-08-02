import Link from "next/link";

const CUSTOMER_REVIEWS = [
  {
    name: "Jessica T.",
    location: "Peachtree City, GA",
    quote:
      "Our bins have never been this clean! Amazing service, super easy to schedule, and well worth it.",
  },
  {
    name: "Michael R.",
    location: "Fayetteville, GA",
    quote:
      "Bin Blast Co. is professional, reliable, and does a fantastic job every time. Highly recommend!",
  },
  {
    name: "Sarah W.",
    location: "Tyrone, GA",
    quote: "We use their recurring service and our bins always smell fresh and look brand new.",
  },
  {
    name: "David L.",
    location: "Newnan, GA",
    quote:
      "Great company to work with! They're on time, thorough, and our community loves the results.",
  },
] as const;

function StarRating() {
  return (
    <div className="home-review-card__stars" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.9l-4.94 2.81.94-5.5-4-3.9 5.53-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="home-review-card__verified">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zm3.78 6.03-4.4 4.4a.75.75 0 0 1-1.06 0l-2.2-2.2a.75.75 0 1 1 1.06-1.06l1.67 1.67 3.87-3.87a.75.75 0 1 1 1.06 1.06z" />
      </svg>
      Verified Customer
    </span>
  );
}

export function HomeReviewsSection() {
  return (
    <section id="testimonials" className="home-reviews">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: "center" }}>
          ⭐⭐⭐⭐⭐ What Customers Are Saying
        </h2>
        <div className="home-reviews__grid">
          {CUSTOMER_REVIEWS.map((review) => {
            const initial = review.name.charAt(0);

            return (
              <article key={review.name} className="home-review-card">
                <StarRating />
                <blockquote className="home-review-card__quote">&ldquo;{review.quote}&rdquo;</blockquote>
                <div className="home-review-card__author">
                  <span className="home-review-card__avatar" aria-hidden="true">
                    {initial}
                  </span>
                  <div>
                    <p className="home-review-card__name">{review.name}</p>
                    <p className="home-review-card__location">{review.location}</p>
                  </div>
                </div>
                <VerifiedBadge />
              </article>
            );
          })}
        </div>
        <div className="home-reviews__cta">
          <Link href="#pricing" className="btn btn-primary btn-large">
            Book Your Cleaning
          </Link>
        </div>
      </div>
    </section>
  );
}
