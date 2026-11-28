---
title: "Kit idéznek az AI keresők? Mérés 180 válaszon (2026)"
description: "Milyen oldalakat idéznek az AI keresők és válaszmotorok, amikor a vevő AI fejlesztőt keres: öt motor, 180 válasz, 1598 hivatkozás."
lang: hu
slug: ai-valaszmotorok-forrasai-meres-2026
date: 2026-11-28T12:00:00+01:00
updated: 2026-11-28T12:00:00+01:00
tags: [ai keresők, ai válaszmotorok, ai hivatkozások, válaszmotor optimalizálás, ai keresés, saját mérés]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
pair: [en/ai-answer-engine-citations-study-2026, de/ki-antwortmaschinen-quellen-studie-2026]
---
Amikor a vevő azt kérdezi, ki vezet be AI-t, ki épít emberi jóváhagyású AI-t vagy ki készít céges weboldalt, az AI keresők és válaszmotorok nagyon sok kis oldalt idéznek, és szinte egyikben sem értenek egyet. Öt válaszmotor 180 válaszában, 36 magyar, angol és német vevői kérdésre 1598 hivatkozást számoltam 1001 domainről, és ezek közül 819 domain (81,8%) egyetlen válaszban szerepelt. Egy csoport tér vissza rendszeresen: a szakmai címtárak és piacterek, amelyekből a 180 válaszból 60 (33,3%) legalább egyet idéz.

A mérést a saját oldalam miatt futtattam, és az oldalam része a mintának. A 180 válasz egyike sem idézte. A nyers adat nyilvános, a cikk végén megtalálod.

## Röviden

- **A mezőny szétaprózott.** Az 1001 idézett domainből 819 (81,8%) a 180 válaszból pontosan egyben szerepel. Öt vagy több válaszban csak 19 domain jelenik meg.
- **A motorok ritkán értenek egyet a forrásban.** Az 1185 kérdés és domain párból 1058-at (89,3%) csak egy motor idézett, 31-et (2,6%) három vagy több. Egyetlen domaint idézett mind az öt motor ugyanarra a kérdésre.
- **A címtárak a visszatérő források.** Az 1598 hivatkozásból 209 (13,1%) címtárra vagy piactérre mutat, és a 180 válaszból 60 (33,3%) idéz legalább egyet. Angolul a 60 válaszból 30, németül 19, magyarul 11.
- **A Gemini többnyire nem ad forrást.** 36 válaszából 26-ban egyetlen link sem volt. A ChatGPT, a Perplexity és a Claude mind a 36 válaszában adott forrást, a Google AI Mode 36-ból 30-ban.
- **A Reddit és a YouTube alig jelenik meg.** Reddit: az 1598 hivatkozásból 3, a 180 válaszból 2-ben. YouTube: 15 hivatkozás 10 válaszban. LinkedIn: 25 hivatkozás 17 válaszban.

## Módszer

A mérés 2026. november 27-én és 28-án futott, három körben. A cikk számai a harmadik körből valók, hacsak a mondat mást nem mond.

- **1. kör, november 27.:** 90 rögzített kérdés (30 magyar, 30 angol, 30 német) a Google AI Mode-on, a ChatGPT-n és a Perplexityn: 270 válasz.
- **2. kör, november 28.:** ugyanezek a kérdések a Geminin (mind a 90) és a webes kereséssel futó Claude Haikun (78, a saját oldalamról szóló 12 kérdés nélkül): 168 válasz.
- **3. kör, november 28., a vevői kör:** 36 új kérdés (nyelvenként 12) mind az öt motoron: 180 válasz, mind használható.

A motorok: ChatGPT (kijelentkezve, webes kereséssel), Perplexity (a vevői körben a sonar-pro modell), Google AI Mode, Gemini (a fogyasztói alkalmazás, kijelentkezve) és Claude Haiku 4.5 kötelező webes kereséssel. A ChatGPT és a Gemini válasza a fogyasztói alkalmazásból jön, a Google AI Mode-é a találati oldalról, a Perplexity és a Claude modell API-n keresztül válaszolt. Az országot a nyelv szerint állítottam be: Magyarország, Egyesült Államok, Németország. A Claude keresése nem fogadja el Magyarországot, ezért a magyar kérdések ott ország megadása nélkül futottak.

A 36 vevői kérdés úgy szól, ahogy egy vevő kérdez: „legjobb X”, „X vagy Y”, „X alternatívái”, és konkrét helyzetek, például „könyvelőiroda vagyunk 40 fővel, ki tud nekünk AI-t bevezetni úgy, hogy minden döntést ember hagyjon jóvá?”. A témák: AI tanácsadás és automatizálás, emberi jóváhagyású AI, MVP fejlesztés szabályozott termékhez, terméktervezés, egyedi webalkalmazás és akadálymentes weboldal.

