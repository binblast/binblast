import Link from "next/link";

const COMPARISON_ROWS = [
  {
    label: "Time spent",
    diy: "30–60 minutes per bin",
    binBlast: "You do nothing — we handle it",
  },
  {
    label: "Cleanup mess",
    diy: "Dirty water and residue everywhere",
    binBlast: "Contained professional equipment",
  },
  {
    label: "Sanitizing",
    diy: "Doesn't fully sanitize",
    binBlast: "Fully sanitized & deodorized",
  },
  {
    label: "Chemicals",
    diy: "Strong store-bought chemicals",
    binBlast: "Eco-friendly professional process",
  },
  {
    label: "Consistency",
    diy: "Easy to skip or forget",
    binBlast: "Reliable scheduled service",
  },
] as const;

export function HomeWhyChooseSection() {
  return (
    <section id="why-bin-blast" className="home-why-choose">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: "center" }}>
          Why Choose Bin Blast Co.?
        </h2>
        <p className="section-subtitle" style={{ textAlign: "center", margin: "0.75rem auto 0" }}>
          DIY bin cleaning is messy, time-consuming, and rarely gets the job done right.
        </p>

        <div className="home-why-choose__table-wrap">
          <table className="home-why-choose__table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">DIY</th>
                <th scope="col" className="home-why-choose__highlight">
                  Bin Blast Co.
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.diy}</td>
                  <td className="home-why-choose__highlight">{row.binBlast}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
