# Self-hosted typography

Retrieved from official Google Fonts endpoints on 2026-09-16. These are the
**unmodified** WOFF2 files already selected by this site's former WebFont loader,
not a new font family or version. `manifest.json` records every source URL, byte
length and full SHA-256 digest. Files use that digest's first 12 characters in
their names; the server validates this release convention in its cache checks.

- Funnel Display v3: [Google Fonts source and license](https://github.com/google/fonts/tree/main/ofl/funneldisplay), [upstream project](https://github.com/Dicotype/Funnel).
- Inter v20: [Google Fonts source and license](https://github.com/google/fonts/tree/main/ofl/inter), [upstream project](https://github.com/rsms/inter).
- `funnel-display-OFL.txt` and `inter-OFL.txt` reproduce each family's SIL Open
  Font License 1.1 from the corresponding official Google Fonts directory.

The original request was
`https://fonts.googleapis.com/css?family=Funnel+Display:300,regular,500,600,700,800%7CInter:200,300,regular,500,600,700,800,900`.
A contemporary Chromium user agent received the same subset URLs as
`https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Inter:wght@200..900&display=swap`.
The binary files are variable fonts. The CSS deliberately retains the **original
discrete weight descriptors**: Funnel 300/400/500/600/700/800; Inter
200/300/400/500/600/700/800/900. Converting to continuous descriptors would change
authored 650/750 matching from 700/800 and subtly alter the approved lettering.

Only Latin and Latin-ext are required by the site's English and Hungarian content.
The official unicode ranges are preserved, including Hungarian ő/ű (U+0151/U+0171)
and their capitals. This is not a general Cyrillic/Greek/Vietnamese font package.
`font-display: swap` keeps text readable during a slow request. Body and animation
code still use the native Font Loading API; no timing-based readiness substitute
was added. Native CSS works when JavaScript is disabled or third-party font hosts
are unreachable.

The old chain (head script → Google CSS → fonts) is replaced by a head stylesheet
and direct same-origin critical-font preloads. Inter Latin is critical throughout;
Funnel Latin is additionally preloaded on Works, About, cases, privacy and 404;
Hungarian pages also preload Inter Latin-ext. Other subset requests follow actual
glyph usage. Different faces reuse the same cached subset file.

To update: verify official provenance and font fidelity, record the new full
binary digests in `manifest.json`, update CSS URLs, hash `assets/css/fonts.css`
to its release filename, and update HTML stylesheet/preload references. Keep both
OFL license files with the font distribution. Do not change dependencies or expand
CSP merely to update these assets.
