// Run with: node test/pipeline.test.js <source_document.xml> <expected_document.xml>
//
// Feeds the real source document.xml through the complete JS pipeline
// (run merging -> placeholders -> corrections -> segmentation -> conversion
// -> run splitting -> font swap) and compares the extracted text runs and
// Cambria-run placement against the known-good delivered document.xml
// produced by the validated Python pipeline.
import { readFileSync } from 'node:fs';
import { loadDocxModel, renderDocumentXml } from '../js/docx/docxModel.js';
import { convertToSegments } from '../js/converter/segmenter.js';

function extractRuns(xml) {
  const runs = [];
  for (const run of xml.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) ?? []) {
    const isLatin = run.includes('Cambria');
    for (const m of run.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)) {
      const text = m[1]
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      if (text.length) runs.push({ latin: isLatin, text });
    }
  }
  return runs;
}

async function main() {
  const [srcPath, expectedPath] = process.argv.slice(2);
  const rawXml = readFileSync(srcPath, 'utf-8');
  const expectedXml = readFileSync(expectedPath, 'utf-8');

  const mockZip = {
    file: (p) => (p === 'word/document.xml' ? { async: async () => rawXml } : null),
  };
  const { templateXml, runIndex } = await loadDocxModel(mockZip);

  const segmentsById = new Map();
  for (const [id, { originalText }] of runIndex) {
    segmentsById.set(id, convertToSegments(originalText));
  }

  let outXml = renderDocumentXml(templateXml, segmentsById);
  outXml = outXml.split('Nirmala UI').join('Kruti Dev 035');
  outXml = outXml.split('Noto Sans Devanagari').join('Kruti Dev 035');

  const got = extractRuns(outXml);
  const want = extractRuns(expectedXml);

  console.log(`runs: got=${got.length} want=${want.length}`);
  let mismatches = 0;
  const n = Math.max(got.length, want.length);
  for (let i = 0; i < n; i++) {
    const g = got[i], w = want[i];
    if (!g || !w || g.text !== w.text || g.latin !== w.latin) {
      mismatches++;
      if (mismatches <= 5) {
        console.log(`MISMATCH at run ${i}:`);
        console.log('  got: ', g ? `${g.latin ? '[latin] ' : ''}${JSON.stringify(g.text.slice(0, 80))}` : '(missing)');
        console.log('  want:', w ? `${w.latin ? '[latin] ' : ''}${JSON.stringify(w.text.slice(0, 80))}` : '(missing)');
      }
    }
  }
  console.log(mismatches === 0 ? 'PIPELINE PARITY: PASS' : `PIPELINE PARITY: FAIL (${mismatches} mismatches)`);
  if (mismatches > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
