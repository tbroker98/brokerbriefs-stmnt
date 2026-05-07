import { NextResponse } from "next/server";
import {
  extractBankStatementData,
  extractTextFromUploadedBankStatement,
  type BankStatementDocument
} from "@/lib/bank-statement-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadedFiles = formData.getAll("statements").filter((item): item is File => item instanceof File);

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "Upload at least one statement file." }, { status: 400 });
    }

    const documents: BankStatementDocument[] = [];
    const warnings: string[] = [];

    for (const file of uploadedFiles) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const text = await extractTextFromUploadedBankStatement({
        name: file.name,
        type: file.type,
        buffer
      });

      if (!text.trim()) {
        warnings.push(`${file.name}: no text could be extracted. If this is a scanned statement, it likely needs OCR.`);
        continue;
      }

      documents.push({
        name: file.name,
        type: file.type,
        text
      });
    }

    if (documents.length === 0) {
      return NextResponse.json(
        {
          error: warnings[0] || "No readable statement text was found."
        },
        { status: 422 }
      );
    }

    const result = extractBankStatementData(documents);

    return NextResponse.json({
      ...result,
      warnings: [...warnings, ...result.warnings]
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Bank statement extraction failed."
      },
      { status: 500 }
    );
  }
}
