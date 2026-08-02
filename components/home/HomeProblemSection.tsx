import { BookCleaningLink } from "./BookCleaningLink";
import { HomeSectionLink } from "./HomeSectionLink";

export function HomeProblemSection() {
  return (
    <section id="problem" className="home-problem">
      <div className="container home-problem__inner">
        <div className="home-problem__copy">
          <h2 className="section-title">
            Your Trash Bin Is One of the Dirtiest Things Around Your Home
          </h2>
          <p className="section-subtitle">
            Even when the bag is gone, residue, moisture, and bacteria stay behind. Over time,
            that leads to smells, pests, and a mess you shouldn&apos;t have to deal with.
          </p>
          <ul className="home-problem__list">
            {[
              "Bad odors that linger around your garage and driveway",
              "Bacteria and germs building up inside the bin",
              "Flies and pests drawn to leftover waste residue",
              "Maggots during warm weather",
              "Dirty runoff spreading onto your driveway or sidewalk",
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="home-problem__solution">
          <p className="home-problem__solution-label">The Bin Blast fix</p>
          <h3>We clean, sanitize, and deodorize your bins curbside</h3>
          <p>
            Our team arrives after trash pickup with professional equipment. We deep-clean the
            inside and outside, kill odor-causing bacteria, and leave your bin fresh — without
            you lifting a finger.
          </p>
          <BookCleaningLink />
        </div>
      </div>
    </section>
  );
}
