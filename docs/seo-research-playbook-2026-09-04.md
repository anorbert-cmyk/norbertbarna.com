# barnanorbert.com — forrásolt SEO-kutatás és végrehajtási terv

Dátum: 2026-09-04. Vizsgált kód: `90e6840010de3439de7cadbef0df8c17e4ee408e`.
Kiinduló audit: az angol nyelvű, 9 tartalmi oldalas Product VP portfólió.
A későbbi, ugyanaznapi ügyfélszerzési pontosítás és két új helyi szolgáltatásoldal
a [kiegészítő végrehajtási tervben](client-acquisition-seo-geo-2026-09-04.md) szerepel.

Ez a dokumentum az első kutatási kör történeti pillanatképe. Az ugyanaznapi
későbbi ellenőrzésben a meglévő, hitelesített Search Console-domaintulajdont
megnyitottuk, és a kanonikus www sitemap beküldése sikeres lett. A GA4-bekötés
még nem készült el. A publikálás mindenkori bizonyítéka a kapcsolódó GitHub PR
és a pontos commithoz tartozó Railway-deployment, nem az alábbi induló állapot.

## Vezetői összefoglaló

A technikai alapok nagyrészt megvannak, de a keresési kereslet, a valódi
versenytársak és az üzleti eredmény még nincs adatokkal igazolva. A kutatás
Google-, Semrush-, Ahrefs-, web.dev- és Bing-forrásokra épül; nem egy fizetős
domainaudit helyettesítésére szolgál. Nem ígér első helyet vagy látogatószámot.

Konkrét élő hiányt is találtunk: a www nélküli `/works` és két ellenőrzött
esettanulmány 404-et ad, a www-változatuk 200-at. Ez megelőzi a további
metacím-finomságokat a javítási sorban. A lokális szerver átirányítási tesztje
önmagában nem igazolja a teljes éles domainútvonalat.

Az első kutatási körben a kutatás és a terv készült el, valamint a
[korábbi kulcsszótérkép](seo-keywords.md) pontatlan állításait javítottuk.
A felhasználó ezután vállalati AI-integrációs és magyar fejlesztési
ügyfélszerzésre pontosította a célt. Erre helyi EN/HU szolgáltatási oldalpár
készült; az alábbi eredeti auditadat nem az új változat teljes ellenőrzése.
Ebben az első kutatási körben még nem történt DNS/Railway/GSC/GA4-módosítás,
publikálás, hirdetésindítás vagy megkeresés.

## Határok és döntési szabályok

- Megerősített cél: nagyobb AI-integrációs ügyfelek; másodlagosan magyar AI- és
  fejlesztési ügyfelek. Hiring nem az elsődleges KPI. Az angol célországok,
  vállalati méret és minimum projektérték még tisztázandók.
- A Product VP szerepet, a meglévő útvonalakat és a `design.md` vizuális
  szabályait megtartjuk. A magyar szolgáltatási változatot a felhasználó új
  célja indokolja, nem egy ellenőrizetlen kulcsszóbecslés.
- Google működésére vonatkozó kérdésben a friss hivatalos dokumentáció az alap.
  A szolgáltatói útmutatók módszertant adnak; saját eszközpontszámaik nem
  Google-adatok. [Google a külső SEO-tanácsokról][g-thirdparty]
- A helyi kód, a teszt, az éles HTTP-válasz, a kereső indexe és a tényleges
  üzleti eredmény külön bizonyítéktípus. Egyik nem helyettesíti a másikat.
- Az első kutatási körben nem volt hozzáfért Semrush/Ahrefs domainexport,
  GSC-riport, GA4-adat vagy backlinkleltár. Minden ilyen hiány `ismeretlen`,
  nem nulla és nem becsült tény; a későbbi GSC-hozzáférés nem pótol vendoradatot.

## Amit a források alapján alkalmazunk

