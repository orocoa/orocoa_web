# Security and publication boundary

This is a public static demonstration. The original project documents, PDF pages, videos, contact details, production account identifiers and private storage bindings are not part of it. Content intentionally shown in covers, public project names and GitHub links remains public and can be copied. This is not an anonymity guarantee.

## Deployment isolation

A separate static project on a separate origin is recommended. An address such as https://demo.example.com/ can isolate browser storage from a main site. Do not give the demo production secrets, storage bindings, broad parent-domain cookies or permission to read a main site's private APIs. Review actual CORS and cookie settings before publishing.

https://example.com/webdemo/ is supported as a deployment path, but paths are not origin boundaries. A main site's short /webdemo address may instead redirect to the independent demo origin. This keeps a short public entry while separating the applications.

The build supports both /webdemo/ and /. All demo resources, internal navigation and metadata URLs are rewritten to the chosen deployment path. The canonical source is never merged into a production site by the build. Prepared output is local until a separate controlled deployment is explicitly performed.

## Included protections

- A restrictive Content Security Policy allows only local scripts, forbids inline script handlers and evaluation, and disables workers, frames, plugins and form submission. Inline styles remain enabled for the maintained motion system.
- Browser camera, microphone, location, payments and USB permissions are disabled. Outgoing GitHub links use noopener and noreferrer.
- There are no GitHub API credentials, external badges, analytics, forms or automated starring. Visitors choose whether to visit a public repository and click Star there.
- There are no authenticated APIs. The demo creates no cookies and stores only its language and navigation state in a distinct session-storage namespace. The standard strict-origin-when-cross-origin referrer policy preserves same-site return navigation; outgoing GitHub links use noreferrer.
- Catalog records and return navigation are validated before rendering; project titles and descriptions are escaped. Query parameters do not supply HTML or external destinations.
- The local preview serves only the prepared in-memory public file list. It rejects writes, ambiguous encodings, traversal, hidden files and files outside its deployment prefix.
- WebP and PNG metadata checks run locally. Dependency advisory checks and a manual image review were performed for this preparation; future assets and dependency changes require another review.

The local server sets security headers. The static build also creates a scoped edgeone.json for EdgeOne Makers. Headers are not guaranteed just because configuration exists: verify them on the actual hosted demo before treating it as published and checked. If you use another host, apply equivalent settings. A missing file must return a real 404 instead of an SPA fallback.

For an independent EdgeOne project, publish only the prepared site directory. For an existing main site, do not replace its project-wide configuration, original 404 page or publishing pipeline with this template. A /webdemo mount requires a controlled integration of the public subdirectory and its scoped headers. This source tree does not integrate or overwrite a main site; any main-site integration is maintained separately.

## Review limits

A local code and file review cannot prove zero risk or validate a future hosting configuration. The current checks do not audit the user's existing GitHub profile, other public repositories, historic third-party copies or a hosting account's access settings. Links to GitHub intentionally expose the public information already available there.

Do not put secrets, original documents, private image metadata or unpublished work into dist/. Keep private evidence and original Git history outside the public package.

## Static hosting method handling

The included local preview rejects write methods with 405. A static hosting platform can instead return the same public file for POST. The reviewed Makers deployment behaved this way: it returned identical public HTML without a session or changed GET content. This template supplies no write-capable function or environment binding. Verify the real host rather than assuming local HTTP method behavior is copied to it.
