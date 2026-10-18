# Prepare a release

The source is maintained in `dist/`. The build validates it and creates a static snapshot under `output/releases/`; it never regenerates or overwrites the source. GitHub publication and static hosting are separate operations.

## Review and build

```sh
node scripts/check.mjs
node --test scripts/*.test.mjs
node scripts/release-ready.mjs
node scripts/build-demo.mjs --base=/
```

Use only the printed `site/` directory as the hosting root. Use `--base=/webdemo/` for a subpath preview. Do not upload the repository's `.git/`, local evidence, working inputs or complete output folder to a website.

Check the opening, Selected work, device transition, Profile, All work, details, Back, zoom and actual external destinations on desktop and phone. Check both languages. Selected work is TuneShape, ? / Shift, Reprise, Mac Setup; All work starts with TuneShape. Existing numeric links retain their project identity when the catalog is reordered.

## Update TuneShape explicitly

Copy `tuneshape-input.example.json` to a local working input outside the public source. Fill in the verified website, authorized cover and its actual dimensions, bilingual category/year, summary and descriptions. Set a confirmed public repository; do not invent a source URL.

```sh
node scripts/sync-tuneshape.mjs /absolute/path/to/approved-input.json
```

This updates the TuneShape config, catalog, display metadata and homepage captions without deploying. A live-demo-only entry may leave repository null and recommend other projects, but this must be reviewed before release. `release-ready.mjs` rejects preview placeholders or mismatched covers. Recheck the selected summaries' authored line breaks after a sync.

## Refresh the Chinese font

The full OFL source font and its license are retained. Font regeneration is optional for running the site. After changing Chinese copy, use Python with fontTools and Brotli:

```sh
python3 -m venv output/font-tools
output/font-tools/bin/python -m pip install fonttools brotli
output/font-tools/bin/python scripts/build-fonts.py
```

The local environment stays in the ignored `output/` directory. The script creates a versioned, renamed subset and updates `dist/vi/fonts.css`; it keeps earlier files in place. Recheck font coverage and page layout.

## Publish safely

Keep `LICENSE`, `LICENSES/`, `THIRD_PARTY_NOTICES.md`, `ASSETS.md` and `SECURITY.md`. Use only reviewed source files and authorized visuals. Exclude local working inputs, logs, environments, credentials, private records, original documents and any unrelated repository history.

A separate static project on a separate origin is recommended. The prepared EdgeOne configuration contains response headers, not account IDs or secrets. Verify real response headers and real 404 behavior on the chosen host. The public template does not configure a main site, DNS, account security, billing or monitoring.

Original code is MIT licensed; retained display artwork and separately licensed dependencies have their own terms. Replace portfolio covers before representing the template as your own work.