| Döntés | Indok és alkalmazás ezen az oldalon |
|---|---|
| Szándékhoz rendelünk oldalt, nem minden kifejezéshez újat | A hasonló célú kereséseket egy alkalmas oldal szolgálhatja ki. A meglévő esettanulmányokból indulunk; új oldal csak eltérő olvasói feladatra készül. [Semrush][s-map], [Ahrefs][a-longtail] |
| A long-tail címke nem jelent könnyű helyezést | A keresési gyakoriság és a találati mezőny számít, nem önmagában a szószám. A térkép kifejezései egyelőre jelöltek. [Ahrefs][a-longtail] |
| Üzleti relevancia és bizonyítható tapasztalat előzi a nagy volument | A Product VP portfóliót nem alakítjuk át általános AI-hírportállá. Elsőként a meglévő munkákhoz illeszkedő kereséseket validáljuk. [Ahrefs][a-strategy], [Semrush][s-audit] |
| A becslések forrását megőrizzük | A Semrush KD és az Ahrefs KD eltérő módszertanú. Nem átlagoljuk őket, és nem tekintjük helyezési valószínűségnek. [Semrush][s-kd], [Ahrefs][a-kd] |
| A title/meta korlátokat nem nevezzük Google-szabálynak | Egyedi, pontos cím és leírás kell. A karakterajánlás szerkesztési segítség; a Google megjelenítése eltérhet. A rögzített márka- és projektneveket nem cseréljük kulcsszóhalmozásra. [Címek][g-title], [leírások][g-snippet] |
| A schema nem eredménygarancia | Csak az oldal tartalmának megfelelő állításokat tartjuk meg. A szintaktikai teszt nem bizonyít jogosultságot vagy keresőbeli megjelenést. [Google][g-schema] |
| A FAQ rich result nem cél | A Google 2026-05-07-től megszüntette ezt a találattípust. A Kineticare hasznos kérdés–válasz része maradhat; a markup miatt nem ígérünk plusz találati megjelenést. [Google változásnapló][g-updates] |
| Nincs külön „AI-varázsjelölés” | A `llms.txt` nem ad Google-láthatósági előnyt. A Google AI-keresésére sem írunk át mindent gépi sablonra, és nem gyártunk vékony oldalt minden kérdésváltozatra. [Google AI-útmutató][g-ai] |
| A videó szerepéhez igazítjuk az elvárást | A portfólió kiegészítő/autoplay videója nem automatikusan önálló videótalálat. Külön videóoldal csak valódi nézői igény esetén indokolt; nem kell minden háttérvideóhoz új SEO-oldal. [Google videóútmutató][g-video] |
| Valós teljesítményt mérünk | Mobil és desktop p75: LCP legfeljebb 2,5 s, INP legfeljebb 200 ms, CLS legfeljebb 0,1 a jó tartomány célja. Ezek nem most mért eredmények, és egy Lighthouse-pontszám nem helyettesíti a terepi adatot. [web.dev][w-vitals] |

Eltérő tanácsok kezelése: a Semrush tartalomaudit-cikkének merev frissítési
ötleteit és „E-E-A-T score” szóhasználatát nem alakítjuk Google-követelménnyé.
Nem frissítünk dátumot tényleges változtatás nélkül. A Google frissebb AI-útmutatóját
követjük ott, ahol a kötelező darabolásról vagy extra jelölésről szóló tanácsok
ellentmondanak neki. A Bing saját mérési jelentését külön kezeljük, nem
vetítjük rá automatikusan a Google működésére. [Semrush][s-audit], [Google][g-ai], [Bing][b-ai]

## Az eredeti 9 tartalmi oldal ellenőrzött alapállapota

