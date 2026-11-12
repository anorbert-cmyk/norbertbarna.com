---
title: "AI automatizálás cégeknek: melyik folyamattal kezdj"
description: "AI automatizálás cégeknek: öt szempont az első folyamat kiválasztásához, mikor elég a hagyományos megoldás, és mi vezet a pilotig."
lang: hu
slug: ai-automatizalas-melyik-folyamattal-kezdj
date: 2026-11-12T12:00:00+01:00
updated: 2026-11-12T12:00:00+01:00
tags: [ai automatizálás, folyamatautomatizálás, ai audit, ai tanácsadás, ai bevezetés]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
cover: /assets/images/og/writing/ki-automatisierung-erster-prozess.jpg
cover_alt: Több hajtogatott papírsáv fut egymás mellett, az egyik olajzöld színnel kiemelve egy kis papírkapun vezet át: az első folyamat, amellyel az AI automatizálás elindul
pair: de/ki-automatisierung-erster-prozess
---
Az AI automatizálás első folyamata legyen olyan, amely gyakran előfordul, strukturálatlan bemenettel dolgozik (e-mail, dokumentum, szabad szöveg), az eredményét ember ellenőrizni tudja, mielőtt hatása lenne, és a haszna folyamatonként percekben mérhető. Ha egy folyamat rögzített szabályokat követ és strukturált adatokat dolgoz fel, akkor nem AI kell hozzá, hanem hagyományos automatizálás. Az olcsóbb és megbízhatóbb.

Ebben a cikkben öt szempontot kapsz, amellyel sorba rendezheted a folyamataidat. Megmutatom, hol a határ az AI és a hagyományos automatizálás között, hozok példát jó és rossz első jelöltre, és leírom, milyen lépésekben lesz egy jelöltből mérhető pilot. A cikk az [AI bevezetése KKV-nál: az első 90 nap](/hu/irasok/ai-bevezetese-kkv-elso-90-nap) folytatása. Az a menetrendről szól, ez a kiválasztásról.

## AI automatizálás vagy hagyományos automatizálás?

A kettőt gyakran egy kalap alá veszik, pedig más problémát oldanak meg.

**A hagyományos automatizálás** rögzített szabályokat hajt végre: ha beérkezik egy számla, mentsd el a mappába, és írd be az összeget a táblázatba. Strukturált adatokkal dolgozik, determinisztikus, és ha téved, mindig ugyanúgy téved. Emiatt a hibát könnyű megtalálni. Eszköz évtizedek óta van hozzá, a makróktól a workflow-platformokon át a rendszerek közötti interfészekig.

**Az AI automatizálás** ott jön képbe, ahol a szabályt nem lehet leírni. A számla egy fénykép, az összeg minden alkalommal máshol áll rajta. Az ügyfél megkeresése szabad szöveg, három nyelven. A szerződésben bizonyos kikötéseket kell megkeresni. Itt egy modell mintákat ismer fel, és javaslatot ad. Ennek ára van: az eredmény nem determinisztikus, lehet hibás, ezért ellenőrizni kell.

Ebből következik az első szabály minden AI-ra épülő folyamatautomatizálásnál: **ha le tudod írni a szabályt, automatizálj hagyományosan.** Az AI arra a részre való, amelynél a szabály leírása közben azt mondanád: „hát ezt ránézésre látja az ember.”

## Melyik folyamat alkalmas AI-ra épülő folyamatautomatizálásra? Öt szempont

### 1. Gyakoriság

A folyamat naponta vagy hetente fut, nem negyedévente. A beállítás munkája csak gyakori folyamatnál térül meg, és egy pilotban csak így lesz elég eset ahhoz, hogy bármit mérni tudj.

### 2. Strukturálatlan bemenet

E-mailek, PDF-ek, szkennelt iratok, szabad szöveg, beszélgetésről készült jegyzetek. Ez az a pont, ahol ma egy ember olvas, megért és átvezet valamit egy másik rendszerbe. Az AI itt tud igazán segíteni.

### 3. Ellenőrizhető kimenet

Az eredményt egy ember másodpercek alatt ellenőrizni tudja, mielőtt hatása lenne: egy előre kitöltött űrlapot, egy válaszvázlatot, egy besorolást. Ha az ellenőrzés tovább tart, mint maga a munka, vagy ha az eredmény úgy hat, hogy senki sem néz rá, akkor az a folyamat nem jó kezdet.

### 4. Korlátozott következményű hiba