Hivatkozásnak azt az URL-t számoltam, amelyet a válasz forrásként felsorolt. Egy URL válaszonként egyszer számít, a szövegrészre mutató végződés nélkül. A domain a gépnév „www” nélkül, a LinkedIn országos változatait összevontam. A forrástípust rögzített domainlisták adják: 68 címtár és piactér, egy rövid lista a hír- és szakmédiáról, valamint minták az uniós, kormányzati és egyetemi címekre. Ami egyik listán sincs rajta, az „egyéb oldal”: ez többnyire szolgáltatók és ügynökségek oldala és blogja. A címtárak és a média aránya ezért alsó becslés.

## Milyen oldalakat idéznek a válaszmotorok a vevői kérdésekre?

Négy hivatkozásból három olyan oldalra mutat, amely egyik listámon sincs rajta: szolgáltatók, ügynökségek, stúdiók, szabadúszók és a blogjaik. A legnagyobb megnevezhető csoport a címtáraké és piactereké.

: Forrástípusok 36 vevői kérdés 180 válaszában (1598 hivatkozás)
| Forrástípus | Hivatkozás | Válasz, amely idézi |
|---|---|---|
| Egyéb oldal | 1200 (75,1%) | 180-ból 143 |
| Címtár, piactér | 209 (13,1%) | 180-ból 60 |
| Egyetem, kutatás | 62 (3,9%) | 180-ból 12 |
| EU és kormányzat | 43 (2,7%) | 180-ból 12 |
| Hír- és szakmédia | 28 (1,8%) | 180-ból 18 |
| LinkedIn | 25 (1,6%) | 180-ból 17 |
| YouTube | 15 (0,9%) | 180-ból 10 |
| Más platform | 13 (0,8%) | 180-ból 13 |
| Reddit | 3 (0,2%) | 180-ból 2 |

A leggyakrabban idézett címtárak és piacterek, a válaszok száma szerint: aiagencies.eu (9), arc.dev (8), clutch.co (8), toptal.com (7), behance.net, contra.com, upwork.com és themanifest.com (5-5), fratch.io, freelance.de és ai-atlasz.hu (4-4).

A listaoldal a másik minta, és ez átnyúlik a típusokon. Az 1598 idézett URL-ből 295-nek (18,5%) az útvonalában listára utaló szó áll: „best”, „top”, „companies”, „agencies”, „alternatives”, illetve ezek magyar és német megfelelői. Sok ilyen listát olyan szolgáltató tett közzé, amely maga is szerepel rajta.

A leggyakrabban idézett domainek összesen, a 180 válaszból: linkedin.com (17), s-pro.io (11), youtube.com (10), aiagencies.eu (9), arc.dev, clutch.co és socialpro.hu (8-8), toptal.com és leventech.hu (7-7), kindgeek.com, speedmvps.com, apexweb.hu és aiworks.hu (6-6). Az első helyezett a válaszok 9,4%-ában van jelen. Egyetlen domain sem uralja a témát.

A kérdés típusa megváltoztatja a képet. A három kör együtt: azokra a kérdésekre, amelyek szolgáltatót keresnek, a 280 válaszból 87 (31,1%) idézett címtárat, a tájékozódó kérdésekre adott 290 válaszból 5 (1,7%). Az uniós és kormányzati oldalaknál fordított a helyzet: a 290 tájékozódó válaszból 68 (23,4%) idézi őket, a 280 szolgáltatót kereső válaszból 18 (6,4%).

## Milyen gyakran értenek egyet a motorok egy forrásban?

Ritkán. Minden kérdésnél felsoroltam az összes domaint, amelyet bármelyik motor idézett: ez 1185 kérdés és domain pár. Ebből 1058-at (89,3%) egyetlen motor idézett, 96-ot (8,1%) kettő, 26-ot (2,2%) három, 4-et négy, 1-et mind az öt.

Az egyetlen teljes egyezés: a „Best AI consultants for fintech startups in Europe 2026” kérdésre mind az öt motor az aiagencies.eu oldalt idézte. Négy motor egyezett a dieaiberater.de, a kindgeek.com, a hai.stanford.edu és a socialpro.hu domainben, mindegyiknél egy kérdésre.

Kérdésenként nézve: a 36 kérdésből 2-nél két motor sem idézett közös domaint. 17 kérdésnél a legjobb egyezés egy domain volt két motornál, 12-nél három motornál, 4-nél négynél, 1-nél ötnél.

## Hány forrást ad egy-egy motor?

A motorok jobban különböznek abban, hogy hány forrást adnak, mint abban, hogy mit idéznek.