| Terület | 2026-09-04-i bizonyíték | Következtetés |
|---|---|---|
| Technikai regressziók | `npm test`: minden ellenőrzés sikeres; 10 HTML-oldal a 404-gyel együtt, 9 tartalmi oldal, 9 kezelt videó, 1200×630-as OG-képek | A kódbeli szerződések rendben; nem teljes Google-audit |
| Tartalmi leltár | Főoldal, `/works`, 7 esettanulmány; címek és JSON-LD az aktuális forrásokban | Meglévő tématérkép, nem bizonyított kereslet |
| Mérőkód | A 9 oldal scriptjeiben nincs GA4/GTM; az Email natív gomb és `location.assign`, lásd `assets/js/navigation.js:62` | A kontaktmérés megtervezendő, nem tekinthető bekötöttnek |
| GSC | A felhasználó szerint már létezik; hitelesített jelentést nem nyitottunk meg | A tulajdont és az adatokat ellenőrizni kell; a HTML-token hiánya önmagában nem bizonyít hibás fiókot |
| Betöltési prioritás | `works.html:83`: az első Raiffeisen-kép lazy; a hatodik Kineticare eager/high | Mérésre váró optimalizálási jelölt, nem bizonyított LCP-romlás |
| Éles főoldal | www főoldal 200; apex főoldal 301 a www-ra | Csak a főoldali útvonal bizonyított |
| Éles aloldali domainútvonal | Lásd az alábbi független GET-ellenőrzést | Nyitott technikai hiány |

### Nyitott éles átirányítási hiba

Független ellenőrzés: 2026-09-04 07:42:52–53 UTC, 6 GET, automatikus
átirányítás-követés nélkül. A root külön kérése a Raiffeisen hibáját megerősítette.

| Útvonal | `https://barnanorbert.com` | `https://www.barnanorbert.com` |
|---|---|---|
| `/works` | 404, nincs Location | 200, a megfelelő oldal |
| `/work/raiffeisen` | 404, nincs Location | 200, a megfelelő oldal |
| `/work/kineticare` | 404, nincs Location | 200, a megfelelő oldal |

A www-válaszok Railway-fejléceket tartalmaztak, az apex-válaszok ettől eltértek.
Eltérő kiszolgálási/útválasztási réteg valószínű, de a konkrét DNS-,
domain-forwarding-, CDN- vagy Railway-beállítás felelőssége nincs bizonyítva.
Ez nem igazolt általános Google-indexelési kiesés, és nem érinti automatikusan
a működő www-oldalak elérhetőségét.

Javítás elfogadása: HTTP és HTTPS apex, kezdőlap és mind a 8 tartalmi aloldal,
régi `.html`/hibás slug és lekérdezési paraméterek ellenőrzése; a cél a megfelelő
www canonical legyen, útvonal- és paramétervesztés nélkül. Az ismeretlen útvonal
végül valódi 404-et adjon, ne mindent a főoldalra tereljen. A kiszolgálási
réteg megváltoztatása előtt pontos cél és külön végrehajtási jóváhagyás kell.

## Kulcsszó- és versenytárskutatás a portfólióra alkalmazva

A részletes kifejezéslista a [kulcsszótérképben](seo-keywords.md) marad.
Az alábbi felosztás szerkesztői munkahipotézis, nem bizonyított keresési rangsor.

| Oldal/csoport | Olvasói feladat | Kutatási ellenőrzés |
|---|---|---|
| `/` | Norbert azonosítása, szerep és megbízási lehetőség megértése | Névkeresések külön: Norbert Barna / Barna Norbert; Product VP és AI/fintech intent külön vizsgálva |
| `/works` | Releváns szakmai bizonyíték kiválasztása | A „Selected work” rögzített cím, nem volumenadat; portfóliókeresésekhez való illeszkedés tesztelendő |
| Raiffeisen + Benker | Banki termék- és onboarding-döntések megértése | A két projekt eltérő problémájára fókuszáljunk, ne másoljuk egymásra ugyanazt a tartalmat |
| Instructure | AI/EdTech döntések és emberi ellenőrzés megértése | Esettanulmányt vagy módszertani útmutatót vár-e az adott kereső? |
| Bitpanda | Kriptós termékélmény és bizalom értékelése | Terméktervezési szándék; ne befektetési/tőzsdei forgalmat célozzunk |
| Kineticare | Digitális egészségügyi platformépítés megértése | Angol esettanulmány egy magyar termékről; nem terápiás tanácsadóoldal |
| OnRobot | Robotikai HMI és első használat megértése | Saját, bemutatható szakmai tapasztalatra épülő kérdések |
| SportsGambit | AI-termék és predikciós piac UX-ének megértése | Terméktervezési intent; ne fogadási tippekre optimalizáljunk |

