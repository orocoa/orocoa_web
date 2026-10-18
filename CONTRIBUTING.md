# Contributing

Bug reports and focused improvements are welcome at https://github.com/orocoa/orocoa_web.

Use Node.js 22 or newer. Edit the maintained `dist/` files directly. Keep bilingual copy, keyboard access, phone layouts, reduced-motion behavior and existing navigation working.

Before opening a pull request, run:

```sh
node scripts/check.mjs
node --test scripts/*.test.mjs
node scripts/release-ready.mjs
```

For visual changes, check the affected desktop and phone flows in a browser. Describe the observed problem, resulting behavior and checks you performed. Add a regression test when it protects meaningful behavior rather than duplicating implementation.

Do not include credentials, private media, personal records, local evidence or unrelated Git history. Use assets you have permission to distribute and retain all applicable notices. See ASSETS.md and THIRD_PARTY_NOTICES.md.

Build output and local environments are not source. Generated previews stay under `output/`; do not commit that directory. Static hosting uses only the reviewed `site/` export.
