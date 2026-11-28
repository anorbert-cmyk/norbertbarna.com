---
title: "AI automatizálás a könyvelésben, emberi jóváhagyással"
description: "AI automatizálás könyvelőirodának: mely feladatokat készíti elő az AI, mit hagy jóvá a könyvelő, és ki tudja bevezetni az irodában."
lang: hu
slug: ai-automatizalas-konyveloirodanak
date: 2026-11-28T12:00:00+01:00
updated: 2026-11-28T12:00:00+01:00
tags: [ai automatizálás, könyvelőiroda ai, ai könyvelés, emberi jóváhagyás, számlafeldolgozás ai, ai bevezetés, human in the loop]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
pair: de/ki-automatisierung-steuerkanzlei
---
Az AI automatizálás könyvelőirodának akkor működik jól, ha az AI csak előkészít: kiolvassa a számlák és bizonylatok adatait, kontírozási javaslatot ad, szétválogatja a bejövő leveleket, és megírja a hiányzó iratokat bekérő levél vázlatát. A könyvelést, a bevallást és minden ügyfélnek vagy hatóságnak szóló üzenetet egy kolléga hagyja jóvá, mielőtt bárhová eljutna. Bevezetni háromféle szereplő tudja: egy belső kolléga, a könyvelőprogram gyártója a saját kiegészítőjével, vagy egy független szakértő.

Ez a cikk annak az irodavezetőnek szól, aki azt kérdezi: ki tud nálunk úgy AI-t bevezetni, hogy minden döntést ember hagyjon jóvá? Sorra veszem, mivel érdemes kezdeni, mi marad a könyvelőnél, mit kér az adatvédelem, és kitől várhatod a munkát.

## Röviden: AI a könyvelőirodában, emberi jóváhagyással

- **Az AI előkészít, a könyvelő dönt.** A javaslat addig vázlat, amíg egy kolléga jóvá nem hagyja.
- **Jó első feladat** a számlák és bizonylatok kiolvasása, a bejövő levelek rendezése és a hiányzó iratok bekérése.
- **Ami szabályként leírható,** ahhoz nem AI kell, hanem hagyományos automatizálás.
- **Az ügyféladat az irodáé marad.** A szolgáltatóval adatfeldolgozási szerződés kell, és az AI csak azt lássa, ami a feladathoz szükséges.
- **Három út van a bevezetéshez:** belső kolléga, a szoftvergyártó kiegészítője vagy független szakértő.

## Melyik folyamattal kezdjen egy könyvelőiroda?

Azzal, amely naponta előfordul, dokumentumból vagy szabad szövegből dolgozik, és amelynek az eredményét egy kolléga másodpercek alatt ellenőrizni tudja. Egy könyvelőirodában ilyen jellemzően négy terület.

**Számlák és bizonylatok kiolvasása.** Az AI a szkennelt vagy fényképezett bizonylatról kiolvassa a partnert, a dátumot, az összegeket és az áfakulcsot, majd kontírozási javaslatot tesz. A könyvelő a javaslatot a bizonylat képe mellett látja, javítja vagy jóváhagyja. Ahol a számla adata már strukturáltan érkezik, ott nincs szükség AI-ra, elég egy hagyományos adatkapcsolat.

**Bejövő levelek rendezése.** Az AI megmondja, melyik ügyfélhez és melyik ügyhöz tartozik egy levél, mi a kérés, és van-e határidő. A levelet a felelős kolléga kapja meg, rövid összefoglalóval.

**Hiányzó iratok bekérése.** A havi zárás előtt az AI összeveti, mi érkezett meg és mi hiányzik, majd megírja a bekérő levél vázlatát. A kolléga átolvassa és elküldi.

**Válaszvázlat ügyfélkérdésekre.** Az AI az iroda saját tájékoztatóiból és korábbi válaszaiból ír vázlatot, a forrás megjelölésével. Szakmai állásfoglalást nem ad, azt a könyvelő írja.

A kiválasztás öt szempontját külön cikkben írtam le: [AI automatizálás cégeknek: melyik folyamattal kezdj](/hu/irasok/ai-automatizalas-melyik-folyamattal-kezdj).