Végrehajtási módszer:

1. Az angol célországokat még rögzíteni kell, majd országonként összehasonlítható
   kutatást végezni. Az ügyfélprioritás és a magyar piac már megerősített.
2. A fontos jelölteknél a tényleges találati oldalt kell megvizsgálni:
   milyen tartalomtípus, formátum, bizonyíték és szakmai szereplő jelenik meg?
3. Ebből válasszunk 3–5 releváns keresési versenytársat. Ez projektmunkaméret,
   nem iparági kötelező szám; nagy kiadókat ne kezeljünk azonos portfólió-peernek.
   [Ahrefs versenytárselemzés][a-competitors]
4. Semrush Keyword Gap esetén a Missing/Weak/Untapped listát oldalszinten,
   szándék és saját szakértelem szerint szűrjük. A lista önmagában nem
   publikálási utasítás. [Semrush][s-gap]
5. Minden jelölthöz rögzítjük: cél-URL, ország, dátum, keresési szándék,
   megfigyelt versenytársi URL-ek, meglévő bizonyíték, következő lépés.
6. Volumen és forgalmi potenciál esetén szolgáltató és adatbázis is kell.
   A globális havi keresletszám nem várható látogatószám. A Semrush
   organikus forgalma becslés, a saját GSC-kattintás más adat.
   [Volumen][s-volume], [organikus becslések][s-rankings]
7. Az audit eredménye lehet megtartás, javítás vagy további adat szükséges.
   Kevés keresési forgalom miatt nem törlünk egy hiring szempontból fontos esetet.
   [Semrush tartalomaudit][s-audit]

## Mérési specifikáció — javasolt, még nincs bevezetve

### Search Console

A meglévő propertyben előbb jogosultság, indexelési állapot, kiválasztott
canonical és sitemap-feldolgozás ellenőrzése szükséges. Ezután keresés/oldal/
ország/eszköz szerinti baseline kell kattintásra, megjelenésre, CTR-re és
pozícióra. Az eredeti exportot, szűrőket és dátumot együtt kell megőrizni.
[Google Search Console][g-gsc]

Javasolt elemzési ablak: az utolsó lezárt 28 nap és az előző 28 nap,
szezonalitásnál korábbi összehasonlítható időszakkal. Kis mintánál hosszabb
ablak kell; ez munkamódszer, nem garantált SEO-eredményidő. Brand/non-brand és
ország/eszköz csoportokat külön nézzünk. CTR = összes kattintás / összes
megjelenés; a sorok CTR-jének egyszerű átlaga félrevezető lehet.

Friss változás: a Google újabb dokumentációja külön generatív AI-megjelenési
jelentést is leír; a régebbi, kizárólag Web-összesítésre hivatkozó útmutató nem
teljes leírás. A jelentésben megjelenések, oldalak, országok és eszközök vannak;
ne ígérjünk belőle külön AI-kattintás- vagy promptszintű adatot. A dokumentáció
2026-08-31-i globális bevezetést említ, de megmaradt elérhetőségi/mintanagysági
kitételeket is tartalmaz: a saját propertyben ténylegesen ellenőrizendő.
Az exportban a hiányjelzés nullává válhat; ezt nem szabad biztos nulla
megjelenésnek tekinteni. [Google jelentésleírás][g-ai-report]

