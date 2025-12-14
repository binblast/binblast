// lib/training-modules.ts
/**
 * @deprecated This file is kept for backward compatibility during migration.
 * New code should use Firestore API routes (/api/training/modules) instead.
 * This file will be removed after full migration to Firestore is complete.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation?: string;
}

export interface TrainingModuleConfig {
  id: string;
  name: string;
  description: string;
  type: "welcome" | "safety" | "cleaning" | "sticker" | "photo" | "route" | "policies";
  pdfUrl?: string;
  pdfFileName?: string;
  quiz: {
    questions: QuizQuestion[];
    passingScore: number; // default 80
    minQuestions: number; // 3-5
  };
  required: boolean;
  requiredForPayment: boolean; // Photo Documentation only
  order: number; // Display order
  duration: string;
}

export const TRAINING_MODULES: TrainingModuleConfig[] = [
  {
    id: "welcome",
    name: "Welcome to Bin Blast Co.",
    description: "Introduction to Bin Blast Co. and your role",
    type: "welcome",
    pdfFileName: "welcome-to-bin-blast.pdf",
    quiz: {
      questions: [
        {
          id: "welcome-1",
          question: "What does Bin Blast prioritize most?",
          options: [
            "Speed",
            "Customer satisfaction and service quality",
            "Cost cutting",
            "Employee convenience"
          ],
          correctAnswer: 1,
          explanation: "Bin Blast prioritizes customer satisfaction and service quality above all else."
        },
        {
          id: "welcome-2",
          question: "When should you contact an operator?",
          options: [
            "Only at the end of the day",
            "When you encounter issues, need clarification, or have questions",
            "Never, handle everything yourself",
            "Only for emergencies"
          ],
          correctAnswer: 1,
          explanation: "You should contact an operator whenever you encounter issues, need clarification, or have questions. Communication is key to success."
        },
        {
          id: "welcome-3",
          question: "What is your primary responsibility as a Bin Blast employee?",
          options: [
            "Complete routes as fast as possible",
            "Provide excellent cleaning service and maintain professional conduct",
            "Avoid difficult stops",
            "Work independently without communication"
          ],
          correctAnswer: 1,
          explanation: "Your primary responsibility is to provide excellent cleaning service and maintain professional conduct at all times."
        },
        {
          id: "welcome-4",
          question: "What should you prioritize when completing cleanings?",
          options: [
            "Speed over quality",
            "Quality over speed - take time to do the job right",
            "Skipping difficult stops",
            "Avoiding photo documentation"
          ],
          correctAnswer: 1,
          explanation: "Always prioritize quality over speed. Take the time to do the job right, following all safety and quality standards."
        },
        {
          id: "welcome-5",
          question: "What must you complete before being assigned routes?",
          options: [
            "Nothing, routes are assigned immediately",
            "All required training modules",
            "Only safety training",
            "Only photo documentation training"
          ],
          correctAnswer: 1,
          explanation: "You must complete all required training modules before being assigned routes. Training ensures you understand safety, quality, and company standards."
        }
      ],
      passingScore: 80,
      minQuestions: 5
    },
    required: true,
    requiredForPayment: false,
    order: 1,
    duration: "5 min"
  },
  {
    id: "safety-basics",
    name: "Safety Basics",
    description: "Essential safety protocols and procedures",
    type: "safety",
    pdfFileName: "safety-basics.pdf",
    quiz: {
      questions: [
        {
          id: "safety-1",
          question: "What should you do if a bin contains hazardous material?",
          options: [
            "Clean it anyway",
            "Skip the stop",
            "Do not touch it, flag it for operator review, and contact your operator immediately",
            "Move it to a different location"
          ],
          correctAnswer: 2,
          explanation: "Never handle hazardous materials. Flag the stop and contact your operator immediately for proper handling."
        },
        {
          id: "safety-2",
          question: "What PPE (Personal Protective Equipment) should you always wear?",
          options: [
            "No PPE needed",
            "Protective gloves at minimum",
            "Full hazmat suit",
            "Only when you remember"
          ],
          correctAnswer: 1,
          explanation: "Protective gloves should always be worn when handling bins to protect against cuts, chemicals, and contamination."
        },
        {
          id: "safety-3",
          question: "What should you do if you notice unsafe conditions at a customer's property?",
          options: [
            "Ignore it and continue",
            "Document it, flag the issue, and notify your operator",
            "Fix it yourself",
            "Only report if it's severe"
          ],
          correctAnswer: 1,
          explanation: "Always document and report unsafe conditions to your operator. Safety is everyone's responsibility."
        },
        {
          id: "safety-4",
          question: "How should you handle customer property?",
          options: [
            "Move things around as needed",
            "Treat all customer property with respect and care",
            "Only be careful with expensive items",
            "Customer property doesn't matter"
          ],
          correctAnswer: 1,
          explanation: "Always treat customer property with respect and care. This includes bins, gates, driveways, and any other property."
        },
        {
          id: "safety-5",
          question: "What should you do if you encounter needles or medical waste?",
          options: [
            "Clean it carefully",
            "Do not touch it, stop immediately, document with photos if safe, and contact your operator",
            "Move it to a different location",
            "Ignore it and continue"
          ],
          correctAnswer: 1,
          explanation: "Never handle needles or medical waste. Stop immediately, document the situation with photos if safe to do so, and contact your operator immediately."
        }
      ],
      passingScore: 80,
      minQuestions: 5
    },
    required: true,
    requiredForPayment: false,
    order: 2,
    duration: "10 min"
  },
  {
    id: "cleaning-process",
    name: "Cleaning Process",
    description: "Step-by-step guide to cleaning bins effectively",
    type: "cleaning",
    pdfFileName: "cleaning-process.pdf",
    quiz: {
      questions: [
        {
          id: "cleaning-1",
          question: "What must be done before marking a stop complete?",
          options: [
            "Just spray the bin",
            "Complete the full cleaning process: inspect, clean, sanitize, deodorize, and verify quality",
            "Only clean if it looks dirty",
            "Quick rinse is enough"
          ],
          correctAnswer: 1,
          explanation: "The full cleaning process must be completed: inspect for damage, clean thoroughly, sanitize, deodorize, and verify quality before marking complete."
        },
        {
          id: "cleaning-2",
          question: "What is the correct order of the cleaning process?",
          options: [
            "Clean, inspect, sanitize",
            "Inspect, clean, sanitize, deodorize, verify",
            "Sanitize first, then clean",
            "Just deodorize"
          ],
          correctAnswer: 1,
          explanation: "The correct order is: 1) Inspect for damage, 2) Clean thoroughly, 3) Sanitize, 4) Deodorize, 5) Verify quality."
        },
        {
          id: "cleaning-3",
          question: "When should you apply the Bin Blast sticker?",
          options: [
            "Before cleaning",
            "After completing the cleaning process and verifying quality",
            "Only if the customer asks",
            "Never"
          ],
          correctAnswer: 1,
          explanation: "The Bin Blast sticker should be applied after completing the cleaning process and verifying the bin meets quality standards."
        },
        {
          id: "cleaning-4",
          question: "What should you do if a bin has significant damage?",
          options: [
            "Clean it anyway",
            "Ignore the damage",
            "Document the damage, flag the issue, and notify your operator",
            "Try to fix it yourself"
          ],
          correctAnswer: 2,
          explanation: "Always document significant damage, flag the issue, and notify your operator. Do not attempt repairs yourself."
        },
        {
          id: "cleaning-5",
          question: "What quality standards must be met before marking a stop complete?",
          options: [
            "No residue at bottom, no visible grime on exterior, clean lid, and area left neat",
            "Just spray the bin",
            "Only clean if it looks dirty",
            "Quick rinse is sufficient"
          ],
          correctAnswer: 0,
          explanation: "Quality standards require: no residue at bottom, no visible grime on exterior, clean lid, and area left neat before marking complete."
        }
      ],
      passingScore: 80,
      minQuestions: 5
    },
    required: true,
    requiredForPayment: false,
    order: 3,
    duration: "15 min"
  },
  {
    id: "sticker-placement",
    name: "Sticker Placement",
    description: "How to properly place Bin Blast stickers",
    type: "sticker",
    pdfFileName: "sticker-placement.pdf",
    quiz: {
      questions: [
        {
          id: "sticker-1",
          question: "Where should the Bin Blast sticker be placed?",
          options: [
            "On the lid",
            "On the front-facing side of the bin",
            "Anywhere on the bin",
            "On damaged surfaces"
          ],
          correctAnswer: 1,
          explanation: "The sticker should be placed on the front-facing side of the bin, at eye-level when possible, for maximum visibility."
        },
        {
          id: "sticker-2",
          question: "What should you ensure before applying the sticker?",
          options: [
            "The bin is dirty",
            "The surface is clean and dry",
            "The sticker is old",
            "The bin is damaged"
          ],
          correctAnswer: 1,
          explanation: "Always ensure the bin surface is clean and dry before applying the sticker to ensure proper adhesion."
        },
        {
          id: "sticker-3",
          question: "What should you avoid when placing stickers?",
          options: [
            "Placing on front-facing side",
            "Placing on lid, damaged surfaces, or covering existing labels",
            "Ensuring sticker is visible",
            "Applying to clean, dry surface"
          ],
          correctAnswer: 1,
          explanation: "Do not place stickers on the lid, damaged surfaces, or cover existing labels. Place on front-facing side at eye-level."
        },
        {
          id: "sticker-4",
          question: "What should you verify before leaving a stop?",
          options: [
            "Sticker is not needed",
            "Sticker is properly placed, visible, secure, and not covering important information",
            "Sticker can fall off later",
            "Sticker placement doesn't matter"
          ],
          correctAnswer: 1,
          explanation: "Before leaving, verify the sticker is properly placed, visible, secure, and not covering any important information."
        }
      ],
      passingScore: 80,
      minQuestions: 4
    },
    required: true,
    requiredForPayment: false,
    order: 4,
    duration: "5 min"
  },
  {
    id: "photo-documentation",
    name: "Photo Documentation",
    description: "How to take quality completion photos (REQUIRED for payment)",
    type: "photo",
    pdfFileName: "photo-documentation.pdf",
    quiz: {
      questions: [
        {
          id: "photo-1",
          question: "How many photos are required per stop?",
          options: [
            "1 photo",
            "2 photos - inside and outside of bin",
            "3 photos",
            "No photos needed"
          ],
          correctAnswer: 1,
          explanation: "Exactly 2 photos are required: one showing the inside of the bin and one showing the outside of the bin."
        },
        {
          id: "photo-2",
          question: "Which photo qualifies as acceptable proof of work?",
          options: [
            "Blurry or dark photo",
            "Photo taken before cleaning",
            "Clear, well-lit photo showing clean bin interior/exterior taken after cleaning",
            "Partial bin shown"
          ],
          correctAnswer: 2,
          explanation: "Photos must be clear, well-lit, in focus, and taken after cleaning is complete. They must show the full bin."
        },
        {
          id: "photo-3",
          question: "What should the inside photo show?",
          options: [
            "Just the top of the bin",
            "Camera angled downward showing clean base + walls",
            "Only the sticker",
            "Anything is fine"
          ],
          correctAnswer: 1,
          explanation: "The inside photo should show the camera angled downward to clearly display the clean base and walls of the bin."
        },
        {
          id: "photo-4",
          question: "What should the outside photo show?",
          options: [
            "Just the ground",
            "Full bin visible with sticker and clean exterior",
            "Only part of the bin",
            "Doesn't matter"
          ],
          correctAnswer: 1,
          explanation: "The outside photo must show the full bin with the Bin Blast sticker visible and the clean exterior clearly displayed."
        },
        {
          id: "photo-5",
          question: "When can you receive payment for a stop?",
          options: [
            "After completing the cleaning",
            "After submitting acceptable proof photos",
            "Automatically",
            "Only if customer approves"
          ],
          correctAnswer: 1,
          explanation: "Payment eligibility requires completing the Photo Documentation training AND submitting acceptable proof photos (2 photos) for each stop."
        }
      ],
      passingScore: 80,
      minQuestions: 5
    },
    required: true,
    requiredForPayment: true,
    order: 5,
    duration: "5 min"
  },
  {
    id: "route-zone-awareness",
    name: "Route & Zone Awareness",
    description: "Understanding assigned counties/zones and route order",
    type: "route",
    pdfFileName: "route-zone-awareness.pdf",
    quiz: {
      questions: [
        {
          id: "route-1",
          question: "What should you do if access is blocked?",
          options: [
            "Skip the stop",
            "Force access",
            "Document the issue, flag it, and contact your operator",
            "Wait indefinitely"
          ],
          correctAnswer: 2,
          explanation: "If access is blocked, document the issue, flag it in the system, and contact your operator for guidance."
        },
        {
          id: "route-2",
          question: "Why is following route order important?",
          options: [
            "It doesn't matter",
            "It optimizes efficiency, reduces travel time, and ensures timely service",
            "Only for appearance",
            "Operators prefer it"
          ],
          correctAnswer: 1,
          explanation: "Following route order optimizes efficiency, reduces travel time, ensures timely service, and helps maintain schedule."
        },
        {
          id: "route-3",
          question: "What should you do if you're assigned to a zone you're not familiar with?",
          options: [
            "Skip it",
            "Contact your operator for guidance and route information",
            "Guess the route",
            "Only do easy stops"
          ],
          correctAnswer: 1,
          explanation: "Always contact your operator if you're unfamiliar with an assigned zone. They can provide route information and guidance."
        },
        {
          id: "route-4",
          question: "How should you handle route changes or reassignments?",
          options: [
            "Ignore them",
            "Acknowledge the change, update your route, and proceed accordingly",
            "Only follow if convenient",
            "Do your own route"
          ],
          correctAnswer: 1,
          explanation: "Always acknowledge route changes, update your route accordingly, and proceed as directed by your operator."
        },
        {
          id: "route-5",
          question: "What should you do before starting your route?",
          options: [
            "Start immediately without checking",
            "Review assigned stops, check route order, verify equipment, and contact operator if you have questions",
            "Skip difficult stops",
            "Work in any order you prefer"
          ],
          correctAnswer: 1,
          explanation: "Before starting: review your assigned stops, check the route order, verify you have all necessary equipment, and contact your operator if you have questions."
        }
      ],
      passingScore: 80,
      minQuestions: 5
    },
    required: true,
    requiredForPayment: false,
    order: 6,
    duration: "10 min"
  },
  {
    id: "company-policies",
    name: "Company Policies & Accountability",
    description: "Employee accountability, payment rules, and company policies",
    type: "policies",
    pdfFileName: "company-policies.pdf",
    quiz: {
      questions: [
        {
          id: "policies-1",
          question: "What is required to receive payment for a stop?",
          options: [
            "Just completing the cleaning",
            "Proper cleaning, required photos, and marking stop complete",
            "Only photos",
            "Automatic payment"
          ],
          correctAnswer: 1,
          explanation: "Payment requires proper cleaning following SOP, required photos (inside and outside), and marking the stop complete in the system."
        },
        {
          id: "policies-2",
          question: "How often must you complete re-certification training?",
          options: [
            "Never",
            "Every 6 months",
            "Every year",
            "Only when asked"
          ],
          correctAnswer: 1,
          explanation: "Re-certification training is required every 6 months to maintain your certification and eligibility for route assignments."
        },
        {
          id: "policies-3",
          question: "What happens if your training certification expires?",
          options: [
            "Nothing",
            "You can still work",
            "You cannot receive route assignments until re-certified",
            "You get a warning"
          ],
          correctAnswer: 2,
          explanation: "Expired training certification means you cannot receive route assignments until you complete re-certification training."
        },
        {
          id: "policies-4",
          question: "What may result from repeated policy violations?",
          options: [
            "Nothing",
            "Route removal, retraining, or termination",
            "Automatic promotion",
            "Extra pay"
          ],
          correctAnswer: 1,
          explanation: "Repeated policy violations may result in route removal, retraining requirements, or termination depending on the severity."
        },
        {
          id: "policies-5",
          question: "What are you accountable for as a Bin Blast employee?",
          options: [
            "Nothing specific",
            "Quality of work, following safety protocols, submitting documentation, and maintaining certification",
            "Only showing up",
            "Only completing routes"
          ],
          correctAnswer: 1,
          explanation: "You are accountable for the quality of your work, following all safety protocols, submitting required documentation, communicating issues, and maintaining your certification."
        }
      ],
      passingScore: 80,
      minQuestions: 5
    },
    required: true,
    requiredForPayment: false,
    order: 7,
    duration: "10 min"
  }
];

export function getModuleById(moduleId: string): TrainingModuleConfig | undefined {
  return TRAINING_MODULES.find(m => m.id === moduleId);
}

export function getRequiredModules(): TrainingModuleConfig[] {
  return TRAINING_MODULES.filter(m => m.required).sort((a, b) => a.order - b.order);
}

export function getModuleForPayment(): TrainingModuleConfig | undefined {
  return TRAINING_MODULES.find(m => m.requiredForPayment);
}