A rosszul besorolt ticketet valaki átteszi a helyére. A hibás átutalással ez nem megy. Az első folyamat olyan legyen, ahol a hiba bosszantó, de nem drága.

### 5. Mérhető kiinduló érték

Ma is tudod, mennyi ideig tart a folyamat, és milyen gyakran okoz visszakérdezést vagy hibát. Ha nem tudod, két hét alatt meg tudod mérni. Kiinduló érték nélkül a pilot semmit sem tud bizonyítani.

Az a folyamat, amely mind az öt szempontnak megfelel, jó kezdet. Ötből négy sokszor elég. Ha viszont az ellenőrizhető kimenet vagy a hiba korlátozott következménye hiányzik, akkor az nem első folyamat, hanem második vagy harmadik.

## Jó és rossz első jelöltek

**Jó első jelöltek:**

- A bejövő megkeresések elolvasása és besorolása, majd továbbítása az illetékes munkatársnak, válaszvázlattal együtt.
- Meghatározott mezők kiolvasása dokumentumokból (szállítólevelek, szerződések, pályázati anyagok), és előtöltése ellenőrzésre.
- Belső kérdések megválaszolása a saját dokumentációból, forrásmegjelöléssel, a munkatársaknak.
- Beszélgetésről készült jegyzetek vagy beszámolók összefoglalása, rögzített szerkezetbe rendezve.

**Rossz első jelöltek:**

- Minden, ami emberi jóváhagyás nélkül fizetést indít vagy szerződést köt.
- Emberekről szóló döntések: jelentkezők kiválasztása, hitelképesség, teljesítményértékelés. Ezek az esetek várhatóan az AI-rendelet magas kockázatú szabályai alá esnek. Jogi vizsgálat kell hozzájuk, mielőtt a technikáról egyáltalán szó esne.
- Olyan folyamatok, amelyeknek a tudása nincs leírva. Itt az első lépés a dokumentálás.
- Olyan folyamatok, amelyeknek a cégen belül nincs gazdája.

## Hogyan néz ki valójában egy AI audit?

Sok szolgáltató „AI auditot”, „AI potenciálelemzést” vagy „AI folyamatoptimalizálást” árul, ami a gyakorlatban egy workshop, diákkal. Ami ebből hasznos, az nem látványos: egy lista a folyamataidról a fenti öt szempont szerint. Megfigyelésből áll össze, és beszélgetésekből azokkal, akik a munkát végzik. A végén két vagy három jelölt marad, indoklással arról, miért ezek kerülnek sorra először. Mellette egy másik lista azokról a folyamatokról, amelyeket jobb hagyományosan automatizálni, vagy sehogy.

Amit ehhez a termékmunkából hozok: az Instructure-nél az AI-funkciókat nem az alapján választottuk ki, hogy mi volt technikailag lenyűgöző. A felhasználók feladataiból indultunk ki, például „megírni egy vázlatot”, „kiemelni a legfontosabb pontokat”, „az adatokból levezetni egy teendőt”. Minden funkció az első naptól kapott jelölést, szerkeszthető kimenetet és visszautat. Egy cég folyamatautomatizálására ugyanez érvényes: a kiválasztás feladatok szerint történik, és ugyanazok a korlátok kellenek. Részletek: [Instructure esettanulmány](/hu/munka/instructure).

Egy jó AI tanácsadás tehát nem azzal kezdődik, hogy mit tud az AI, hanem azzal, hogy mi történik nálad egy átlagos kedden.

## A jelölttől a pilotig hat lépésben

1. **Figyeld meg a folyamatot.** Két hétig nézni és mérni kell: időtartam, bemenetek, kimenetek, hibák, visszakérdezések.
2. **Húzd meg a határokat.** Mit javasol az AI, mit hagy jóvá az ember, és mihez nem nyúl az AI. Milyen adatokat láthat.
3. **Készíts prototípust valódi, anonimizált esetekkel.** Egy munkafelület, ahol legalább három, legfeljebb öt munkatárs szerkesztheti és elvetheti a javaslatokat, még integráció nélkül.
4. **Csak annyi integrációt építs, amennyi kell.** A pilothoz sokszor elég egy olyan kapcsolat, amely olvas, de nem ír. Az író integráció akkor jön, amikor a pilot már bizonyított valamit.
5. **Indíts pilotot felelőssel és méréssel.** Időtartam folyamatonként a kiinduló értékhez képest, az átírt javaslatok aránya, a munkatársak visszajelzései.
6. **Dönts számok alapján.** Kiterjeszted, átalakítod vagy leállítod, és az eredményt dokumentálod.

