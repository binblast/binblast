// scripts/migrate-training-modules.ts
// Migration script to upload PDFs and update Firestore modules
// This script reads modules from lib/training-modules.ts and:
// 1. Uploads PDFs to Firebase Storage (if they exist locally)
// 2. Updates pdfUrl fields in Firestore with Firebase Storage URLs
// Run with: npx tsx scripts/migrate-training-modules.ts

import { TRAINING_MODULES } from "../lib/training-modules";
import { getDbInstance } from "../lib/firebase";
import { safeImportFirestore } from "../lib/firebase-module-loader";
import { uploadTrainingPDF, verifyPDFURL } from "../lib/training-pdf-upload";
import * as fs from "fs";
import * as path from "path";

async function migrateTrainingModules() {
  console.log("🚀 Starting training modules migration...");

  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Firestore database is not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, doc, getDoc, updateDoc } = firestore;

    const trainingModulesRef = collection(db, "trainingModules");

    let uploaded = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const module of TRAINING_MODULES) {
      try {
        console.log(`\n📦 Processing module: ${module.name} (${module.id})`);

        const moduleRef = doc(trainingModulesRef, module.id);
        const moduleDoc = await getDoc(moduleRef);

        if (!moduleDoc.exists()) {
          console.log(`   ⚠️  Module not found in Firestore. Run seed script first.`);
          skipped++;
          continue;
        }

        const moduleData = moduleDoc.data();
        const currentPdfUrl = moduleData.pdfUrl;

        // Check if PDF URL already exists and is valid
        if (currentPdfUrl && await verifyPDFURL(currentPdfUrl)) {
          console.log(`   ✅ PDF URL already exists and is valid: ${currentPdfUrl}`);
          skipped++;
          continue;
        }

        // Try to upload PDF if it exists locally
        if (module.pdfFileName) {
          const localPdfPath = path.join(process.cwd(), "public", "training-pdfs", module.pdfFileName);
          
          if (fs.existsSync(localPdfPath)) {
            console.log(`   📄 Found local PDF: ${localPdfPath}`);
            console.log(`   ⬆️  Uploading to Firebase Storage...`);

            const fileBuffer = fs.readFileSync(localPdfPath);
            const uploadResult = await uploadTrainingPDF(fileBuffer, module.id, module.pdfFileName);

            if (uploadResult.success && uploadResult.url) {
              // Update Firestore with new PDF URL
              await updateDoc(moduleRef, {
                pdfUrl: uploadResult.url,
                updatedAt: firestore.serverTimestamp(),
              });

              console.log(`   ✅ Uploaded and updated: ${uploadResult.url}`);
              uploaded++;
              updated++;
            } else {
              console.log(`   ❌ Upload failed: ${uploadResult.error}`);
              errors++;
            }
          } else {
            console.log(`   ⚠️  Local PDF not found: ${localPdfPath}`);
            console.log(`   💡 You can upload PDFs manually using the admin tools`);
            skipped++;
          }
        } else {
          console.log(`   ⚠️  No pdfFileName specified for this module`);
          skipped++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing module ${module.id}:`, error.message);
        errors++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${TRAINING_MODULES.length}`);
    
    if (errors === 0) {
      console.log("\n✅ Migration completed successfully!");
    } else {
      console.log("\n⚠️  Migration completed with errors. Review the output above.");
    }
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateTrainingModules()
    .then(() => {
      console.log("\n🎉 Migration script finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateTrainingModules };
