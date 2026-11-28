---
title: "AI fejlesztés ára: mitől függ, és mit kérdezz előtte"
description: "AI fejlesztés ára: nyolc tényező, amely drágítja vagy olcsóbbá teszi, a szakaszolás, két ajánlat összevetése és a futó költségek."
lang: hu
slug: ai-fejlesztes-ara-mitol-fugg
date: 2026-11-27T23:30:00+01:00
updated: 2026-11-28T12:00:00+01:00
tags: [ai fejlesztés, ai integráció, ai fejlesztés ára, ai bevezetés, ai tanácsadás, ai automatizálás]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
cover: /assets/images/og/writing/ai-integration-cost.jpg
cover_alt: Hajtogatott papírból készült erdőzöld mérleg lila háttér előtt, az egyik serpenyőben három egymásra rakott olajzöld papírhasáb, a másikban egy nagyobb zöld hasáb: mitől függ az AI fejlesztés ára
pair: [en/what-ai-integration-cost-depends-on, de/ki-beratung-kosten]
---
Az AI fejlesztés ára elsősorban nem a modelltől függ, hanem attól, mekkora folyamatot érint, milyen állapotban vannak az adataid, hány rendszerhez kell kapcsolódni, és mennyi ellenőrzés kell ahhoz, hogy az eredményben meg lehessen bízni. Ugyanaz a modell egy válaszvázlatot író belső eszközben és egy ügyfelekkel beszélő, több rendszerbe író megoldásban egészen más munkát jelent. Az indulás után futó költségek is vannak: a modellhasználat, a figyelés és a források karbantartása.

Ebben a cikkben nem írok számokat, mert minden AI fejlesztés és AI integráció egyedi munka, és egy szám feladat nélkül félrevezet. Nyolc tényezőt veszek sorra, utána leírom, hogyan bontható szakaszokra a munka, hogyan vess össze két ajánlatot, és mely futó költségek maradnak ki sok ajánlatból.

## Röviden: mitől függ az AI fejlesztés ára

- **Nyolc tényező mozgatja az árat:** a folyamat terjedelme, az adatok állapota, az integrációk, az emberi ellenőrzés szintje, a kiértékelés, a kockázat és a szabályozás, a nyelvek száma, és az, hogy ki tartja karban a megoldást.
- **A modell a kisebb tétel:** a munka nagy része tervezés, adat-előkészítés, integráció, ellenőrző felület és kiértékelés, nem a modell bekötése.
- **Így indulsz a legkisebb kiadással:** egyetlen szűk folyamat, rendezett források, és olyan kapcsolat, amely csak olvas a rendszereidből.
- **Négy szakasz, négy döntési pont:** felmérés, prototípus, pilot, bevezetés és átadás. Mindegyik végén dönthetsz, hogy folytatod-e.
- **Három futó költség marad az indulás után:** a modellhasználat, a monitorozás és a források karbantartása. Ehhez jön a jóváhagyó kolléga munkaideje.
- **Szabály két ajánlat összevetéséhez:** ha az egyikből hiányzik a kiértékelés, az emberi ellenőrzés vagy a hibaágak kezelése, akkor az nem olcsóbb, hanem kisebb munkát áraz.

## Mitől függ az AI fejlesztés ára? Nyolc tényező

### 1. A folyamat terjedelme

A folyamat terjedelme azt jelenti, hány lépést, embert és döntést érint a megoldás, és hány kivétel fordul elő benne. Egy lépés, például a beérkező megkeresések besorolása, jól körülhatárolható. Egy több lépésből álló, önállóan cselekvő ügynök minden lépésnél új hibalehetőséget hoz, és mindegyiket meg kell tervezni és tesztelni kell. A rendhagyó esetek felismerése és biztonságos kezelése sokszor több munka, mint a főág.

### 2. Az adatok állapota

Rendezett, elérhető és naprakész forrásból gyorsabban lesz megbízható eredmény, mint szétszórt, szkennelt vagy egymásnak ellentmondó dokumentumokból. Ha a tudás csak a kollégák fejében van meg, az első feladat a leírása, és ez nem AI-munka, de nélküle nincs mire építeni. Ezen a tényezőn te magad tudsz a legtöbbet javítani, még az ajánlatkérés előtt.

### 3. Integrációk