A hat lépés sorrendje számít. Az eszköz kiválasztása a végére marad, a megfigyelés pedig nem hagyható ki, mert abból lesz a kiinduló érték, amelyhez a pilotot méred.

## Mit jelent az AI-rendelet a folyamatautomatizálásra nézve

A legtöbb belső automatizálás, amely dokumentumokat rendez vagy vázlatokat ír, az EU AI-rendelete szerint korlátozott vagy minimális kockázatú rendszer. Két dologra mégis figyelni kell. Ha az AI ügyfelekkel lép kapcsolatba, az 50. cikk szerinti jelölési kötelezettség 2026. augusztus 2. óta alkalmazandó. Erről az esetről külön cikk szól: [AI ügyfélszolgálat emberi ellenőrzéssel](/hu/irasok/ai-ugyfelszolgalat-emberi-ellenorzessel). Ha az AI emberekről szóló döntéseket készít elő, például jelentkezések elbírálásánál, akkor várhatóan a magas kockázatú rendszerekre vonatkozó kötelezettségek érvényesek, amelyek alkalmazását a 2026-os Digital Omnibus 2027. december 2-ra halasztotta.

Az általános adatvédelmi rendelet (GDPR) emellett változatlanul érvényes. A jogalap az (EU) 2024/1689 rendelet (forrás: [EUR-Lex, (EU) 2024/1689 rendelet](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), lekérve 2026. október 22-én). Ez egy termékcsapat olvasata, nem jogi tanácsadás.

## Összegzés

Az AI automatizálás ritkán a technikán bukik el, és gyakran azon, hogy rossz folyamattal indul. Az első folyamat legyen gyakori, strukturálatlan bemenetű, ellenőrizhető kimenetű, olcsón javítható hibájú és mérhető. Amit szabályként le tudsz írni, azt automatizáld hagyományosan. A módszer többi lépését az [AI tanácsadás, automatizálás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) oldalon írom le. Ha megnevezel három folyamatot, amely a cégednél viszi az időt, egy beszélgetésben megmondom, melyik felel meg az öt szempontnak, és melyiket jobb hagyományosan automatizálni: [kapcsolat](/hu/kapcsolat).

## Gyakori kérdések

### Milyen folyamatokat lehet AI-val automatizálni?

Azokat, amelyeknél ma egy ember strukturálatlan bemenetet olvas, megért és átvezet: megkeresések besorolása, dokumentumok kiolvasása, szövegek összefoglalása, kérdések megválaszolása a dokumentációból. A rögzített szabályokat követő, strukturált adatokkal dolgozó folyamatokhoz nem kell AI.

### Ugyanaz az automatizálás és az AI?

Nem. A hagyományos automatizálás leírt szabályokat hajt végre, és determinisztikus. Az AI olyan adatokban ismer fel mintákat, amelyekre nem lehet szabályt írni, és az eredményeit ellenőrizni kell. A legtöbb jó megoldás a kettőt együtt használja: az AI megérti a bemenetet, a hagyományos automatizálás elvégzi a többit.

### Kell hozzá n8n, Make vagy más platform?

A prototípushoz és a pilothoz gyakran igen, mert gyorsak. Az eszköz kiválasztása viszont az utolsó lépés, nem az első. Előbb a folyamat, aztán a határok, és csak utána az eszköz.

### Mennyibe kerül az AI automatizálás?

Ez a folyamatok számától, az adatok állapotától, az integrációtól és az ellenőrzés mértékétől függ. Fix árat nem mondok, mert minden megbízás egyedi munka. Az ár a megfigyelési szakasz után derül ki.

### Mi az az AI audit?

Hasznos értelemben a folyamataid felmérése gyakoriság, bemenet, ellenőrizhetőség, a hiba következményei és mérhetőség szerint. A végén ajánlást kapsz arról, mivel kezdj, és mit hagyj. Kevésbé hasznos értelemben egy előadás arról, mi mindent tud az AI.

### Mivel kezdjem az AI automatizálást a cégemnél?

Egyetlen folyamattal, amelyet két hétig megfigyelsz és megmérsz. Válassz olyat, amely gyakran fut, szabad szöveggel vagy dokumentumokkal dolgozik, és amelynek az eredményét egy munkatárs másodpercek alatt ellenőrizni tudja. Fizetést indító vagy emberekről döntő folyamattal ne kezdj.
