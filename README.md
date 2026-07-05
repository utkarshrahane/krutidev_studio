# KrutiDev Studio

A small, self-contained web app for converting Unicode Marathi/Hindi `.docx`
documents to **Kruti Dev 035** encoding, while keeping paragraph formatting
(bold, italic, underline, alignment) intact. Split-pane editor, à la
Overleaf: edit the Unicode source on the left, click **Refresh**, see the
Kruti Dev version on the right, then **Export .docx**.

Everything runs client-side in the browser — no server, no upload of your
document anywhere. The heavy lifting (the actual character-mapping rules)
is the same algorithm that was validated paragraph-by-paragraph against a
real Kruti Dev 035 court filing.

## Running it

No build step. Any static file server works:

```bash
cd krutidev-studio
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly with `file://` also works in most browsers,
but some browsers block `fetch`/module loading over `file://` — a local
server avoids that entirely.)

## Using it

1. **Upload .docx** — loads a real Word document; paragraph structure,
   bold/italic/underline and alignment are preserved and shown as editable
   text on the left.
   **Paste text** — quick plain-text mode (one paragraph per line), no
   formatting.
2. Edit anything you like directly in the left pane.
3. Click **Refresh** — the right pane re-renders every paragraph in Kruti
   Dev 035 encoding.
4. Click **Export .docx** — downloads a `.docx` with the converted text and
   the font swapped to "Kruti Dev 035" throughout, ready to open in Word.

### About the font

Kruti Dev 035 is a legacy "symbol" font: it isn't Unicode-aware, it just
draws Devanagari glyphs on top of ordinary Latin character codes. This app
does **not** bundle the font file (licensing for Kruti Dev fonts is
"free for personal use, contact the author for anything else," so
redistributing it isn't something this project does). If it's installed on
your machine, the browser will pick it up automatically and the right pane
will render correctly; if not, you'll see a banner and fallback glyphs, but
the **underlying converted text is still correct** — install the font, or
open the exported `.docx` on a machine that already has it (as most Indian
court/government computers do).

## Project structure

```
krutidev-studio/
  index.html              Page shell: toolbar, two panes, paste modal
  css/app.css              Styling
  js/
    converter/
      mappingTable.js      The Unicode -> Kruti Dev character table (data only)
      convert.js            The conversion algorithm (pure functions, no DOM)
      sourceCorrections.js  Recurring source typos fixed before conversion
                              (e.g. कमांक -> क्रमांक) — edit this list to add more
      segmenter.js           Splits text into KD vs Latin-passthrough segments;
                              x, ×, =, % and Latin words have NO Kruti Dev glyph
                              and are emitted as separate Cambria-font runs
                              (the same technique reference court documents use)
    docx/
      runMerger.js          Collapses fragmented same-formatted <w:r> runs
      docxModel.js           .docx -> {paragraphs, runs, templateXml} and back;
                              splits runs when Latin passthrough is present
      docxExporter.js        Repackages the model into a downloadable .docx
    ui/
      editorPane.js          Renders/reads the editable left pane
      previewPane.js          Renders the right pane; Latin segments shown in a
                               serif font, exactly as they'll appear in the docx
      fontCheck.js            Detects whether Kruti Dev 035 is installed locally
    app.js                   Wires everything together (the only file that
                               touches global state)
  test/
    parity.test.js           Compares JS converter output to the validated
                               Python reference, paragraph by paragraph
    pipeline.test.js         Full-pipeline parity: feeds a real document.xml
                               through the app's model/segment/export path and
                               compares run-for-run against known-good output
    fixtures/parity_cases.json
    e2e.docx.test.js         Node script: run the whole pipeline against a
                               real .docx file (needs `npm install jszip`)
```

Each module has one job and no circular dependencies:
`mappingTable.js` (data) → `convert.js` (algorithm) → `app.js` (wiring), and
`runMerger.js` → `docxModel.js` → `docxExporter.js` on the docx side.
Swapping the UI framework later, or reusing the converter in a CLI/server,
only touches `app.js` — the converter and docx modules have zero UI
dependencies.

## Testing

```bash
npm test
```

Runs `test/parity.test.js`, which replays 48 real paragraphs from the
original source document through the JS converter and checks the output
character-for-character against the Python reference implementation. All
48 currently pass, byte-for-byte, including the fixes discussed for
colons, `x`/`=` in calculations, and the conjunct/reph corrections.

`test/e2e.docx.test.js` exercises the full pipeline (parse → convert →
export) against a real `.docx` file — run it with
`node test/e2e.docx.test.js path/to/file.docx` after `npm install jszip`.

## Special characters, calculations, and typo fixes

Three behaviors worth knowing, all matching the validated court document:

- **Calculations (x, ×, =, %)**: Kruti Dev has no glyphs for these — their
  character slots render as Devanagari shapes. The app keeps them literal
  and emits them as separate Cambria-font runs in the exported docx (and
  shows them in a serif font in the preview). "११५ x ४० = ४६००" comes out
  exactly right.
- **Ellipsis (…)**: converted to three periods → `---` in KD encoding,
  which renders as "..." in the font.
- **Recurring typos**: fix text directly in the left editor pane for
  one-off edits. For systematic typos that must always be corrected
  (currently: कमांक → क्रमांक), add a pair to `SOURCE_CORRECTIONS` in
  `js/converter/sourceCorrections.js` — corrections are applied to the
  Unicode source before conversion, on every Refresh and Export.

## Known limitations

- **Tables, images, headers/footers, footnotes** aren't parsed into the
  editor yet — the converter itself handles any text run correctly, but the
  UI model (`docxModel.js`) currently only walks the main document body.
  Extending it to headers/footers is a small, self-contained change to
  `loadDocxModel`.
- Kruti Dev's encoding is inherently ambiguous in a few rare spots (see the
  comments in `mappingTable.js` — e.g. the same glyph slot is legitimately
  reused for more than one input in some conjuncts). The table was tuned
  against one real document; if you hit a new mis-mapped character, the
  fix is a one-line addition to `OVERRIDES` in `mappingTable.js`.
- This is not a substitute for proofreading a legal filing. Always have
  someone check the Kruti Dev output (with the real font installed) before
  submitting anything to a court.