A Bing AI Performance külön kiegészítő lehet: a hivatkozási gyakoriság nem
kattintásszám, helyezés vagy kapcsolatfelvétel. Az oldalon nincs igazolt Bing
property vagy jelentés; nem állítjuk, hogy ez már gyűjt adatot. [Bing][b-ai]

### GA4 és a kapcsolatfelvétel

A bevezetéshez valódi property/stream azonosító, jóváhagyott adatkezelési és
hozzájárulási megoldás, valamint a CSP pontos módosítása kell. A jelenlegi
`server.js` külső Google-mérési végpontokat nem engedélyez. Nem lazítjuk
általános csillagra a házirendet. A hozzájárulási állapotot a mérés előtt kell
kezelni; a Consent Mode nem helyettesíti a megfelelő hozzájárulási megoldást
és adatkezelési döntést. [Google Consent Mode][g-consent]

| Javasolt esemény | Mit jelez? | Mit nem bizonyít? |
|---|---|---|
| `portfolio_case_open` | Esettanulmány megnyitása, ismert case-azonosítóval | Nem lead |
| `contact_intent` | Email- vagy LinkedIn-kezelő tudatos aktiválása; csatorna és elhelyezés | Nem elküldött email, nem beérkezett megkeresés |
| Minősített megkeresés, külön összesített nyilvántartásban | Tényleges, releváns beérkezés, felhasználói megerősítéssel | Nem vezethető le automatikusan a gombkattintásból |

Ezek saját specifikációs eseménynevek, nem most létrehozott GA4-események.
Az Email gomb nem hagyományos `mailto:` link: a saját click-kezelőjét kell
megfelelően mérni a meglévő billentyűzetes működés megőrzésével. Nem küldünk
emailcímet, üzenetszöveget vagy más szükségtelen személyes adatot a mérésbe.
Ellenőrzés: elfogadás/elutasítás/visszavonás, oldalváltás, egér és billentyűzet,
dupla események kizárása, CSP és hálózati hibák, tényleges megjelenés a kiválasztott
tesztjelentésben. A sikeres beállítást külön bizonyítani kell.

## Prioritásos végrehajtási sorrend

A sorrend javaslat, nem automatikus ütemezés vagy új külső műveleti engedély.

| Sorrend | Feladat | Késznek tekintés feltétele |
|---|---|---|
| 1 | Éles apex→www útvonal diagnózis és jóváhagyott javítás | Valós HTTP/HTTPS GET-mátrix átirányítási hurok, útvonal- és paramétervesztés nélkül |
| 2 | Meglévő GSC property áttekintése | Hozzáférés, indexelés/canonical/sitemap és dátumozott baseline ellenőrzött |
| 3 | Mérési bevezetés előkészítése, majd külön végrehajtás | Valós azonosító; elfogadott privacy/consent; megbízható, duplikációmentes események |
| 4 | Kulcsszó- és peer-validálás | Célpiac, dátumozott SERP- és forrásadat minden kiválasztott klaszterhez |
| 5 | Meglévő tartalom és belső linkek javítása | Valós olvasói hiányt old meg, pontos szakmai bizonyítékkal, működő cél-URL-ekkel |
| 6 | Betöltési prioritás ellenőrzése | Reprodukálható mobil/desktop mérés; a fold/LCP erőforrás nem indokolatlanul késleltetett |
| 7 | Egy bizonyított téma tartalmi pilotja | Saját tapasztalat, publikálható bizonyíték, eltérő intent és jóváhagyott brief |
| 8 | Terjesztés és utómérés | Jóváhagyott szakmai csatorna; rögzített változások; összehasonlítható eredményadat |

Tartalmi pilotjelöltek: banki KYC-helyreállítási döntések a Raiffeisen/Benker
anyagból; emberi ellenőrzés AI-funkcióknál az Instructure-anyagból; első használat
robotikai HMI-n az OnRobot-anyagból. Ezekhez még tényleges keresleti vizsgálat,
a bemutatható tapasztalat és a publikálási jog ellenőrzése kell. Nem készül
automatikusan mindhárom új cikk.

