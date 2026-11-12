---
title: "Human in the loop: hét minta szabályozott AI-termékhez"
description: "Human in the loop a gyakorlatban: hét minta, amely kiállja a felülvizsgálatot. AI-jelölés, szerkeszthető kimenet, forrás, stop."
lang: hu
slug: human-in-the-loop-emberi-felugyelet
date: 2026-11-12T12:00:00+01:00
updated: 2026-11-12T12:00:00+01:00
tags: [human in the loop, emberi felügyelet, ai act, ai fejlesztés, ai tanácsadás]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
cover: /assets/images/og/writing/human-in-the-loop-ai.jpg
cover_alt: Hajtogatott papírszalag halad át egy papírkapun, rajta kis olajzöld ellenőrző hajtás: human in the loop, vagyis emberi ellenőrzés, mielőtt az AI kimenete hatni kezd
pair: [en/human-in-the-loop-ai, de/human-in-the-loop-ki]
---
A human in the loop azt jelenti, hogy egy ember átnézi, szerkeszti vagy jóváhagyja, amit az AI-rendszer javasol, mielőtt annak bármilyen hatása lenne, és felül is bírálhatja vagy leállíthatja a rendszert. Szabályozott termékben ez nem egy pipa a projekt végén. Felületi döntések sora, amelyeket az első napon kell meghozni: mit javasolhat az AI, mit kell embernek ellenőriznie, miből látja az ellenőrző a javaslat okát, és mi történik, ha a kimenet hibás.

Ebben a cikkben hét mintát írok le. Mind kiállta a felülvizsgálatot két termékben, amelyen dolgoztam: az egyik az Instructure tanulási platformjának AI-funkciói, a másik a SportsGambit, egy AI-alapú előrejelzési piac MVP-je. A példák ezekből a projektekből valók, a következtetések az enyémek.

## Mit jelent a human in the loop, és mit nem?

Három kifejezés forog közszájon, és mindegyik más mértékű emberi kontrollt ír le:

- **Human in the loop:** minden következménnyel járó kimenetet ember hagy jóvá, mielőtt az hatni kezd.
- **Human on the loop:** a rendszer önállóan cselekszik, az ember figyeli, és közbe tud avatkozni.
- **Human out of the loop:** teljesen automatizált működés, ellenőrzés legfeljebb utólag van.

Ezek tervezési fogalmak, nem jogi kategóriák. Szabályozott iparágban az emberi felügyelet szükséges szintje attól függ, mi a következménye egy hibás kimenetnek, nem attól, mennyire jó a modell. Egy vázlat, amelyet valaki úgyis átír, gyengébb modellt is elvisel. Egy művelet, amely eljut az ügyfélhez vagy pénzt mozgat, nem.

Három dolognak kell teljesülnie ahhoz, hogy az ember valóban a folyamat része legyen. Látja, hogy AI is részt vett a munkában. Meg tudja változtatni vagy el tudja vetni a kimenetet. A döntést pedig rögzíti a rendszer, így később visszakereshető, ki mit fogadott el, és mi alapján. Ha a háromból bármelyik hiányzik, az ember nincs benne a folyamatban. Csak nézi.

## Mit vár el az EU AI-rendelet az emberi felügyelettől

Az EU AI-rendelet (AI Act) 14. cikke szerint a magas kockázatú AI-rendszereket úgy kell megtervezni, hogy a felügyeletet ellátó emberek megértsék a rendszer képességeit és korlátait, tudatában maradjanak az automatizálási torzításnak, helyesen értelmezzék a kimenetet, dönthessenek úgy, hogy nem használják vagy felülbírálják, és le tudják állítani a rendszert egy „stop” gombbal vagy hasonló eljárással (forrás: [AI Act Service Desk, 14. cikk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14), lekérve 2026. október 21-én).

A határidőkről: az AI-ra vonatkozó Digital Omnibus (az (EU) 2026/1744 rendelet, hatályos 2026. július 27-től) a III. melléklet szerinti magas kockázatú rendszerek kötelezettségeit 2027. december 2-ra, az I. melléklet szerintiekét 2028. augusztus 2-ra tolta. Az 50. cikk átláthatósági kötelezettségei, például annak jelzése, hogy a felhasználó AI-rendszerrel lép kapcsolatba, változatlanul 2026. augusztus 2. óta alkalmazandók (források: [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/) és [National Law Review](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), lekérve 2026. október 21-én).

Ez egy terméktervező olvasata, nem jogi tanácsadás. Hogy a te rendszered magas kockázatú-e, azt jogásszal kell tisztáznod. Amit élesbe állított munkák alapján mondani tudok: a 14. cikk öt felügyeleti képessége mind megfeleltethető egy felületi döntésnek. A cikk hátralévő része ezekről a döntésekről szól.

## Hét human in the loop minta, amely kiállja a felülvizsgálatot

### 1. Jelölj meg minden AI-kimenetet