: Források válaszonként motor szerint, motoronként 36 vevői kérdés
| Motor | Válasz forrással | Medián válaszonként |
|---|---|---|
| ChatGPT | 36-ból 36 | 21 |
| Perplexity | 36-ból 36 | 10 |
| Google AI Mode | 36-ból 30 | 9,5 |
| Claude Haiku | 36-ból 36 | 4 |
| Gemini | 36-ból 10 | 0 |

Az 1598 hivatkozásból 744-et a ChatGPT sorolt fel, egy válaszban legfeljebb 42-t. A Perplexity minden válaszában pontosan 10 forrást adott. A Claude átlagosan 4 és 5 között, és soha nem többet 7-nél.

A Gemini kilóg: 36 válaszából 26-ban egyetlen link sem volt. A három kör együtt: a nem a saját oldalamról szóló kérdésekre adott 114 válaszából 77-ben nem volt forrás. Ahol a motor forrás nélkül válaszol, ott egy oldalt nem lehet idézni, csak ismerni.

## Változtat a forrásokon a kérdés nyelve?

Igen, főleg a címtárak és a helyi domainek miatt.

- **Magyar** (60 válasz, 516 hivatkozás): 282 hivatkozás (54,7%) .hu domainre mutat. A címtárak szerepe kicsi: a 60 válaszból 11 idéz ilyet. A leggyakrabban idézett domainek magyar szolgáltatók: socialpro.hu (8 válasz), leventech.hu (7), apexweb.hu és aiworks.hu (6-6), autiq.hu és automating.hu (5-5).
- **Angol** (60 válasz, 573 hivatkozás): a válaszok fele, 60-ból 30, címtárat vagy piacteret idéz. A leggyakrabban idézett domainek: aiagencies.eu és s-pro.io (8-8 válasz), linkedin.com (7), arc.dev (6), youtube.com és toptal.com (5-5).
- **Német** (60 válasz, 509 hivatkozás): 230 hivatkozás (45,2%) .de, .at vagy .ch domainre mutat, és a 60 válaszból 19 idéz címtárat. Egyetlen domain sem szerepel a 60 válaszból 5-nél többen: linkedin.com (5), utána modular-ops.de, dieaiberater.de, ai-train.de, synapse-ki-beratung.de, youtube.com, fratch.io és freelance.de (4-4).

A források száma válaszonként mindhárom nyelven hasonló: magyarul 8,6, angolul 9,6, németül 8,5.

## Mi a közös a leggyakrabban idézett kis szolgáltatói oldalakban?

Az első két kör után letöltöttem azt a 17 kis szolgáltatói és címtároldalt, amelyet a motorok a legtöbbször idéztek, és megnéztem, mi van rajtuk. Ez 17 oldal leírása, nem ok-okozati bizonyíték, és semmit nem mond a linkekről, a domain koráról vagy az indexelésről.

- **Rövid válasz az oldal tetején:** a 17 oldalból 10 önmagában is érthető válasszal kezd, sokszor címkével („Röviden”, „A rövid válasz”, „TL;DR”, „Key takeaways”).
- **Mennyiségek:** 17-ből 11 számot ír oda, ahol a kérdés számot kér: időtartamot, darabszámot vagy a bemutatott cégek adatait.
- **Táblázat értékekkel:** 17-ből 8 oldalon van legalább egy táblázat, amelynek celláiban értékek állnak, nem jelzők.
- **Megnevezett szolgáltatók:** 17-ből 5 megnevezett cégek egységes formátumú listája. Az 5-ből 4 listán a közzétevő maga is rajta van.
- **Látható dátum:** 17-ből 9 címében vagy főcímében szerepel az évszám, és 17-ből 9 mutat megjelenési dátumot, frissítési sort vagy „állapot” sort.
- **A vevő szavaival egyező cím:** 17-ből 5 olyan oldal, amelynek URL-je és főcíme pontosan a keresett szolgáltatás, és ezek közül kettőt úgy idéztek, hogy alig van rajtuk szöveg.
- **Kérdés és válasz blokk:** 17-ből 9.

A terjedelem nem választotta el az oldalakat: 500 szó alattitól nagyjából 15 500 szavasig terjednek.

## Mit jelent ez egy kis szolgáltatónak?

Ezek egyetlen mérés megfigyelései, nem recept, és semmi nem teszi biztossá, hogy egy motor idézni fog.

