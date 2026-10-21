# Technikai SEO-audit, 2026-10-21

A www.barnanorbert.com technikai SEO-állapota, a javítások ebben a PR-ben, és ami Norbira vagy más szálra vár. Az SEO-terv T5 feladata.

## Röviden

- **Indexelhetőség rendben.** Mind a 26 kanonikus oldal 200-at ad, önhivatkozó canonicallal, en/hu/x-default hreflang-párral, sitemapben. Az ismeretlen URL valódi 404. Az apex (barnanorbert.com) egy lépésben 301-gyel visz a www-re, útvonallal és query-vel együtt.
- **A spam-linkek nem okoznak kárt.** A DataForSEO 2192 hivatkozó domaint mutat, mind ugyanabból az automatizált linkfarm-hálózatból. A Search Console „Legutóbbi linkek” exportja szerint viszont a Google ezek közül **egyet sem** tart számon. Csak a kineticare.hu 8 linkjét látja. A disavow-lista elkészült, de most nem kell feltölteni (lásd lent).
- **A magyar oldalak eddig nem mértek PostHogban.** Az analytics.js útvonallistájából hiányzott a teljes magyar oldal, a /contact és az /about. Javítva, és bekerült a beküldött kapcsolatűrlap mint konverzió.
- **A teljesítmény az esettanulmányokon jó (mobilon 92-98), a főoldalakon gyengébb (64-77).** Az ok a WebGL hero-jelenet és a GSAP indulása a főszálon. Ezt a fizika-animáció szála birtokolja, ezért itt csak a javaslat szerepel.

## 1. Lighthouse és Core Web Vitals

A futtatás helyben történt (Lighthouse 13.5, a repo szervere, Chromium), mert a sandbox nem éri el az élő oldalt, és a PageSpeed API napi kvótája elfogyott. A mobil profil szimulált 4x CPU-lassítással és lassú 4G-vel mér, ez laborérték, nem terepi adat. A forgalom kicsi, ezért CrUX-terepi adat várhatóan nincs. A Search Console „Alapvető webes vitals” jelentése mutatja majd, ha lesz.

| Oldal | Mobil P | Mobil LCP | CLS | Mobil TBT | Desktop P | SEO | A11y |
|---|---|---|---|---|---|---|---|
| / | 64 | 3.5 s | 0.001 | 1890 ms | 94 | 100 | 100 |
| /hu | 71 | 3.9 s | 0.001 | 662 ms | 99 | 100 | 100 |
| /ai-integration | 77 | 2.4 s | 0.000 | 879 ms | 89 | 100 | 100 |
| /hu/ai-integracio | 75 | 3.1 s | 0.000 | 788 ms | 93 | 100 | 100 |
| /contact | 72 | 3.6 s | 0.000 | 746 ms | 96 | 100 | 100 |
| /hu/kapcsolat | 68 | 3.8 s | 0.000 | 920 ms | 96 | 100 | 100 |
| /works | 98 | 2.4 s | 0.000 | 33 ms | 100 | 100 | 100 |
| /hu/munkak | 92 | 3.3 s | 0.000 | 8 ms | 100 | 100 | 100 |
| /about | 99 | 2.0 s | 0.000 | 44 ms | 100 | 100 | 100 |
| /privacy | 99 | 2.0 s | 0.000 | 43 ms | 100 | 100 | 100 |
| /hu/adatvedelem | 97 | 2.6 s | 0.000 | 0 ms | 100 | 100 | 100 |
| /work/raiffeisen | 98 | 2.3 s | 0.001 | 28 ms | 100 | 100 | 100 |
| /work/instructure | 95 | 2.9 s | 0.001 | 6 ms | 97 | 100 | 100 |
| /work/bitpanda | 96 | 2.6 s | 0.001 | 85 ms | 100 | 100 | 100 |
| /work/benker | 98 | 2.4 s | 0.001 | 0 ms | 100 | 100 | 100 |
| /work/sportsgambit | 96 | 2.6 s | 0.001 | 66 ms | 100 | 100 | 100 |
| /work/kineticare | 92 | 2.4 s | 0.001 | 260 ms | 100 | 100 | 100 |
| /work/onrobot | 98 | 2.3 s | 0.001 | 0 ms | 100 | 100 | 100 |
| /hu/munka/raiffeisen | 93 | 3.1 s | 0.001 | 96 ms | 100 | 100 | 100 |