Minden rendszer, amelyhez a megoldás kapcsolódik (CRM, levelezés, számlázó, belső adatbázis), saját jogosultságkezelést és saját hibaeseteket hoz. Nagy a különbség az olvasó és az író kapcsolat között. Ha az AI csak olvas, egy hiba rossz javaslatot eredményez. Ha ír is, a hiba bekerül a rendszeredbe, ezért visszaállítás, naplózás és jóváhagyási lépés kell hozzá. A dokumentált interfész nélküli, régi rendszerek tovább drágítanak.

### 4. Az emberi ellenőrzés szintje

Az emberi ellenőrzés szintje azt rögzíti, mit javasolhat az AI, mit hagy jóvá ember, és mi történik bizonytalan vagy hiányzó válasznál. Ez felület is: szerkeszthető kimenet, forrásmegjelölés, elvetés, átadás embernek. Az ellenőrző felület pénzbe kerül, de e nélkül a megoldás nem futhat élesben. A mintákat külön cikkben írtam le: [Human in the loop: hét minta](/hu/irasok/human-in-the-loop-emberi-felugyelet).

### 5. Kiértékelés

A kiértékelés az a munka, amellyel bizonyítható, hogy a megoldás jól működik: valódi esetekből összeállított példakészlet, elfogadási feltételek és mérés a kiinduló állapothoz képest. Minél drágább egy hiba, annál több példa és annál szigorúbb küszöb kell. Az az ajánlat, amelyben nincs kiértékelés, olcsóbbnak látszik, de a minőség kérdését az éles működésre hagyja, amikor a javítás a legdrágább.

### 6. Kockázat és szabályozás

Személyes, egészségügyi vagy pénzügyi adatoknál több tervezés, jogosultságkezelés, naplózás és egyeztetés kell a jogásszal vagy az adatvédelmi felelőssel. Ha az AI ügyfelekkel beszél, a jelölés is feladat, erről az [AI Act jelölési kötelezettségéről szóló cikkben](/hu/irasok/ai-act-jelolesi-kotelezettseg) írok. Ha emberekről szóló döntést készít elő, a jogi vizsgálat megelőzi a technikát. Ez tervezési szempont, nem jogi tanácsadás.

### 7. Nyelvek

Minden nyelv külön tesztelést jelent, mert egy modell minősége nyelvenként eltérhet, és a szakszavakat, a megszólítást és a hangnemet nyelvenként kell ellenőrizni. A magyar és a német anyagokhoz olyan ellenőr kell, aki a nyelvet és a szakterületet is ismeri.

### 8. Ki tartja karban az indulás után

Egy AI-megoldás az indulás után is változik: frissülnek a források, a szolgáltató lecseréli a modellverziót, új kivételek jelennek meg. Ha a csapatod átveszi a működtetést, ahhoz dokumentáció, működtetési útmutató és betanítás kell az átadáskor. Ha külső partner tartja karban, az folyamatos tétel. A legdrágább változat az, amikor a megoldásnak nincs gazdája.

: AI fejlesztés ára: nyolc tényező, és mi viszi lefelé vagy felfelé a költséget
| Tényező | Mitől olcsóbb | Mitől drágább |
|---|---|---|
| A folyamat terjedelme | egy lépés, kevés kivétel | több lépés, önálló cselekvés, sok kivétel |
| Az adatok állapota | rendezett, elérhető, leírt tudás | szétszórt, szkennelt, ellentmondó források |
| Integrációk | egy rendszer, csak olvasás | több rendszer, írás, régi interfész |
| Emberi ellenőrzés | belső használat, gyors jóváhagyás | ügyfél felé menő vagy nehezen javítható kimenet |
| Kiértékelés | olcsón javítható hiba, kis példakészlet | drága hiba, szigorú elfogadási feltételek |
| Kockázat és szabályozás | nincs személyes vagy érzékeny adat | egészségügyi, pénzügyi adat, emberekről szóló döntés |
| Nyelvek | egy nyelv | több nyelv, nyelvenkénti tesztelés |
| Karbantartás | kijelölt belső gazda, átadott útmutató | nincs gazda, gyakran változó források |

A táblázat a saját szerkesztett tapasztalatom, nem piaci adat.

## Hogyan bontható szakaszokra egy AI integráció költsége?

Egy AI integráció költsége szakaszolható, és minden szakasz végén dönthetsz a folytatásról.

