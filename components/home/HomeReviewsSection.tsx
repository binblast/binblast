import Link from "next/link";

export function HomeReviewsSection() {
  return (
    <section id="testimonials" className="home-reviews">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: "center" }}>
          What Customers Are Saying
        </h2>
        <div className="home-reviews__panel">
          <p>
            Verified customer reviews will appear here as they become available. Bin Blast Co. does not publish placeholder or unverified testimonials.
          </p>
          <p style={{ marginTop: "1rem" }}>
            Recently served in South Metro Atlanta? Share your experience with our team after your cleaning.
          </p>
          <Link href="#pricing" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Book a Cleaning
          </Link>
        </div>
      </div>
    </section>
  );
}
