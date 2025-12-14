// scripts/seed-training-modules.ts
// Seed script to migrate training modules from hardcoded config to Firestore
// Run with: npx tsx scripts/seed-training-modules.ts

import { TRAINING_MODULES } from "../lib/training-modules";
import { getDbInstance } from "../lib/firebase";
import { safeImportFirestore } from "../lib/firebase-module-loader";

interface FirestoreTrainingModule {
  id: string;
  title: string;
  description: string;
  categoryTag: "Guide" | "Safety" | "Best Practices";
  durationMinutes: number;
  order: number;
  pdfUrl?: string;
  quiz: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  active: boolean;
  required: boolean;
  requiredForPayment: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

// Map module types to category tags
function mapTypeToCategoryTag(type: string): "Guide" | "Safety" | "Best Practices" {
  switch (type) {
    case "safety":
      return "Safety";
    case "welcome":
    case "cleaning":
    case "route":
    case "policies":
      return "Guide";
    case "sticker":
    case "photo":
      return "Best Practices";
    default:
      return "Guide";
  }
}

// Parse duration string to minutes
function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : 5; // Default to 5 minutes
}

async function seedTrainingModules() {
  console.log("🌱 Starting training modules seed...");

  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Firestore database is not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, doc, setDoc, serverTimestamp } = firestore;

    const trainingModulesRef = collection(db, "trainingModules");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const module of TRAINING_MODULES) {
      try {
        // Convert quiz questions format
        const quiz = module.quiz.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correctAnswer,
          explanation: q.explanation || "",
        }));

        const firestoreModule: FirestoreTrainingModule = {
          id: module.id,
          title: module.name,
          description: module.description,
          categoryTag: mapTypeToCategoryTag(module.type),
          durationMinutes: parseDuration(module.duration),
          order: module.order,
          pdfUrl: module.pdfUrl || "", // Will be updated after PDFs are uploaded
          quiz,
          active: true,
          required: module.required,
          requiredForPayment: module.requiredForPayment,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const moduleRef = doc(trainingModulesRef, module.id);
        
        // Check if module already exists
        const existingDoc = await moduleRef.get();
        
        if (existingDoc.exists()) {
          // Update existing module but preserve pdfUrl if it exists
          const existingData = existingDoc.data();
          if (existingData.pdfUrl && !module.pdfUrl) {
            firestoreModule.pdfUrl = existingData.pdfUrl;
          }
          await setDoc(moduleRef, {
            ...firestoreModule,
            createdAt: existingData.createdAt || serverTimestamp(), // Preserve original createdAt
          }, { merge: true });
          updated++;
          console.log(`✅ Updated module: ${module.name}`);
        } else {
          await setDoc(moduleRef, firestoreModule);
          created++;
          console.log(`✨ Created module: ${module.name}`);
        }
      } catch (error: any) {
        console.error(`❌ Error processing module ${module.id}:`, error.message);
        skipped++;
      }
    }

    console.log("\n📊 Seed Summary:");
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${TRAINING_MODULES.length}`);
    console.log("\n✅ Seed completed successfully!");
    console.log("\n⚠️  Next steps:");
    console.log("   1. Upload PDFs to Firebase Storage using admin tools");
    console.log("   2. Update pdfUrl fields in Firestore with Firebase Storage URLs");
    console.log("   3. Verify all modules have valid PDF URLs");
  } catch (error: any) {
    console.error("❌ Seed failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedTrainingModules()
    .then(() => {
      console.log("\n🎉 Seed script finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Seed script failed:", error);
      process.exit(1);
    });
}

export { seedTrainingModules };