1. **Felmérés.** A munkát végző emberekkel végigvesszük a bemeneteket, az átadásokat, a döntéseket és a hibák következményeit. Az eredmény egy körülhatárolt probléma és egy kiinduló érték, amelyhez később mérni lehet. A felmérés önmagában is döntést ad arról, megéri-e továbbmenni, és arról is, hogy kell-e egyáltalán AI. Hogy melyik folyamattal érdemes kezdeni, azt az [AI automatizálás: melyik folyamattal kezdj](/hu/irasok/ai-automatizalas-melyik-folyamattal-kezdj) cikk írja le.
2. **Prototípus.** Jóváhagyott, valódi példákkal készül, integráció nélkül, a leendő felhasználók bevonásával. Itt derül ki olcsón, hogy az adatok és a modell együtt elég jó eredményt adnak-e.
3. **Pilot.** Körülhatárolt felhasználói körrel, a szükséges legkevesebb integrációval, kijelölt felelőssel fut, aki le is állíthatja. A pilot alatt mérjük a működési költséget is, így a szélesebb bevezetés előtt már tény, nem becslés.
4. **Bevezetés és átadás.** A javítások, a dokumentáció és a működtetés felelőseinek kijelölése után jön a szélesebb kör.

A lépéseket az [AI tanácsadás, automatizálás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) oldalon részletezem, a kkv-knak szóló menetrendet az [AI bevezetése KKV-nál: az első 90 nap](/hu/irasok/ai-bevezetese-kkv-elso-90-nap) cikkben.

## Mi készül el az egyes szakaszok végére, és ki dolgozik rajta?

A felmérés végén körülhatárolt probléma és kiinduló érték van, ehhez a folyamatot végző munkatársak és a folyamat gazdája kell. A prototípus végén valódi példákon kipróbált munkafelület van, még integráció nélkül, és a leendő felhasználók mondanak róla véleményt. A pilot végén mért eredmény és mért működési költség van, egy kijelölt felelőssel, aki le is állíthatta volna. Az átadás végén a tiéd a kód, a promptok, az értékelési példák és a működtetési útmutató. A te oldaladon végig három ember idejével számolj: a folyamat gazdájáéval, egy vagy két munkatárséval, aki a munkát ma végzi, és azéval, aki a rendszerekhez hozzáférést ad.

## Mennyi ideig tart egy AI fejlesztés?

Az időtartam ugyanattól a nyolc tényezőtől függ, mint az ár, ezért heteket feladat nélkül ugyanúgy nem lehet mondani, mint összeget. Három dolog nyújtja meg leggyakrabban: a rendszerekhez való hozzáférés jóváhagyása, a szétszórt források rendbetétele és a jogi egyeztetés. Egy nagykereskedésnél, ahol a rendelések e-mailben érkeznek és a cikktörzs rendezett, a prototípus gyorsan eljut a pilotig. Egy biztosítási alkusznál, ahol ügyféladat és több biztosító rendszere érintett, a hozzáférés és az adatkezelés tisztázása viszi az idő nagyobb részét.

## Egy példa: mi volt a munka az Instructure AI-funkcióiban

Az Instructure-nél egy tanulási platform AI-funkcióinak tervezését vezettem. A védőkorlátokat az első napon rögzítettük: emberi ellenőrzés, egyértelmű AI-jelölés, szerkeszthető kimenetek, forrásjelzések és helyreállítási utak. A folyamatokat a jogi, a megfelelőségi és a data science csapattal közösen néztük át, és mértük a használatba vételt és a feladatok befejezését.

Az ár szempontjából két tanulság van. Az egyik: a felsorolt tételek mind tervezési, fejlesztési és egyeztetési munkát jelentenek, és egyik sem maga a modell. A másik: a megoldásokat újrahasznosítható mintákba foglaltuk (promptok, ellenőrzési állapotok, megerősítések, visszajelzési körök), így a következő funkció kész mintákra épülhetett. Egy cégnél ugyanez igaz: az első folyamat viseli az alapok költségét, a második már épít rájuk. A részletek az [Instructure esettanulmányban](/hu/munka/instructure) olvashatók.

## Hogyan hasonlíts össze két AI fejlesztési ajánlatot?

Két AI fejlesztési ajánlat akkor hasonlítható össze, ha ugyanazt a terjedelmet árazza. Ezeket nézd meg mindkettőben:

- **Terjedelem:** melyik folyamatot, hány lépést és milyen kivételeket fed le, és mi marad ki kifejezetten.
- **Adat-előkészítés:** ki rendezi a forrásokat, és benne van-e az árban.
- **Integráció:** mely rendszerekhez kapcsolódik, olvas vagy ír is, és mi történik, ha egy rendszer nem válaszol.
- **Ellenőrzés:** van-e jóváhagyási felület, szerkesztés, átadás embernek.
- **Kiértékelés:** milyen példákon és milyen elfogadási feltételekkel mérik, és ki mondja ki, hogy kész.
- **Futó költség:** ki fizeti a modellhasználatot, és mi a becslés alapja.
- **Átadás:** kié a kód, a promptok és az értékelési példák, és van-e működtetési útmutató.
- **Megállási pont:** ki lehet-e szállni a felmérés vagy a prototípus után úgy, hogy az addigi eredmény használható.