Belső linkek: a meglévő navigációban és tartalomban releváns kapcsolatok,
érthető horgonyszöveg, nem árva fontos oldalak. A teljes portfóliót nem írjuk
újra kulcsszavazott linkekre. [Ahrefs belső linkek][a-internal]

Külső terjesztés: saját szakmai tanulság, partneri vagy konferenciahivatkozás,
releváns szerkesztői érdeklődés. Nincs linkcsomag, manipulatív linkcsere vagy
megrendelt álértékelés. Megkeresés és publikálás csak külön feladatként.
[Ahrefs linképítés][a-links], [Google spamirányelvek][g-spam]

## Ellenőrzés, tanulság és leállási feltételek

- A kutatás dokumentációs alkalmazása akkor kész, ha a fontos döntésekhez
  elsődleges forrás tartozik, a tényleges és a javasolt lépések elkülönülnek,
  nincs kitalált üzleti/kulcsszóadat, és független review ellenőrzi a dokumentumokat.
- Az eredeti háromfájlos dokumentációs körhöz `git diff --check`, helyi
  hivatkozásellenőrzés és `npm test` tartozott. A későbbi kódváltozás külön
  ellenőrzési rekordja a kiegészítő tervben van. Google-index auditot vagy
  igazolt terepi CWV-eredményt ezekből nem állítunk.
- Tanulság: egy régi útmutató vagy zöld lokális teszt nem elég. Az apexen a
  GET-et és a végső céloldalt kell ellenőrizni; egy HEAD-válasz vagy a főoldal
  működése nem zárja le az aloldali átirányításokat.
- További általános cikkgyűjtés helyett a hiányzó saját adat a következő kapu.
  Hozzáférés, célpiac, hiteles mérés vagy publikálási jog hiányában az adott
  végrehajtási lépést megállítjuk; nem helyettesítjük feltételezett számokkal.
- A tudásbázis fókuszált válogatás, nem az internet teljes SEO-irodalma.
  Új funkció, kiadás vagy ellentmondó bizonyíték esetén az érintett forrást
  újraellenőrizzük. Nincs beállított háttérfigyelés vagy automatikus kampány.

## Forrásjegyzék és eredet

Minden alábbi forrást 2026-09-04-én nyitottunk meg. A dátum a látható
publikálási/frissítési dátum, nem saját becslés. A Semrush/Ahrefs anyagai
első fél módszertani leírások, nem a barnanorbert.com-ról lekért riportok.

