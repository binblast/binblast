// components/FAQSection.tsx
"use client";

import { useState } from "react";

import { HOME_FAQ_ITEMS } from "@/lib/seo/faq-data";

export function FAQSection({ items = HOME_FAQ_ITEMS }: { items?: typeof HOME_FAQ_ITEMS }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="faq">
      <div className="container">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {items.map((item, index) => (
            <div key={index} className={`faq-item ${openIndex === index ? 'active' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => toggleFAQ(index)}
              >
                <span>{item.question}</span>
                <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
              </button>
              {openIndex === index && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