A /hu/rolam mobil futása megszakadt (a desktop 100). A többi /hu/munka oldal ugyanazt a sablont használja, mint a mért /hu/munka/raiffeisen. A Best Practices a kapcsolatoldalon 96, mert a sandbox nem érte el a Cloudflare Turnstile-t. Élesben ez nem hiba.

**Ami rendben van:** CLS gyakorlatilag nulla mindenhol. A fontok saját hosztolásúak, preloaddal és `font-display`-jel (a Lighthouse font-auditja átment). A képek WebP/méretezett változatban jönnek, az esettanulmány-képek lustán töltődnek. Az SEO- és akadálymentességi pontszám mindenhol 100.

**Ami javítandó, javaslat a fizika-animáció szálának (#92):**
1. *TBT/INP a főoldalakon.* A `hero-scene.js` egyetlen indulási feladata mobilon 600-1570 ms, a GSAP-é 400-860 ms. A hero-jelenet a kapcsolat- és szolgáltatásoldalakon is fut. Javaslat: a WebGL-jelenet inicializálását `requestIdleCallback`-be vagy az első interakció utánra tenni, és több részre bontani (`scheduler.yield`), hogy egyik feladat se legyen 50 ms-nál hosszabb.
2. *Render-blokkoló CSS.* Egy oldal 8-10 külön stíluslapot tölt (Webflow shared + oldal-specifikus + responsive + compact-navigation + consent ...), mobilon kb. 400-700 ms becsült megtakarítással. Javaslat: a hajtás feletti kritikus CSS inline, a többi egy-két csomagban. Ez a hash-elt release-rendszert érinti, külön PR-ben érdemes.
3. *A süti-sáv mint LCP.* Mobilon több oldalon (pl. /work/instructure) a hozzájárulási sáv szövege lesz a legnagyobb tartalmi elem, mert a halasztott `consent.js` későn fedi fel. Minden első látogató ezt látja. Javaslat: a sáv szövegét kisebbre venni, vagy a sávot CSS-ből megjeleníteni, és csak a gombokat kötni JS-hez.
4. *Kép:* a `story/fold-detail.webp` (2172×724, 146 KB) a kapcsolatoldal háttere. A Lighthouse 98 KB megtakarítást jelez. Mivel `object-fit: cover` kitölti a teljes képernyőmagasságot, mobilon is kell a felbontás, ezért ezt nem vágtam le.

## 2. Indexelés és átirányítások

Ellenőrizve a kódban és élőben (WebFetch: kezdőlap, apex, sitemap). Ami változott:

- **http → https 301 a www-hoszton.** A Railway a TLS-t a peremen bontja, és `X-Forwarded-Proto` fejlécben adja át a sémát. Eddig egy `http://www.barnanorbert.com/...` kérés, ha a Railway nem irányít át magától, duplikált 200-as oldal lett volna. Most egy lépésben 301 a https URL-re, a .html/perjeles alakot is kanonizálva. Teszt: `scripts/check-server.mjs`. Deploy után érdemes egyszer kipróbálni: `curl -I http://www.barnanorbert.com/about.html` → 301, Location `https://www.barnanorbert.com/about`.
- **norbertbarna.com:** Norbi szerint nem az ő domainje, ezért semmi nem irányít rá, és a repóban sem szerepel oldal-URL-ként (csak a GitHub-repó neve az).
- **404:** ismeretlen útvonal, a `/404` és a privát útvonalak valódi 404-et adnak `noindex, follow` hibaoldallal (check-server).
- **Sitemap:** 26 URL, mind kanonikus. A `lastmod` csak ott lett 2026-10-21, ahol valódi tartalmi változás történt (új title, frissített adatvédelmi szöveg). A Google csak akkor veszi figyelembe a lastmod-ot, ha következetesen pontos, ezért nem állítottam át mindent.
- **robots.txt:** mindent enged, kivéve `/api/`, és hirdeti a sitemapet. Rendben.
- **Bing:** a `msvalidate.01` a kezdőlapon van. **Google:** a `GOOGLE_SITE_VERIFICATION` környezeti változó üres, mert Norbi Search Console-hozzáférése már él (Domain-tulajdon vagy DNS-ellenőrzés).

### IndexNow

Új fájlok: `4cf59849855778fd47f78e60a9143478.txt` (a kulcs a gyökérben, ahogy a protokoll kéri; a kulcs nyilvános, nem titok) és `scripts/indexnow.mjs`.

Deploy után, a saját gépedről vagy CI-ból:

```
npm run indexnow                   # a sitemap összes URL-je
npm run indexnow -- /hu /about     # csak ezek
npm run indexnow -- --dry-run      # csak kiírja, nem küld
```

A szkript csak sitemapben szereplő URL-t enged beküldeni. Az IndexNow-t a Bing, a Yandex, a Seznam és a Naver használja, a Google nem. A Google-nek a sitemap és a Search Console URL-ellenőrzés marad.

## 3. Entitás

- **Person sameAs:** Norbi döntése szerint csak a LinkedIn (`https://www.linkedin.com/in/barna-norbert/`). Ez a kezdőlapokon már bent van. Új profilt csak akkor írjunk be, ha Norbi megadja.
- **Név:** minden Person csomópont `name: "Norbert Barna"`, a kezdőlapokon `alternateName: "Barna Norbert"`. A magyar oldalak címe „Barna Norbert”, az angoloké „Norbert Barna”, ez szándékos és következetes.
- **Organization / ProfessionalService:** nincs, és Google Business Profile sincs. Nem vettem fel, mert nincs hozzá valós cím vagy cégadat.
- **Kommunikációs nyelv:** a `knowsLanguage` en/hu, a Service `availableLanguage` en/hu. A német piacra szánt oldalaknál (későbbi szál) ugyanez marad: a munka nyelve magyar és angol.

## 4. Spam-backlinkek

**Adat (DataForSEO, 2026-10-21, 0,66 USD):** 2282 backlink 2193 domainről, de csak 197 alhálózatról. Mind a 2282 link a `https://barnanorbert.com/` kezdőlapra mutat. Három horgonyszöveg létezik:

1. „Get Higher Rankings with Expert SEO Backlinks barnanorbert.com”: 2240 link, 2026-09-18 óta.
2. „High Quality Dofollow Backlinks DA 50 PA 40 Premium PBN ... Buy Backlinks Online Cheap”: 26 link, 2026-08-02 óta, feltört vagy lejárt .com oldalakon.
3. A puszta „barnanorbert.com”: 16 link, .eu URL-rövidítők és katalógusok.

A domainek 98%-a hat olcsó gTLD-n van (.shop, .website, .store, .space, .site, .online), „DA checker” és „buy backlinks” nevekkel. 2021 domain októberben jelent meg, napi 100-145 újjal, és ma is tart. Ez egy automatizált linkfarm, amely a saját „SEO-szolgáltatását” reklámozza ezres katalógusoldalakon. Nem Norbi okozta, és nem célzott támadás.

**Instructure-kapcsolat: nincs.** Egyik link vagy horgony sem tartalmazza az „instructure” szót, és egyik sem a /work/instructure oldalra mutat. A Semrush „ai instructure” találatai ettől függetlenek.

**Mit lát a Google?** Norbi Search Console-exportja (Linkek → Legutóbbi linkek, 2026-10-21) **csak 8 linket** mutat, mind a kineticare.hu-ról. A Google tehát a linkfarmot nem számolja a webhelyhez. Ez egyezik a Google irányelvével: a spam-linkeket algoritmikusan figyelmen kívül hagyja, és a disavow csak kézi intézkedésnél vagy saját fizetett linkeknél kell.

### Javaslat: a disavow-fájlt most NE töltsd fel

A `docs/disavow-2026-10.txt` mind a 2192 domaint tartalmazza `domain:` sorként, és kész a feltöltésre. Akkor töltsd fel, ha az alábbiak bármelyike igaz lesz:

- a Search Console-ban megjelenik egy **kézi intézkedés** (Biztonság és kézi intézkedések → Kézi intézkedések), vagy
- a Linkek jelentésben a spam-domainek tömegesen feltűnnek, és ezzel egy időben a kattintások vagy megjelenések érezhetően esnek.

Feltöltés lépései:

1. Frissítsd a listát: Search Console → Linkek → Leggyakrabban linkelő webhelyek → Exportálás → CSV, majd `node scripts/build-disavow.mjs <a-letöltött.csv>`. A szkript csak a linkfarm mintájú domaineket veszi fel. Minden mást kiír kézi döntésre, és a kineticare.hu-t meg a LinkedInt soha nem veszi fel.
2. Nyisd meg: https://search.google.com/search-console/disavow-links
3. Válaszd a **barnanorbert.com Domain-tulajdont**. A linkek az apexre (barnanorbert.com) mutatnak, ezért URL-előtag tulajdonnál a `https://barnanorbert.com/` tulajdonhoz kell feltölteni, nem a www-hez.
4. Töltsd fel a `docs/disavow-2026-10.txt` fájlt (UTF-8, 2 MB és 100 000 sor alatt van). Egy új feltöltés a régit teljesen lecseréli.
5. A hatás hetek alatt jelenik meg. A Linkek jelentés ettől nem változik, a disavow csak a rangsorolásban számít.

## 5. Mérés (PostHog)

- **Javítva:** az `analytics.js` csak 13 angol útvonalon mért. A teljes magyar oldal, a /contact és az /about kimaradt, a magyar látogatók tehát nem jelentek meg. Most mind a 26 kanonikus útvonal mér, helyes `page_language` (hu/en) és `page_type` (home, work_index, case_study, about, contact, privacy, service) értékkel.
- **Új esemény: `contact_form_submitted`.** Akkor küldődik, amikor a szerver elfogadta az üzenetet (a `contact.js` egy tartalom nélküli `portfolio:contact-sent` DOM-eseményt ad le). Csak a tényt és az oldal nyelvét küldi. Szöveg, név és e-mail soha nem kerül bele. Ugyanaz a hozzájárulás-kapu védi, mint az oldalmegtekintést.
- **Konzultáció-CTA:** a meglévő `contact_intent` esemény mostantól `cta_id` tulajdonságot is visz, ha a link vagy gomb `data-analytics-cta="consultation"` (vagy `contact`, `service`) attribútumot kap. A T1/T2 szálak szolgáltatásoldalain a „Kérj konzultációt” CTA kapja meg ezt az attribútumot.
- **Adatvédelem:** a /privacy és a /hu/adatvedelem szövege kimondja, hogy az űrlap elküldésének ténye mérésre kerül, a tartalma nem.

**PostHog-beállítás Norbinak (egyszer, a PostHog felületén, az EU 265707 projektben):**

1. Data management → Actions → New action „Lead: kapcsolatűrlap elküldve” → Match event `contact_form_submitted`.
2. New action „CTA: konzultáció” → Match event `contact_intent`, szűrő `cta_id = consultation`.
3. Product analytics → New insight → Funnel: `$pageview` (page_type = service) → `contact_intent` → `contact_form_submitted`, bontás `acquisition_channel` szerint. Így látszik, hogy a Google-ből (organic_search) jövők közül hányan írnak.
4. Tesztforgalom szűrése: `is_test = false`.

## 6. Szigorúbb `scripts/check-seo.mjs`

Új ellenőrzések, mind az `npm test` része:

- title legfeljebb 60 karakter, description 105-135 karakter, az `og:`/`twitter:` title és description ugyanaz;
- FAQPage csak akkor, ha minden kérdés látható kérdéselem (h2-h4, summary, dt vagy button) a `<main>`-ben, rejtett blokkon kívül;
- hreflang: ha egy oldal nincs regisztrált nyelvpárban, nem lehet hreflang-ja (félpár tilos), és minden hreflang-cél kanonikus oldal;
- a repo minden nyilvános HTML-fájlja szerepel az SEO-leltárban, és így a sitemapben is.

Ehhez 16 túl hosszú title rövidült (esettanulmányok, about/rólam, kapcsolat, munkák, a két kezdőlap). Az Article `headline` és a `docs/seo-keywords.md` is követi őket. A kezdőlapok végleges title-jét a T2 (főoldal) szál írja, itt csak a 60 karakteres korlát miatt rövidült.

## Nyitott pontok

| Pont | Kié | Állapot |
|---|---|---|
| A disavow feltöltése | Norbi | Most nem kell, lásd a 4. pontot |
| PostHog-akciók és funnel létrehozása | Norbi | Lépések az 5. pontban |
| `npm run indexnow` az első deploy után | Norbi | Egyszer, utána tartalomváltozáskor |
| http → https ellenőrzése élesben | Norbi vagy következő szál | `curl -I http://www.barnanorbert.com/about.html` |
| Hero-jelenet és CSS-csomagolás (TBT, LCP) | Fizika-animáció szála (#92) | Javaslat az 1. pontban |
| `data-analytics-cta="consultation"` a szolgáltatásoldalak CTA-ján | T1, T2, T3 | Az esemény kész, csak az attribútum kell |