Az Instructure-nél a Canvas Catalog ökoszisztémán belül vezettem a funkciók tervezését az elejétől a végéig. Ez egy olyan termék része volt, amelyet naponta több millió ember használt. Az egyértelmű AI-jelölés itt az első napon rögzített védőkorlát volt. Minden AI-javaslathoz tartozott címke, szerkesztési állapot és visszaút, és semmi nem maradhatott láthatatlan abból, amiről a modell döntött.

Építés előtt döntsd el: mi a címke pontos szövege, hol jelenik meg, és megmarad-e azután is, hogy egy ember átszerkesztette a kimenetet.

### 2. Előbb magyarázz, aztán javasolj

Az Instructure tervezési elve így szólt: „magyarázat a javaslat előtt”. Előbb a jelzéseket és a forrásokat mutattuk meg, amelyekre a javaslat épül, és csak utána magát a javaslatot. Aki látja a miértet, az meg tudja ítélni a javaslatot. Aki csak az eredményt látja, az legfeljebb megbízni tud benne.

Döntsd el: melyik forrásjelzést tudja az ellenőrző ténylegesen megnézni annyi idő alatt, amennyi jut rá. A hivatkozás, amelyet senki sem nyit meg, díszlet.

### 3. Legyen a kimenet szerkeszthető és visszavonható

Az Instructure-nél a kimeneteket szerkeszteni és visszavonni is lehetett, és egyértelmű ellenőrzési állapotaik voltak: vázlat, ellenőrzött, közzétett. Ez a 14. cikk „nem használja, felülbírálja vagy visszafordítja” fordulatának felületi megfelelője. Az az AI-kimenet, amelyet csak elfogadni vagy elutasítani lehet, az elfogadás felé tolja az embert.

### 4. Tervezd meg azokat az állapotokat, amelyeket senki sem mutat meg a demóban

Minden termékváltozatban akadálymentes komponensállapotokat adtunk ki az üres, a betöltés alatti, a hibás és a késve érkező esetre. Egy felülvizsgálaton a hibaállapotnál kezdődnek a kérdések: mit lát az oktató, ha a modell nem ad vissza semmit, későn válaszol, vagy olyat ad vissza, amit nem lenne szabad? Ha a felület elrejti ezeket az állapotokat, az ember nem tudja ellenőrizni azt, amit nem lát.

### 5. Mutasd a bizonyossági szintet, és tarts meg egy tudatos ellenőrző lépést

A SportsGambit egy előrejelzési piac MVP-je volt, amelyben AI-ágensek ajánlottak tippeket. Minden tipp mellett ott állt egy bizonyossági pontszám, a ranglistákon a felhasználó megnézhette egy ágens előéletét, mielőtt hallgatott volna rá, és minden művelet előtt volt egy tudatos ellenőrző lépés. A korai termékadatok szerint a felhasználók sokat támaszkodtak az AI-tól származó ajánlásokra. Ezt figyelendő kockázatként kezeltük, nem sikermutatóként, mert az automatizálásra hagyatkozás pontosan az a hibamód, amelyet az emberi felügyeletnek ki kell szűrnie. Ez felel meg a 14. cikk automatizálási torzításra vonatkozó elvárásának.

Az esettanulmány a saját határát is kimondja: az MVP nem igazolta az éles fogadási környezethez szükséges védelmi megoldásokat. Részletek: [SportsGambit esettanulmány](/hu/munka/sportsgambit).

### 6. Ültesd le korán a jogot, a compliance-t és a data science-t

Az Instructure-nél a folyamatokat a jogi, a compliance és a data science csapattal közösen néztük át, majd újrahasznosítható mintákba foglaltuk őket: promptok, ellenőrzési állapotok, megerősítések, visszajelzési körök. Nem a végén álltak az utunkba, hanem az elejétől velünk írták a védőkorlátokat. Az a védőkorlát, amely a tervezés után kerül be, többnyire egy figyelmeztető ablak, amelyet senki sem olvas el.

Ugyanez igaz volt AI nélküli, szabályozott munkában is. A Raiffeisennél Product Leadként vezettem a mobilbanki alkalmazás újratervezését, és a PSD2, az erős ügyfél-hitelesítés, a KYC és az audit trail alku tárgyát nem képező követelményként érkezett. Szinte minden lépést megtartottunk, és azon változtattunk, milyen érzés végigmenni rajtuk. Ez a szabályozott környezetben szállítás párhuzama, nem AI-példa. Részletek: [Raiffeisen esettanulmány](/hu/munka/raiffeisen).

### 7. Élesíts feature flag mögött, mérj, és nevezd meg, ki állíthatja le

Az Instructure-nél a funkciók feature flag mögött mentek ki, és mértük a használatot meg a feladatok befejezési arányát, hogy minden iteráció arra épüljön, amit az adatok mutatnak. Az [AI tanácsadás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) során ugyanebből lesz a módszerem negyedik lépése: egy behatárolt pilot, név szerint kijelölt felelőssel, aki szüneteltetheti, vagy visszaállhat az előző verzióra.