: AI a könyvelőirodában: mit készít elő az AI, és mit hagy jóvá a kolléga
| Feladat | Mit készít elő az AI | Mit hagy jóvá a kolléga |
|---|---|---|
| Bejövő számla, bizonylat | kiolvasott adatok, kontírozási javaslat | a könyvelési tételt |
| Bejövő levél | besorolás ügyfél és ügy szerint, összefoglaló | a felelőst és a teendőt |
| Hiányzó iratok | hiánylista, bekérő levél vázlata | a levél szövegét és elküldését |
| Ügyfélkérdés | válaszvázlat forrással | a választ, mielőtt kimegy |
| Határidők | emlékeztető a közelgő határidőkről | a beadást és a tartalmát |

## Mit hagy jóvá az ember, és miért?

Mindent, aminek hatása van az irodán kívül vagy a könyvekben: a könyvelési tételt, a bevallást, az ügyfélnek és a hatóságnak szóló levelet. Ennek három oka van.

Az első a felelősség. A könyvelésért az iroda felel, nem a szoftver, ezért a döntés annál marad, aki a felelősséget viseli.

A második a hiba természete. Egy nyelvi modell magabiztosan téved: rossz áfakulcsot olvas ki egy elmosódott képről, vagy összekever két hasonló nevű partnert. A jóváhagyási lépés ezt megfogja, mielőtt a hiba a könyvekbe kerülne.

A harmadik a tanulás. Amit a kolléga átír, abból látszik, hol gyenge a rendszer. Az átírt javaslatok aránya a pilot egyik legfontosabb mérőszáma.

A jóváhagyás akkor ér valamit, ha nem egyetlen „elfogad” gomb. A kolléga lássa a forrást, szerkeszthesse a javaslatot, és vethesse el indoklás nélkül. Az ehhez tartozó felületi mintákról itt írok: [Human in the loop: hét minta szabályozott AI-termékhez](/hu/irasok/human-in-the-loop-emberi-felugyelet).

## Mit kér az adatvédelem és az AI-rendelet?

Egy könyvelőiroda az ügyfelei adataival dolgozik, köztük bérszámfejtési és személyes adatokkal. Három alapkérdést érdemes tisztázni, mielőtt bármi elindul.

