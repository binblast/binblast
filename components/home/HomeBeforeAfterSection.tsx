import Link from "next/link";

export function HomeBeforeAfterSection() {
  return (
    <section id="results" className="home-before-after">
      <div className="container" style={{ maxWidth: "920px", textAlign: "center" }}>
        <h2 className="section-title">See the Bin Blast Difference</h2>
        <p className="section-subtitle" style={{ margin: "0.75rem auto 0" }}>
          Real before-and-after photos from Bin Blast Co. service visits will be displayed here. We only publish verified results from actual customer cleanings.
        </p>
        <div className="home-before-after__grid">
          <div className="home-before-after__slot">Before photo placeholder — real results coming soon</div>
          <div className="home-before-after__slot">After photo placeholder — real results coming soon</div>
        </div>
        <Link href="#pricing" className="btn btn-primary btn-large">
          Book a Cleaning
        </Link>
      </div>
    </section>
  );
}