| Forrás | Látható dátum | Szerepe |
|---|---|---|
| [Google: third-party SEO][g-thirdparty] | 2026-06-05 | Forráshierarchia, becslések korlátai |
| [Google: title links][g-title] | 2025-12-10 | Címadás |
| [Google: snippets][g-snippet] | 2026-04-20 | Leírás, megjelenítés |
| [Google: structured-data policies][g-schema] | A megnyitott részletben nincs rögzített dátum | Schema és eredmény különbsége |
| [Google: dokumentációs változásnapló][g-updates] | 2026-05-08 és 2026-06-15 bejegyzés | FAQ-megjelenés megszűnése |
| [Google: AI optimization][g-ai] | 2026-07-10 | AI/SEO tévhitek és hasznos tartalom |
| [Google: AI performance report][g-ai-report] | 2026-08-31-i bevezetési megjegyzés | Jelentés, elérhetőségi/adatkorlátok |
| [Google: Search Console kezdőútmutató][g-gsc] | A megnyitott részletben nincs rögzített dátum | Indexelés és keresési baseline |
| [Google: video SEO][g-video] | 2025-12-18 | Kiegészítő videó és watch page |
| [Google: Consent Mode][g-consent] | 2026-07-30 | Hozzájárulás technikai sorrendje |
| [Google: spam policies][g-spam] | A megnyitott részletben nincs rögzített dátum | Tiltott manipulatív módszerek |
| [web.dev: Web Vitals][w-vitals] | 2024-10-31 | Terepi teljesítménymutatók |
| [Bing: AI Performance][b-ai] | 2026-02-10 | Külön AI-hivatkozási mérés |
| [Semrush: keyword mapping][s-map] | 2026-07-27 | URL–intent térkép |
| [Semrush: Keyword Gap][s-gap] | Nem látható | Versenytársi rések szűrése |
| [Semrush: search volume][s-volume] | Nem látható | Volumen kontextusa |
| [Semrush: KD][s-kd] | Nem látható | Saját nehézségbecslés |
| [Semrush: organic positions][s-rankings] | Nem látható | Forgalombecslés korlátai |
| [Semrush: content audit][s-audit] | 2026-05-04 | Cél, leltár, intézkedés, utómérés |
| [Ahrefs: competitor analysis][a-competitors] | 2025-02-17 | Tényleges keresési versenytárs |
| [Ahrefs: long-tail keywords][a-longtail] | 2026-05-27 | Long-tail és azonos intent |
| [Ahrefs: keyword strategy][a-strategy] | 2026-03-13 | Üzleti érték és elérhetőség |
| [Ahrefs: keyword difficulty][a-kd] | 2025-12-15 | KD korlátai |
| [Ahrefs: internal links][a-internal] | 2026-03-10 | Releváns belső kapcsolatok |
| [Ahrefs: link building][a-links] | Nem látható | Szerkesztői hivatkozások |

Hozzáférési korlátok: a Bing általános guideline-oldala nem adott érdemi
kivonatot, ezért nem arra építettünk; egyes Google Help-hivatkozások hibával
nyíltak. Az itt hivatkozott, olvasható elsődleges oldalak szolgáltak alapul.
Az első kutatási kör nem használt belépett ügyfélfiók-riportot vagy bizonyított
SERP-versenytárslistát; a későbbi GSC-ellenőrzés külön munkalépés volt.

[g-thirdparty]: https://developers.google.com/search/docs/fundamentals/third-party-seo
[g-title]: https://developers.google.com/search/docs/appearance/title-link
[g-snippet]: https://developers.google.com/search/docs/appearance/snippet
[g-schema]: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
[g-updates]: https://developers.google.com/search/updates#may-2026
[g-ai]: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
[g-ai-report]: https://support.google.com/webmasters/answer/16984139
[g-gsc]: https://developers.google.com/search/docs/monitor-debug/search-console-start
[g-video]: https://developers.google.com/search/docs/appearance/video
[g-consent]: https://developers.google.com/tag-platform/security/guides/consent
[g-spam]: https://developers.google.com/search/docs/essentials/spam-policies#link-spam
[w-vitals]: https://web.dev/articles/vitals
[b-ai]: https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
[s-map]: https://www.semrush.com/blog/keyword-mapping/
[s-gap]: https://www.semrush.com/kb/28-keyword-gap
[s-volume]: https://www.semrush.com/kb/683-what-is-search-volume-in-semrush
[s-kd]: https://www.semrush.com/kb/1158-what-is-kd
[s-rankings]: https://www.semrush.com/kb/494-organic-rankings-positions-report
[s-audit]: https://www.semrush.com/blog/content-audit/
[a-competitors]: https://ahrefs.com/blog/seo-competitor-analysis/
[a-longtail]: https://ahrefs.com/blog/long-tail-keywords/
[a-strategy]: https://ahrefs.com/blog/keyword-strategy/
[a-kd]: https://ahrefs.com/blog/keyword-difficulty/
[a-internal]: https://ahrefs.com/blog/internal-links-for-seo/
[a-links]: https://ahrefs.com/seo/link-building