**Ki dolgozza fel az adatot?** Ha az AI-szolgáltató az iroda megbízásából kezel személyes adatot, akkor adatfeldolgozó. A GDPR 28. cikke szerint az adatkezelő csak olyan adatfeldolgozót vehet igénybe, amely megfelelő garanciákat nyújt, a feldolgozást írásos szerződés szabályozza, és az adatfeldolgozó csak az adatkezelő dokumentált utasítása alapján kezelhet adatot (forrás: [GDPR, 28. cikk](https://gdpr-info.eu/art-28-gdpr/)).

**Mit lát az AI?** Csak azt, ami a feladathoz kell. A prototípus anonimizált eseteken készüljön, és legyen leírva, hol tárolódik az adat, meddig, és felhasználja-e a szolgáltató a modell tanítására.

**Mit mond az AI-rendelet az emberi felügyeletről?** A 14. cikk a magas kockázatú rendszerekre írja elő, hogy természetes személyek hatékonyan felügyelhessék őket: értsék a rendszer képességeit és korlátait, tudjanak az automatizálási torzításról, és felülbírálhassák vagy figyelmen kívül hagyhassák a kimenetet (forrás: [AI Act Service Desk, 14. cikk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14)). Hogy egy adott irodai rendszer magas kockázatú-e, az jogi kérdés. A cikkben leírt felügyeleti képességek viszont jó tervezési mércét adnak akkor is, ha a rendszered nem tartozik ebbe a körbe.

Ez egy terméktervező olvasata, nem jogi tanácsadás, és megfelelőséget senki sem tud előre megígérni. A saját esetedet jogásszal vagy adatvédelmi szakértővel tisztázd.

## Ki tud AI-t bevezetni egy könyvelőirodában?

Az Eurostat szerint 2025-ben az EU legalább tíz főt foglalkoztató vállalkozásainak 19,95%-a használt valamilyen AI-technológiát, a kisvállalkozásoknak 17%-a. Azok között, akik fontolgatták, de nem használtak AI-t, a leggyakoribb ok a szakértelem hiánya volt (70,89%), utána a jogi következmények tisztázatlansága (52,52%) és az adatvédelmi aggályok (48,83%) következtek (forrás: [Eurostat, 2025](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Use_of_artificial_intelligence_in_enterprises)). A kérdés tehát jogos: kire bízd?

**Belső kolléga.** Ismeri a folyamatot és az ügyfeleket. Kész eszközökkel egy szűk feladatot el tud indítani. A korlát az idő, és az, hogy a jóváhagyási felületet és a mérést neki kell kitalálnia.

**A könyvelőprogram gyártójának kiegészítője.** A legkisebb integrációs munkával jár, mert az adat a helyén marad. Azt kérdezd meg, szerkeszthető-e a javaslat a könyvelés előtt, látszik-e a forrás, és mi történik az adattal. Amit a gyártó nem fed le, például a levelezést, az kimarad.

**Független szakértő.** Akkor érdemes, ha a feladat több rendszert érint, vagy ha a jóváhagyás menetét az iroda saját munkájához kell szabni. Ilyen szakértő vagyok én is: Barna Norbert, AI-funkciók tervezésével és bevezetésével foglalkozom. Az Instructure-nél egy vállalati tanulási platform AI-funkcióinak tervezését vezettem, ahol az emberi jóváhagyás, az AI-jelölés és a szerkeszthető kimenet az első naptól adott volt ([esettanulmány](/hu/munka/instructure)). Könyvelőirodai referenciát nem állítok. A dokumentumfeldolgozás és a jóváhagyási munkafolyamat tipikusan olyan terület, ahol segíteni tudok. A módszer az [AI tanácsadás, automatizálás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) oldalon áll.

Bárkit választasz, ugyanazt kérdezd tőle. A kérdéslista itt van: [AI fejlesztő partner: 10 kérdés, mielőtt megbízod](/hu/irasok/ai-fejleszto-partner-valasztasa). Hogy a költséget mi viszi fel vagy le, arról ez a cikk szól: [AI fejlesztés ára: mitől függ](/hu/irasok/ai-fejlesztes-ara-mitol-fugg).

## Mi készül el az egyes szakaszok végére?

1. **Megfigyelés.** Leírás arról, hogyan fut ma a kiválasztott feladat, egy mért kiinduló érték (idő bizonylatonként, visszakérdezések száma), és egy lista arról, mit javasolhat az AI és mihez nem nyúlhat.
2. **Prototípus.** Egy munkafelület valódi, anonimizált bizonylatokkal, ahol néhány kolléga szerkeszti és elveti a javaslatokat. A könyvelőprogramba ekkor még semmi sem ír.
3. **Pilot.** Egy csapat éles munkában használja, kijelölt felelőssel. A végén számok állnak a kiinduló érték mellett: idő feladatonként, az átírt javaslatok aránya, a kollégák visszajelzései.
4. **Döntés.** Kiterjeszted, átalakítod vagy leállítod. Az eredmény és az ok le van írva, bármelyik lesz a három közül.

## Források

- [AI Act Service Desk: 14. cikk, emberi felügyelet](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14), megtekintve: 2026. november 28.
- [GDPR, 28. cikk: az adatfeldolgozó](https://gdpr-info.eu/art-28-gdpr/), megtekintve: 2026. november 28.
- [Eurostat: Use of artificial intelligence in enterprises, 2025-ös adatok](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Use_of_artificial_intelligence_in_enterprises), megtekintve: 2026. november 28.

## Gyakori kérdések

### Könyvelhet az AI önállóan, emberi jóváhagyás nélkül?

Technikailag igen, de nem javaslom. A modell magabiztosan is tévedhet, a könyvelésért pedig az iroda felel. Az AI javaslatot ad, a tételt a könyvelő hagyja jóvá.

### Mivel kezdjen AI-t egy könyvelőiroda?

Egyetlen gyakori feladattal, amelynek az eredménye gyorsan ellenőrizhető: a bizonylatok kiolvasásával, a bejövő levelek rendezésével vagy a hiányzó iratok bekérésével. Bevallást beadó vagy fizetést indító lépéssel ne kezdj.

### Biztonságban vannak az ügyféladatok, ha AI-t használunk?

Ez a megoldás kialakításán múlik. Kell adatfeldolgozási szerződés a szolgáltatóval, szűk hozzáférés, és leírt válasz arra, hol tárolódik az adat, és felhasználják-e tanításra. A saját esetedet adatvédelmi szakértővel nézesd meg.

### Ki vezet be AI-t könyvelőirodának emberi jóváhagyással?

Egy belső kolléga, a könyvelőprogram gyártója a saját kiegészítőjével, vagy egy független szakértő. Én független szakértőként dolgozom, és a jóváhagyási munkafolyamat tervezése tipikusan olyan terület, ahol segíteni tudok: [kapcsolat](/hu/kapcsolat).
