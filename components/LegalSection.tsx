import type { ReactNode } from "react";

interface LegalSectionProps {
  id?: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="legal-section">
      <h2 className="legal-section__title">{title}</h2>
      <div className="legal-section__body">{children}</div>
    </section>
  );
}

interface LegalContactBoxProps {
  title?: string;
  children: ReactNode;
  email?: string;
  phone?: string;
}

export function LegalContactBox({
  title = "Need help?",
  children,
  email = "support@binblastco.com",
  phone = "(470) 305-0823",
}: LegalContactBoxProps) {
  return (
    <div className="legal-contact-box">
      <p className="legal-contact-box__title">{title}</p>
      <p className="legal-contact-box__text">{children}</p>
      <div className="legal-contact-box__links">
        <a href={`mailto:${email}`}>{email}</a>
        <a href="tel:+14703050823">{phone}</a>
      </div>
    </div>
  );
}
