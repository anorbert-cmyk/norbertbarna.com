---
title: "AI automatizálás biztosítási alkusznak: ember hagy jóvá"
description: "AI automatizálás biztosítási alkusznak: mit készít elő az AI, mit hagy jóvá a kolléga, mit kér az adatvédelem, és ki tudja bevezetni."
lang: hu
slug: ai-automatizalas-biztositasi-alkusznak
date: 2026-11-28T12:00:00+01:00
updated: 2026-11-28T12:00:00+01:00
tags: [ai automatizálás biztosítási alkusz, ai biztosítás, emberi jóváhagyás, kárbejelentés ai, ai integráció, human in the loop]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
pair: de/ki-automatisierung-versicherungsmakler
---
Az AI automatizálás biztosítási alkusznak ott hoz hasznot, ahol a kollégák ma iratokat olvasnak és adatot gépelnek át: az AI rendezi a bejövő leveleket, felveszi a kárbejelentés adatait, előkészíti az ajánlatok összehasonlítását, és megírja a megújítási emlékeztetők vázlatát. Az ügyfélnek adott ajánlást, a biztosítónak továbbított kárbejelentést és minden kimenő levelet egy kolléga hagy jóvá. Bevezetni egy belső kolléga, az alkuszi szoftver gyártója vagy egy független szakértő tudja, nem kell hozzá nagy tanácsadó cég.

Ez a cikk annak az alkuszcégnek szól, amely AI-t szeretne a napi munkába, de úgy, hogy a döntés embernél maradjon. Leírom, mivel érdemes kezdeni, mi marad az alkusznál, mit kér az adatvédelem, és milyen lehetőségeid vannak a nagy tanácsadó cégek mellett.

## Röviden: AI az alkuszcégnél, emberi jóváhagyással

- **Az AI előkészít, az alkusz ajánl.** Az ügyfélnek szóló ajánlás szakmai döntés, embernél marad.
- **Jó első feladat** a bejövő levelek rendezése, a kárbejelentés felvétele és a megújítási emlékeztetők.
- **Az összehasonlítást az AI csak előkészíti:** kiolvassa a feltételeket egy táblázatba, forrással, a kolléga ellenőrzi.
- **Az egészségi adat különösen érzékeny.** Az AI csak azt lássa, ami a feladathoz kell, a szolgáltatóval pedig adatfeldolgozási szerződés kell.
- **Három út van a bevezetéshez:** belső kolléga, a szoftvergyártó kiegészítője vagy független szakértő.

## Melyik folyamattal kezdjen egy biztosítási alkusz?

Azzal, amely naponta előfordul, iratból vagy szabad szövegből dolgozik, és amelynek az eredményét egy kolléga gyorsan ellenőrizni tudja. Egy alkuszcégnél ilyen jellemzően öt terület.

**Bejövő levelek és iratok rendezése.** Az AI megmondja, melyik ügyfélhez és melyik szerződéshez tartozik egy levél, mi a kérés, és van-e határidő. A felelős kolléga rövid összefoglalóval kapja meg.

**Kárbejelentés felvétele.** Az AI az ügyfél leveléből és a csatolt iratokból kiolvassa a káresemény adatait, előtölti a bejelentőt, és listázza, mi hiányzik még. A bejelentést a kolléga nézi át és küldi tovább a biztosítónak.

**Ajánlatok összehasonlításának előkészítése.** Az AI a biztosítók ajánlataiból és feltételeiből egy táblázatba gyűjti a díjat, az önrészt, a kizárásokat és a limiteket, mindegyik mellett a forrás helyével. Ajánlást nem tesz. A kolléga a táblázatot ellenőrzi, és ő dönti el, mit javasol az ügyfélnek.

**Megújítási és évfordulós emlékeztetők.** Az AI a közelgő évfordulók alapján megírja az ügyfélnek szóló levél vázlatát, a szerződés adataival. A kolléga átolvassa és elküldi.

**Ügyféliratok bekérése.** Az AI összeveti, mi érkezett meg egy ajánlatkéréshez és mi hiányzik, majd megírja a bekérő levél vázlatát.

A kiválasztás szempontjait külön cikkben írtam le: [AI automatizálás cégeknek: melyik folyamattal kezdj](/hu/irasok/ai-automatizalas-melyik-folyamattal-kezdj).