Döntsd el: ki felel a leállításért, milyen gyorsan történhet meg, és mi kerül a naplóba a későbbi felülvizsgálathoz.

## Mit dönts el építés előtt: nyolc kérdés

1. Mi a következménye egy hibás kimenetnek, és kire nézve?
2. Mit javasolhat az AI, és mit kell embernek jóváhagynia?
3. Mit lát az ellenőrző ahhoz, hogy megítélje a kimenetet?
4. Hogyan szerkeszti, veti el vagy vonja vissza?
5. Mi történik, ha a kimenet üres, hiányzik vagy késik?
6. Ki állíthatja le a funkciót, és milyen gyorsan?
7. Mi kerül a naplóba a későbbi felülvizsgálathoz?
8. Milyen mérőszámok döntik el, hogy a pilot folytatódik-e?

Ha ezekre még nincs válasz, ott kezdődik a munka, mégpedig az AI fejlesztés előtt, nem utána. Az emberi felügyelet a tervezés első leszállítandó eredménye. A módszeremben a második lépés, még mielőtt bármi megépülne, a hozzáférés és az emberi kontroll rögzítése: mit javasolhat az AI, mit kell embernek átnéznie, és mi történik, ha egy válasz hiányzik vagy hibás. Hogy ez hogyan illeszkedik egy teljes bevezetés menetrendjébe, arról az [AI bevezetése KKV-nál: az első 90 nap](/hu/irasok/ai-bevezetese-kkv-elso-90-nap) című cikkben írok.

## Mi volt benne a nehéz

A legtöbb AI-projekt azzal indul, mit lehet automatizálni. Az Instructure-nél azzal kezdtük, minek kell emberi kézben maradnia. A nehéz rész nem technikai volt, hanem etikai: arra az esetre tervezni, amikor az AI téved, elfogult, vagy visszaélnek vele, ahelyett hogy úgy tennénk, mintha ilyen nem fordulna elő. Ebből nem lesz látványos prezentáció. Olyan AI lesz belőle, amelyet valódi intézmények több millió embernek vezethetnek be, és utána is nyugodtan alszanak. Részletek: [Instructure esettanulmány](/hu/munka/instructure).

## Összegzés

Az emberi felügyeletet könnyebb megtervezni, mint utólag beépíteni. Az a termék megy át a felülvizsgálaton, amelyben már az elejétől minden AI-kimenethez tartozott címke, szerkesztési állapot és visszaút. Hozd a munkafolyamatot és azt a döntést, amely miatt aggódsz, és [ott kezdjük](/hu/kapcsolat).

## Gyakori kérdések

### Mit jelent a human in the loop az AI-nál?

Olyan munkafolyamatot, amelyben a rendszer javasol, az ember pedig előre kijelölt pontokon dönt, és ehhez elég információt kap. Az ember látja, hogy AI is részt vett a munkában, és megváltoztathatja vagy elvetheti a kimenetet. A döntést a rendszer rögzíti.

### Kötelező a human in the loop az EU AI-rendelet szerint?

A 14. cikk hatékony emberi felügyeletet ír elő a magas kockázatú rendszereknél, beleértve a felülbírálás és a leállítás lehetőségét. Konkrét felületi mintát nem ír elő. Hogy egy rendszer magas kockázatú-e, az jogi kérdés, ez a cikk pedig nem jogi tanácsadás.

### Mikortól alkalmazandók a magas kockázatú AI-rendszerek kötelezettségei?

A 2026-os Digital Omnibus után a III. melléklet szerinti rendszerekre 2027. december 2-tól, az I. melléklet szerintiekre 2028. augusztus 2-tól. Az 50. cikk átláthatósági kötelezettségei 2026. augusztus 2. óta alkalmazandók.

### Lelassítja a munkát az emberi ellenőrzés?

Oda teszi az erőfeszítést, ahol egy hiba a legtöbbe kerül. Mérd az ellenőrzésre fordított időt a pilotban. Ha az ellenőrzők mindent két másodperc alatt jóváhagynak, a kör nem működik. Ha az ellenőrzés tovább tart, mint az eredeti feladat, akkor a funkció nem működik.

### Meg tudja ezt csinálni egy kis csapat is?

Igen. A minták felületi döntések, nem infrastruktúra. Kezdd egyetlen munkafolyamattal, egy címkével, egy szerkesztési állapottal és egy név szerint kijelölt felelőssel.

### Mi az az automatizálási torzítás (automation bias)?

Az a hajlam, hogy az ember túlságosan megbízik egy rendszer kimenetében. A tervezői válasz erre a látható bizonyossági szint, az ellenőrizhető forrás és egy tudatos ellenőrző lépés minden művelet előtt.