1. **A szétaprózottság helyet hagy.** Ha az idézett domainek 81,8%-a egyszer szerepel, és az első helyezett a válaszok 9,4%-ában van ott, akkor a mezőnyt senki nem birtokolja. Egy indexelt oldal, amely a vevő kérdésére a vevő szavaival válaszol, esélyes jelölt.
2. **A „ki” kérdésre listákból jön a válasz.** A motor nem tud szolgáltatót megnevezni egy olyan oldalról, amely senkit nem nevez meg. Az idézett oldalak címtárak és szolgáltatói áttekintések, nevekkel. Ezt látva írtam egy ilyen áttekintést: [ki fejleszt emberi jóváhagyású AI-t](/hu/irasok/emberi-jovahagyasu-ai-szolgaltatok). A saját nevem is rajta van, és ez az elején le van írva.
3. **A válaszok harmada címtárra támaszkodik.** Egy teljes profil abban a két-három címtárban, amelyet a motorok a te szolgáltatásodra és nyelvedre idéznek, külön út a válaszba. Hogy melyek ezek, az nyelvenként eltér, ahogy a fenti listák mutatják.
4. **Adj a motornak kiemelhető részt.** Címkézett rövid válasz, táblázat értékekkel, dátum, és egy mondat arról, hogy ki vagy, hol, kinek dolgozol és milyen nyelven.
5. **Kis piacon megéri a helyi nyelv.** Magyarul a hivatkozások több mint fele .hu domainre megy, a címtárak szerepe kicsi, tehát egy magyar oldal más kis szolgáltatókkal versenyez, nem a globális piacterekkel.
6. **Ne egy motorra optimalizálj.** Ha a források 89,3%-át egyetlen motor idézi, akkor az, hogy az egyik megtalál, keveset mond a többiről. Mérj többet.

Ha a vevői oldalon állsz, ugyanez az adat arra int, hogy ellenőrizd, amit egy válaszmotor mond: minden alkalommal más maroknyi oldalból dolgozik. A kérdéseket, amelyeket bármelyik szolgáltatónak feltennék, az [AI fejlesztő partner: 10 kérdés, mielőtt megbízod](/hu/irasok/ai-fejleszto-partner-valasztasa) című írásban találod.

## Korlátok

- **Körönként egy nap.** A válasz kérésenként készül, ugyanaz a kérdés egy óra múlva más forrásokat adhat. Az összegeket és a csoportokat olvasd, ne az egyes cellákat.
- **Kis minta.** 36 vevői kérdés, nyelvenként 12, és én választottam őket a saját szolgáltatásaim köré. Más ágazatban más lehet a kép.
- **A motorok változnak.** A modellek, a mögöttük álló keresés és a megmutatott források száma értesítés nélkül frissül. Ezek a számok 2026. november 27-ét és 28-át írják le.
- **Eltérő hozzáférés.** Két motort fogyasztói alkalmazásként mértem, egyet találati oldalként, kettőt API-n. Az API válasza nem feltétlenül az, amit egy bejelentkezett felhasználó lát.
- **Besorolás listák alapján.** A forrástípus domainlistákból jön. Az a címtár, amely nincs a listámon, „egyéb” oldalnak számít.
- **A szerző érdekelt.** AI integrációt és webfejlesztést árulok, és az oldalam benne van a mintában. A három körben a nem róla szóló kérdésekre adott 570 válaszból 1 idézte, a rólam vagy az oldalról szóló kérdésekre adott 48 válaszból 37.

## Adatok

A rögzített kérdéssor, minden kör eredményfájlja az összes idézett URL-lel, a pontszámfájlok és a módszertani jegyzetek az oldal nyilvános tárolójában vannak: [docs/aeo a GitHubon](https://github.com/anorbert-cmyk/norbertbarna.com/tree/main/docs/aeo). Az adat szabadon felhasználható. Kérlek, hivatkozz vissza erre a cikkre, ha használod.

## Gyakori kérdések

### Milyen oldalakat idéznek az AI válaszmotorok, ha a vevő szolgáltatót keres?

Főleg kis szolgáltatói és ügynökségi oldalakat, és mindegyiket ritkán. 36 vevői kérdés 180 válaszában 1598 hivatkozás jött 1001 domainről, és a domainek 81,8%-a egyetlen válaszban szerepelt. A legnagyobb megnevezhető csoport a címtáraké és piactereké: a hivatkozások 13,1%-a, és a 180 válaszból 60-ban legalább egy.

### Ugyanazokat a forrásokat idézi a ChatGPT, a Perplexity, a Google AI Mode, a Gemini és a Claude?

Ritkán. Az 1185 kérdés és domain párból 89,3%-ot csak egy motor idézett, 2,6%-ot három vagy több. A 36 kérdésből egynél idézte mind az öt motor ugyanazt a domaint.

### Hány forrás van egy AI válaszban?

A motortól függ. Ebben a mérésben a medián a ChatGPT-nél 21, a Perplexitynél 10, a Google AI Mode-nál 9,5, a Claude Haikunál 4 volt. A Gemini 36 válaszából 26-ban nem adott forrást.

### Felhasználhatom az adatokat?

Igen. A kérdések, a válaszonként idézett URL-ek és a pontszámok az Adatok részben linkelt nyilvános tárolóban vannak. A felhasználás ingyenes, ha visszahivatkozol erre a cikkre. A mérést a szerző a saját oldala miatt futtatta 2026. november 27-én és 28-án.