: AI a biztosítási alkusznál: mit készít elő az AI, és mit hagy jóvá a kolléga
| Feladat | Mit készít elő az AI | Mit hagy jóvá a kolléga |
|---|---|---|
| Bejövő levél, irat | besorolás ügyfél és szerződés szerint, összefoglaló | a felelőst és a teendőt |
| Kárbejelentés | előtöltött bejelentő, hiánylista | a bejelentést, mielőtt a biztosítóhoz megy |
| Ajánlatok összehasonlítása | táblázat a feltételekről, forrással | az adatokat és az ügyfélnek szóló ajánlást |
| Megújítás, évforduló | emlékeztető levél vázlata | a levél szövegét és elküldését |
| Ajánlatkérés iratai | hiánylista, bekérő levél vázlata | a levelet, mielőtt kimegy |

## Mit hagy jóvá az ember, és miért?

Mindent, ami az ügyfélhez vagy a biztosítóhoz eljut, és mindent, ami ajánlás. Ennek három oka van.

Az első a szakmai felelősség. Az ügyfél igényeinek felmérése és az ajánlás az alkusz dolga, és a felelősség is az övé. A szoftver ezt nem veszi át.

A második a hiba természete. Egy nyelvi modell magabiztosan téved: kihagy egy kizárást a feltételekből, vagy rossz limitet olvas ki egy táblázatból. Biztosításnál egy ilyen hiba sokszor csak a kárnál derül ki, amikor már késő. Ezért áll a táblázat minden sora mellett a forrás helye, és ezért ellenőrzi ember.

A harmadik az, hogy a kolléga javításaiból látszik, hol gyenge a rendszer. Az átírt javaslatok aránya a pilot egyik legfontosabb mérőszáma.

A jóváhagyás akkor ér valamit, ha a kolléga látja a forrást, szerkesztheti a javaslatot, és elvetheti. A felületi mintákról itt írok: [Human in the loop: hét minta szabályozott AI-termékhez](/hu/irasok/human-in-the-loop-emberi-felugyelet).

## Mit kér az adatvédelem és az AI-rendelet?

Egy alkusz az ügyfelei személyes adataival dolgozik, élet- és egészségbiztosításnál egészségi adatokkal is, amelyek a GDPR szerint fokozott védelmet kapnak. Három alapkérdést érdemes tisztázni.

