// Run with: node test/e2e.docx.test.js /path/to/source.docx
import JSZip from 'jszip';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadDocxModel } from '../js/docx/docxModel.js';
import { exportDocx } from '../js/docx/docxExporter.js';
import { convertText } from '../js/converter/convert.js';

async function main() {
  const srcPath = process.argv[2];
  if (!srcPath) {
    console.error('usage: node test/e2e.docx.test.js <source.docx>');
    process.exit(1);
  }
  const buffer = readFileSync(srcPath);
  const zip = await JSZip.loadAsync(buffer);

  const { templateXml, paragraphs, sourceFontNames } = await loadDocxModel(zip);
  console.log('paragraphs:', paragraphs.length);
  console.log('source fonts found:', sourceFontNames);

  const runTextById = new Map();
  for (const para of paragraphs) {
    for (const run of para.runs) {
      runTextById.set(run.id, convertText(run.text));
    }
  }

  const blob = await exportDocx(zip, templateXml, runTextById, sourceFontNames);
  const outBuffer = Buffer.from(await blob.arrayBuffer());
  const outPath = 'test/e2e_output.docx';
  writeFileSync(outPath, outBuffer);
  console.log('wrote', outPath, outBuffer.length, 'bytes');

  // sanity: no leftover Devanagari codepoints in the converted document.xml
  const outZip = await JSZip.loadAsync(outBuffer);
  const docXml = await outZip.file('word/document.xml').async('string');
  const leftover = new Set([...docXml].filter((ch) => ch >= '\u0900' && ch <= '\u097f'));
  console.log('leftover Devanagari chars:', [...leftover]);
  const fontOk = docXml.includes('Kruti Dev 035') && !docXml.includes('Nirmala UI');
  console.log('font swapped correctly:', fontOk);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