Ha az egyik ajánlatból hiányzik a kiértékelés, az emberi ellenőrzés vagy a hibaágak kezelése, akkor nem olcsóbb, hanem kisebb munkát áraz.

## Milyen futó költségei vannak egy AI-megoldásnak indulás után?

Egy AI-megoldás futó költsége három tételből áll, és mindhárom a használattal együtt nő.

- **Modellhasználat.** A szolgáltató a feldolgozott szöveg mennyisége után számláz. A költség függ az esetek számától, a bemenetek hosszától, a választott modelltől, és attól, hány modellhívás kell egy feladathoz.
- **Monitorozás.** Valakinek rendszeresen mintát kell vennie a kimenetekből, figyelnie a hibákat és a visszajelzéseket, és modellcsere után újra le kell futtatnia az értékelési példákat.
- **A források karbantartása.** Ha változik egy ár, egy szabályzat vagy egy termékleírás, a tudásbázist frissíteni kell, különben a megoldás magabiztosan ad elavult választ. Ügyfélszolgálatnál ez különösen számít, erről az [AI ügyfélszolgálat emberi ellenőrzéssel](/hu/irasok/ai-ugyfelszolgalat-emberi-ellenorzessel) cikk szól.

Számolj az ellenőrzésre fordított munkaidővel is: a jóváhagyó kolléga ideje költség, amelyet a megtérülésnél szembe kell állítani a megtakarított idővel.

## Összegzés

Az AI fejlesztés ára a feladat következménye. A folyamat terjedelme, az adatok állapota, az integrációk, az ellenőrzés és a kiértékelés szintje, a kockázat, a nyelvek és a karbantartás együtt határozza meg, és a legtöbbet az adatok rendbetételével és egy szűk első folyamattal tudsz spórolni. Ha leírod a folyamatot, az érintett rendszereket és azt, mi számítana sikernek, [küldd el](/hu/kapcsolat), és megmondom, melyik szakasszal érdemes kezdeni.

## Források

- [Az Európai Parlament és a Tanács (EU) 2024/1689 rendelete (AI-rendelet), 50. cikk: átláthatósági kötelezettségek, ha az AI-rendszer természetes személyekkel lép kapcsolatba](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), EUR-Lex, az Európai Unió Hivatalos Lapja, 2024. június 13., lekérve 2026. november 28-án

## Gyakori kérdések

### Mennyibe kerül egy AI fejlesztés egy cégnek?

Az AI fejlesztés ára a folyamat terjedelmétől, az adatok állapotától, az integrációk számától, az emberi ellenőrzés és a kiértékelés szintjétől, a kockázattól, a nyelvektől és a karbantartástól függ. Fix árat nem mondok, mert minden megbízás egyedi munka. Pontos ajánlatot a felmérés után lehet adni.

### Mi a különbség az AI integráció és az egyedi AI fejlesztés ára között?

Az AI integráció egy meglévő modellt köt be a folyamataidba és a rendszereidbe, az egyedi AI fejlesztés saját felületet, logikát vagy modellt is épít. Az integráció általában kisebb munka, de az adatok, az ellenőrzés és a kiértékelés költsége mindkettőnél megjelenik.

### Hogyan lehet olcsóbban elkezdeni az AI bevezetést?

Egyetlen, szűk folyamattal, rendezett forrásokkal és olyan kapcsolattal, amely csak olvas. A felmérés és a prototípus kis kiadással megmutatja, megéri-e a pilot.

### Miért tér el ennyire két AI fejlesztési ajánlat?

Mert ritkán árazzák ugyanazt a munkát. Az egyik egy modell bekötését tartalmazza, a másik az adat-előkészítést, az ellenőrző felületet, a kiértékelést és az átadást is. Kérd, hogy mindkettő tételesen írja le, mi van benne, és mi nincs.

### Mennyi a havi költsége egy AI-megoldásnak?

A havi költség a modellhasználatból, a monitorozásból, a források karbantartásából és az ellenőrzésre fordított munkaidőből áll. A nagysága a használat mennyiségétől és a választott modelltől függ, ezért a pilot alatt érdemes megmérni.
