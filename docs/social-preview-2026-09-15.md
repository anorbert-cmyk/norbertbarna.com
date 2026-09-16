# Forest and olive social preview

The owner requested a crop of the approved green/yellow geometry instead of
the old image containing “AI Product Design Lead” and “Product & UX Design Lead”.
The old file was a title card, despite earlier checks calling it a portrait.

- Source: `assets/images/geometry/raiffeisen.1600.webp`.
- Final: `assets/images/og/forest-olive-folds.jpg`, 1200 × 630 JPEG.
- Method: built-in imagegen reference edit for the reframing; `sips` JPEG encoding
  and resizing for the delivered social format. This is decorative portfolio
  artwork, not product evidence or a photograph of Norbert.
- A new URL avoids reusing the cached title-card asset. Social platforms may
  still retain their own cached preview until they recrawl the page.
- Home, EN/HU AI services and EN/HU privacy pages shared the old title card and
  now share the new artwork. Case-specific and About previews stay unchanged.

## Generation prompt

Edit the supplied existing artwork only by reframing it into a wide landscape
social-sharing crop, aspect 1200:630. Use the central and left portion of the
supplied forest green and olive yellow folded geometric tunnel. Preserve the
exact existing shapes, material grain, forest and olive palette, sharp edges,
lighting and photographic fidelity. This is a crop from the approved artwork,
not a redesign: no new objects, no lettering, no logo, no borders, no gradients
added. The folds should fill the entire frame; favor the prominent large olive
fold at left and the receding green/olive tunnel on the right. Output one
landscape image for a website Open Graph preview.

## Metadata semantics and evidence

The same image is used in Home Open Graph, Twitter and ProfilePage `image` /
`primaryImageOfPage`. Its dimensions, format and alternative text describe the
actual delivered file. The Person retains name, role, URL and professional
identity. Its optional `image` is omitted: the supplied asset is not a profile
portrait, and there is no verified portrait asset in this site.

Sources checked 2026-09-15:

- [Open Graph](https://ogp.me/): image URL, dimensions, MIME type and descriptive alternative text.
- [Google ProfilePage image guidance](https://developers.google.com/search/docs/appearance/structured-data/profile-page): use an applicable creator image, not a default icon or placeholder.
- [Schema.org primaryImageOfPage](https://schema.org/primaryImageOfPage): page artwork is represented by an ImageObject.

Static checks verify shared metadata and actual JPEG dimensions. The existing
browser identity check now distinguishes the page preview from the Person.
