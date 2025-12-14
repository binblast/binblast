# Training PDF Setup Instructions

This guide will help you convert the Markdown training files to PDFs and upload them to Firebase Storage.

## Step 1: Convert Markdown Files to PDF

The training PDFs are located in `docs/training-pdfs/` as Markdown files. You need to convert them to PDF format.

### Option A: Using Browser (Easiest - Recommended)

1. Open each Markdown file in a Markdown viewer or VS Code with Markdown Preview
2. Right-click and select "Print" or press `Cmd+P` (Mac) / `Ctrl+P` (Windows)
3. Select "Save as PDF" as the destination
4. Save with the filename matching the module:
   - `welcome-to-bin-blast.pdf`
   - `safety-basics.pdf`
   - `cleaning-process.pdf`
   - `sticker-placement.pdf`
   - `photo-documentation.pdf`
   - `route-zone-awareness.pdf`
   - `company-policies.pdf`

### Option B: Using Pandoc (Command Line)

If you have Pandoc installed:

```bash
cd docs/training-pdfs
pandoc welcome-to-bin-blast.md -o welcome-to-bin-blast.pdf
pandoc safety-basics.md -o safety-basics.pdf
pandoc cleaning-process.md -o cleaning-process.pdf
pandoc sticker-placement.md -o sticker-placement.pdf
pandoc photo-documentation.md -o photo-documentation.pdf
pandoc route-zone-awareness.md -o route-zone-awareness.pdf
pandoc company-policies.md -o company-policies.pdf
```

### Option C: Using VS Code Extension

1. Install the "Markdown PDF" extension in VS Code
2. Open each Markdown file
3. Right-click and select "Markdown PDF: Export (pdf)"
4. The PDF will be saved in the same directory

### Option D: Online Converter

1. Visit a Markdown to PDF converter (e.g., markdowntopdf.com)
2. Upload each Markdown file
3. Download the generated PDF

## Step 2: Upload PDFs to Firebase Storage

### Prerequisites

- Firebase project set up
- Firebase Storage enabled
- Access to Firebase Console

### Upload Process

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - If Storage isn't set up, click "Get started" and follow the setup wizard

3. **Create Folder Structure**
   - Click "Get started" if this is your first time
   - Create a folder called `training-modules` (or use the root if preferred)

4. **Upload PDFs**
   - Click "Upload file" or drag and drop PDFs
   - Upload all 7 PDF files:
     - `welcome-to-bin-blast.pdf`
     - `safety-basics.pdf`
     - `cleaning-process.pdf`
     - `sticker-placement.pdf`
     - `photo-documentation.pdf`
     - `route-zone-awareness.pdf`
     - `company-policies.pdf`

5. **Set Public Access**
   - For each PDF file, click the three dots menu
   - Select "Get download URL" or "Edit"
   - In the file details, ensure the file is publicly accessible
   - You may need to update Storage Rules (see below)

### Firebase Storage Rules

Update your Firebase Storage rules to allow public read access to training PDFs:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to training modules
    match /training-modules/{fileName} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can upload
    }
  }
}
```

## Step 3: Get Firebase Storage URLs

For each PDF file:

1. In Firebase Console, navigate to Storage
2. Click on the PDF file
3. Copy the "Download URL" - it will look like:
   ```
   https://firebasestorage.googleapis.com/v0/b/YOUR-PROJECT-ID.appspot.com/o/training-modules%2Fwelcome-to-bin-blast.pdf?alt=media&token=YOUR-TOKEN
   ```

## Step 4: Update Training Modules Configuration

After uploading PDFs and getting URLs, update `lib/training-modules.ts`:

1. Open `lib/training-modules.ts`
2. For each module, add the `pdfUrl` property with the Firebase Storage URL:

```typescript
{
  id: "welcome",
  name: "Welcome to Bin Blast Co.",
  pdfUrl: "https://firebasestorage.googleapis.com/v0/b/YOUR-PROJECT-ID.appspot.com/o/training-modules%2Fwelcome-to-bin-blast.pdf?alt=media&token=YOUR-TOKEN",
  pdfFileName: "welcome-to-bin-blast.pdf",
  // ... rest of config
}
```

### Example Updates

Update each module in the `TRAINING_MODULES` array:

```typescript
// Welcome module
{
  id: "welcome",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "welcome-to-bin-blast.pdf",
  // ...
}

// Safety Basics module
{
  id: "safety-basics",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "safety-basics.pdf",
  // ...
}

// Cleaning Process module
{
  id: "cleaning-process",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "cleaning-process.pdf",
  // ...
}

// Sticker Placement module
{
  id: "sticker-placement",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "sticker-placement.pdf",
  // ...
}

// Photo Documentation module
{
  id: "photo-documentation",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "photo-documentation.pdf",
  // ...
}

// Route & Zone Awareness module
{
  id: "route-zone-awareness",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "route-zone-awareness.pdf",
  // ...
}

// Company Policies module
{
  id: "company-policies",
  pdfUrl: "YOUR_FIREBASE_STORAGE_URL_HERE",
  pdfFileName: "company-policies.pdf",
  // ...
}
```

## Step 5: Test PDF Viewing

1. Deploy your changes to Vercel
2. Navigate to the employee dashboard
3. Go to the Training section
4. Click "View PDF" on any training module
5. Verify the PDF loads correctly in the inline viewer
6. Test the download button

## Troubleshooting

### PDFs Not Loading

- **Check Firebase Storage URLs**: Ensure URLs are correct and publicly accessible
- **Check Storage Rules**: Verify rules allow public read access
- **Check CORS**: Firebase Storage should handle CORS automatically, but verify if issues persist
- **Check Browser Console**: Look for any CORS or 404 errors

### 404 Errors

- Verify PDF files exist in Firebase Storage
- Check that the file paths in URLs match the actual file locations
- Ensure `pdfUrl` is set correctly in `lib/training-modules.ts`

### PDF Viewer Not Displaying

- Check browser console for errors
- Verify iframe is allowed to load external content
- Check that PDF URLs are accessible (try opening in new tab)

## File Structure Summary

```
docs/
  training-pdfs/
    welcome-to-bin-blast.md          → Convert to PDF
    safety-basics.md                 → Convert to PDF
    cleaning-process.md               → Convert to PDF
    sticker-placement.md             → Convert to PDF
    photo-documentation.md           → Convert to PDF
    route-zone-awareness.md          → Convert to PDF
    company-policies.md              → Convert to PDF
  TRAINING_PDF_SETUP.md              → This file

lib/
  training-modules.ts                 → Update with Firebase Storage URLs
```

## Next Steps

1. Convert all 7 Markdown files to PDFs
2. Upload PDFs to Firebase Storage
3. Get Firebase Storage URLs for each PDF
4. Update `lib/training-modules.ts` with the URLs
5. Test PDF viewing in the application
6. Commit and push changes

---

*Once PDFs are uploaded and URLs are updated, the training modules will display PDFs inline instead of showing 404 errors.*