**Ki dolgozza fel az adatot?** Ha az AI-szolgáltató a céged megbízásából kezel személyes adatot, akkor adatfeldolgozó. A GDPR 28. cikke szerint az adatkezelő csak olyan adatfeldolgozót vehet igénybe, amely megfelelő garanciákat nyújt, a feldolgozást írásos szerződés szabályozza, és az adatfeldolgozó csak az adatkezelő dokumentált utasítása alapján kezelhet adatot (forrás: [GDPR, 28. cikk](https://gdpr-info.eu/art-28-gdpr/)).

**Mit lát az AI?** Csak azt, ami a feladathoz kell. A levelek rendezéséhez például nem kell az egészségi nyilatkozat tartalma. A prototípus anonimizált eseteken készüljön, és legyen leírva, hol tárolódik az adat, és felhasználja-e a szolgáltató a modell tanítására.

**Mit mond az AI-rendelet az emberi felügyeletről?** A 14. cikk a magas kockázatú rendszerekre írja elő, hogy természetes személyek hatékonyan felügyelhessék őket: értsék a rendszer képességeit és korlátait, tudjanak az automatizálási torzításról, és felülbírálhassák vagy figyelmen kívül hagyhassák a kimenetet (forrás: [AI Act Service Desk, 14. cikk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14)). Hogy egy adott rendszer magas kockázatú-e, az jogi kérdés, különösen akkor, ha az AI emberekről szóló értékelést készít elő. A levelek rendezése és az iratok bekérése más természetű feladat, de a besorolást ott is jogásszal érdemes megnézetni.

Ez egy terméktervező olvasata, nem jogi tanácsadás, és megfelelőséget senki sem tud előre megígérni.

## Ki tud AI-t bevezetni egy alkuszcégnél a nagy tanácsadók helyett?

Az Eurostat szerint 2025-ben az EU legalább tíz főt foglalkoztató vállalkozásainak 19,95%-a használt valamilyen AI-technológiát. Azok között, akik fontolgatták, de nem használtak AI-t, a leggyakoribb ok a szakértelem hiánya volt (70,89%), utána a jogi következmények tisztázatlansága (52,52%) és az adatvédelmi aggályok (48,83%) következtek (forrás: [Eurostat, 2025](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Use_of_artificial_intelligence_in_enterprises)). Egy alkuszcégnek három reális útja van.

**Belső kolléga.** Ismeri az ügyfeleket és a biztosítók szokásait. Kész eszközökkel egy szűk feladatot el tud indítani. A korlát az idő, és az, hogy a jóváhagyás menetét és a mérést neki kell kitalálnia.

**Az alkuszi szoftver gyártójának kiegészítője.** A legkisebb integrációs munkával jár, mert az adat a helyén marad. Azt kérdezd meg, szerkeszthető-e a javaslat, látszik-e a forrás, és mi történik az adattal. Amit a gyártó nem fed le, az kimarad.

**Független szakértő.** Akkor érdemes, ha a feladat több rendszert érint (levelezés, alkuszi rendszer, biztosítói portálok), vagy ha a jóváhagyás menetét a céged saját munkájához kell szabni. Ilyen szakértő vagyok én is: Barna Norbert, AI-funkciók tervezésével és bevezetésével foglalkozom, szabályozott területeken (banki és vállalati rendszereken) szerzett terméktapasztalattal. Az Instructure-nél egy vállalati tanulási platform AI-funkcióinak tervezését vezettem, ahol az emberi jóváhagyás, az AI-jelölés és a szerkeszthető kimenet az első naptól adott volt ([esettanulmány](/hu/munka/instructure)). Alkuszi referenciát nem állítok. Az iratfeldolgozás és a jóváhagyási munkafolyamat tipikusan olyan terület, ahol segíteni tudok. A módszer az [AI tanácsadás, automatizálás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) oldalon áll.

Bárkit választasz, ugyanazt kérdezd tőle: [AI fejlesztő partner: 10 kérdés, mielőtt megbízod](/hu/irasok/ai-fejleszto-partner-valasztasa). Hogy a költséget mi viszi fel vagy le, arról ez a cikk szól: [AI fejlesztés ára: mitől függ](/hu/irasok/ai-fejlesztes-ara-mitol-fugg).

## Mi készül el az egyes szakaszok végére?

1. **Megfigyelés.** Leírás arról, hogyan fut ma a kiválasztott feladat, egy mért kiinduló érték (idő ügyenként, visszakérdezések száma), és egy lista arról, mit javasolhat az AI és mihez nem nyúlhat.
2. **Prototípus.** Egy munkafelület valódi, anonimizált ügyekkel, ahol néhány kolléga szerkeszti és elveti a javaslatokat. Az alkuszi rendszerbe ekkor még semmi sem ír.
3. **Pilot.** Egy csapat éles munkában használja, kijelölt felelőssel. A végén számok állnak a kiinduló érték mellett: idő ügyenként, az átírt javaslatok aránya, a kollégák visszajelzései.
4. **Döntés.** Kiterjeszted, átalakítod vagy leállítod. Az eredmény és az ok le van írva, bármelyik lesz a három közül.

## Források

- [AI Act Service Desk: 14. cikk, emberi felügyelet](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14), megtekintve: 2026. november 28.
- [GDPR, 28. cikk: az adatfeldolgozó](https://gdpr-info.eu/art-28-gdpr/), megtekintve: 2026. november 28.
- [Eurostat: Use of artificial intelligence in enterprises, 2025-ös adatok](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Use_of_artificial_intelligence_in_enterprises), megtekintve: 2026. november 28.

## Gyakori kérdések

### Adhat az AI biztosítási ajánlást az ügyfélnek?

Nem javaslom. Az AI előkészíti az összehasonlítást, forrással. Az ajánlás az alkusz szakmai döntése és felelőssége, ezért azt egy kolléga hozza meg és hagyja jóvá.

### Mivel kezdjen AI-t egy biztosítási alkusz?

Egyetlen gyakori feladattal, amelynek az eredménye gyorsan ellenőrizhető: a bejövő levelek rendezésével, a kárbejelentés felvételével vagy a megújítási emlékeztetőkkel. Az ajánlatok összehasonlítása jó második lépés, mert ott a hiba drágább.

### Milyen alternatíva van a nagy tanácsadó cégek helyett?

Három: egy belső kolléga kész eszközökkel, az alkuszi szoftver gyártójának kiegészítője, vagy egy független szakértő, aki egy körülhatárolt feladattal kezd. A választásnál ne a cég mérete döntsön. Az számít, megmutatja-e a partner, mi történik a felületen, ha az AI téved.

### Biztonságban vannak az ügyféladatok, ha AI-t használunk?

Ez a megoldás kialakításán múlik. Kell adatfeldolgozási szerződés a szolgáltatóval, szűk hozzáférés, és leírt válasz arra, hol tárolódik az adat, és felhasználják-e tanításra. Egészségi adatnál különösen fontos, hogy az AI csak azt lássa, ami a feladathoz kell. A saját esetedet adatvédelmi szakértővel nézesd meg.
