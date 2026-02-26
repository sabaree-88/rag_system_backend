import fs from 'fs'
import { PDFParse } from 'pdf-parse';

export async function extractPDF (path) {
  const buffer = fs.readFileSync(path)
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()

  fs.unlinkSync(path)

  return result.text
}
