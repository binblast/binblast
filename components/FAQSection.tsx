// components/FAQSection.tsx
"use client";

import { useState } from "react";

const faqData = [
  {
    question: "How long does the cleaning process take?",
    answer: "Our cleaning process typically takes about 10-15 minutes per bin. We use high-pressure hot water and eco-friendly cleaning solutions to ensure a thorough clean."
  },
  {
    question: "Do I need to be home during the cleaning?",
    answer: "No, you don't need to be home! Just leave your bins at the curb or in your driveway, and we'll take care of the rest. We'll send you a notification when we're done."
  },
  {
    question: "What cleaning products do you use?",
    answer: "We use eco-friendly, biodegradable cleaning solutions that are safe for the environment and effective at removing odors and bacteria. All products are EPA-approved."
  },
  {
    question: "Can you clean both trash and recycling bins?",
    answer: "Yes! We clean all types of bins including trash, recycling, and compost bins. Just let us know what you need when you book your service."
  },
  {
    question: "How do I cancel or reschedule my appointment?",
    answer: "You can cancel or reschedule your appointment by calling us or logging into your account online. We require at least 24 hours notice for cancellations."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, and digital payment methods. For subscription plans, we can set up automatic billing for your convenience."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="faq">
      <div className="container">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqData.map((item, index) => (
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

