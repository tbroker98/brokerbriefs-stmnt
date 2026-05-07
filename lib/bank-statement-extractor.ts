import {
  extractStatementData,
  extractTextFromUploadedStatement,
  type StatementDocument,
  type StatementExtractionResult
} from "@/lib/statement-extractor";

export type BankStatementDocument = StatementDocument;
export type BankStatementExtractionResult = StatementExtractionResult;

export async function extractTextFromUploadedBankStatement(file: {
  name: string;
  type?: string;
  buffer: Uint8Array;
}) {
  return extractTextFromUploadedStatement(file);
}

export function extractBankStatementData(documents: BankStatementDocument[]) {
  return extractStatementData(documents);
}
