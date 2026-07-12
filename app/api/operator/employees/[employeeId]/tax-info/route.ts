import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(
  _req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;
    const userDoc = await getDoc(doc(db, "users", employeeId));

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const data = userDoc.data();
    const taxInfo = data.taxInfo || null;

    if (taxInfo?.ssn) {
      const digits = String(taxInfo.ssn).replace(/\D/g, "");
      taxInfo.ssnLast4 = digits.slice(-4);
      delete taxInfo.ssn;
    }

    return NextResponse.json({ success: true, taxInfo });
  } catch (error: any) {
    console.error("Error fetching employee tax info:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tax information" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;
    const userRef = doc(db, "users", employeeId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const existingTaxInfo = userSnap.data().taxInfo || {};
    const taxIdType = body.taxIdType ?? existingTaxInfo.taxIdType ?? "ssn";

    const taxInfo: Record<string, any> = {
      ...existingTaxInfo,
      name: body.name ?? existingTaxInfo.name ?? "",
      taxIdType,
      taxFormType: body.taxFormType ?? existingTaxInfo.taxFormType ?? "w9",
      address: body.address ?? existingTaxInfo.address ?? null,
      signature: body.signature ?? existingTaxInfo.signature ?? "",
      signedDate: body.signedDate ?? existingTaxInfo.signedDate ?? null,
      w9DocumentUrl: body.w9DocumentUrl ?? existingTaxInfo.w9DocumentUrl ?? null,
      w9UploadedAt: body.w9DocumentUrl
        ? serverTimestamp()
        : existingTaxInfo.w9UploadedAt ?? null,
      updatedAt: serverTimestamp(),
    };

    if (taxIdType === "ssn") {
      taxInfo.ein = "";
      if (body.ssn) {
        taxInfo.ssn = body.ssn;
      } else if (existingTaxInfo.ssn) {
        taxInfo.ssn = existingTaxInfo.ssn;
      }
    } else {
      taxInfo.ssn = "";
      taxInfo.ein = body.ein ?? existingTaxInfo.ein ?? "";
    }

    await updateDoc(userRef, {
      taxInfo,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, taxInfo });
  } catch (error: any) {
    console.error("Error saving employee tax info:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save tax information" },
      { status: 500 }
    );
  }
}
