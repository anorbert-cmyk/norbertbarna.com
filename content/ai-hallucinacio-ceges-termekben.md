---
title: "AI hallucináció céges termékben: mi az, és hogyan kezeld"
description: "Az AI hallucináció nem kapcsolható ki, de kezelhető: saját források, vázlat, tartózkodás, emberi ellenőrzés. Hét minta a gyakorlatból."
lang: hu
slug: ai-hallucinacio-ceges-termekben
date: 2026-11-27T23:30:00+01:00
updated: 2026-11-27T23:30:00+01:00
tags: [ai hallucináció, ai hallucináció kezelése, mesterséges intelligencia hallucináció, rag, human in the loop, ai bevezetés]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
cover: /assets/images/og/writing/ki-halluzinationen-im-unternehmen.jpg
cover_alt: Hajtogatott papírlap, amelynek egyik sarka lazán elválik, mellette egy kis olajzöld pipa: az AI hallucináció kezelése céges termékben
pair: [de/ki-halluzinationen-im-unternehmen, en/ai-hallucinations-in-business-products]
---
Az AI hallucináció a nyelvi modell olyan kimenete, amely meggyőzően hangzik, de téves vagy kitalált. Céges környezetben nem lehet kikapcsolni, csak kezelni: az AI a saját forrásaidból dolgozik és meg is mutatja őket, a kimenet vázlat, amelyet ember szerkeszt, és ahol nincs forrás, a rendszer azt mondja, „nem tudom”, ahelyett hogy találgatna. Aki ezt beépíti a felületbe és a munkafolyamatba, az a hallucinációt nem szüntette meg, de elvette a hatását.

A témáról szóló írások többsége elmagyarázza, mi a hallucináció, és miért keletkezik. Ez a cikk ott kezdődik, ahol azok véget érnek: mit tesz egy termékcsapat, amely munkatársaknak vagy ügyfeleknek épít AI-funkciót, hogy a hibás válasz ne okozzon kárt. A hét minta két termékből származik, amelyeken dolgoztam: az Instructure tanulási platformjának AI-funkcióiból és a SportsGambit nevű, AI-alapú előrejelzési piac MVP-jéből.

## Miért hallucinál az AI?

A nyelvi modell nem az igazságot jósolja meg, hanem a legvalószínűbb következő szót. Ahol a tanítóanyagában nincs tény, ott a hiányt olyasmivel tölti ki, ami hihetően hangzik. A szokásos értékelési módszerek ráadásul a találgatást jutalmazzák: az OpenAI kutatóinak tanulmánya szerint az a modell, amely bizonytalanság esetén tippel, jobb eredményt ér el a megszokott teszteken, mint az, amelyik tartózkodik, mert a „nem tudom” nulla pontot ér, a szerencsés tipp pedig egyet (forrás: Kalai, Nachum, Vempala, Zhang, [Why Language Models Hallucinate](https://arxiv.org/abs/2509.04664), 2025. szeptember 4., lekérve 2026. október 21-én).

A termékre nézve ebből az következik, hogy a modell magától nem lesz óvatos. Az óvatosságot a felületnek és a munkafolyamatnak kell beépítenie.

## Melyik AI hallucináció okoz valódi kárt egy cégnél?

Nem minden hibás válasz kerül ugyanannyiba. A céges projektekben három fajtával találkozom a leggyakrabban, és a háromból kettő nem a modellben keletkezik, hanem a cég adataiban.

: Az AI hallucináció három gyakori fajtája céges környezetben, az eredete és az ellenszere
| Fajta | Példa | Hol keletkezik | Mi fogja meg |
| --- | --- | --- | --- |
| Kitalált forrás vagy szám | Nem létező szabályzatra, szerződési pontra vagy árra hivatkozik | A modellben | Saját források, látható hivatkozás, tartózkodás |
| Összekevert esetek | Az egyik ügyfél kérdésére a másik ügyfél adataival válaszol | A keresésben és az adatokban | Szűk jogosultság, forrás a válasz mellett, emberi jóváhagyás |
| Elavult igazság | A válasz két éve helyes volt, a dokumentumot azóta senki sem frissítette | A dokumentumokban | Gazdája van minden forrásnak, a hibákat méred |

A kitalált forrás azért veszélyes, mert a kimenet bizonyítéknak látszik. Az összekevert eset az ügyfélszolgálaton és mindenhol, ahol személyes adat van, a legdrágább hiba. Az elavult igazság szigorúan véve nem hallucináció, de a felhasználónak ugyanaz. Ezért a hallucináció elleni munka egy egyszerű kérdéssel indul: milyen forrásokból dolgozhat egyáltalán az AI?

## Hogyan kezelhető az AI hallucináció céges környezetben? Hét minta

### 1. Az AI a te forrásaidból dolgozik, nem az emlékezetéből

A technika neve retrieval augmented generation, röviden RAG: a rendszer előbb megkeresi a kérdéshez illő részeket a cég dokumentumaiban, és a modell ezekből válaszol. A RAG érezhetően csökkenti a kitalált tények számát. Nem szünteti meg őket, mert a modell a megtalált részeket is összefoglalhatja hibásan. A RAG az alap, nem a megoldás.

### 2. A forrás ott áll a válasz mellett

Minden válasz megmutatja, melyik dokumentum melyik részéből származik, és a felhasználó egy kattintással odajut. Az Instructure-nél a forrásjelzés az első naptól rögzített védőkorlátok egyike volt, az AI-jelölés, a szerkeszthető kimenet és a helyreállítási út mellett, hogy az oktatók lássák, mire épül egy javaslat. Látható forrás nélkül a felhasználók vagy mindent ellenőriznek, és akkor oda az időmegtakarítás, vagy semmit, és akkor a hiba átmegy. Részletek: [Instructure esettanulmány](/hu/munka/instructure).

### 3. A kimenet vázlat, nem eredmény

Az AI ír, az ember küld. A mező szerkeszthető, az elvetés egy kattintás, és a termék nem azt írja ki, hogy „kész”, hanem azt, hogy „vázlat ellenőrzésre”. Ez az egy szó a felületen megváltoztatja, hogyan bánnak a munkatársak a kimenettel.

### 4. A tartózkodás megengedett válasz

Ha a keresés nem talál illő részt a forrásaidban, a rendszer nem a modell általános tudásából válaszol, hanem ezt mondja: „Erről nem találtam semmit a dokumentumokban.” A tartózkodást külön meg kell tervezni és tesztelni kell, mert a modell magától inkább találgat. Az a rendszer, amely naponta tízszer tartózkodik, jobb annál, amely naponta tízszer meggyőzően téved.

### 5. A bizonyosságot a termék megmutatja, nem állítja

A SportsGambitben minden AI-tipp mellett megbízhatósági pontszám állt, a teljesítmény-ranglistákon pedig az ügynök korábbi eredményei látszottak, így a felhasználó mérlegelni tudta az ajánlást, mielőtt cselekedett. A korai termékadatok egy kockázatot is jeleztek: a felhasználók erősen támaszkodtak az AI ajánlásaira. Ettől a látható megbízhatósági információ és a tudatos ellenőrzési lépés fontosabb lett, nem kevésbé fontos. A megbízhatósági pontszám nem bizonyítja, hogy a válasz helyes. Azt mondja meg a felhasználónak, mennyi ellenőrzést érdemel. Részletek: [SportsGambit esettanulmány](/hu/munka/sportsgambit).

### 6. Az ellenőrzés mértéke a következményhez igazodik

Nem minden kimenet igényel ugyanakkora kontrollt. Egy belső összefoglalót az AI önállóan is adhat. Az ügyfélnek szóló válaszvázlatot ember hagyja jóvá. Ami pénzt mozgat, jogi helyzetet érint vagy egy emberről szóló döntést készít elő, az automatikusan ki sem megy. Ezt a lépcsőzést részletesen a [human in the loop mintákról szóló cikkben](/hu/irasok/human-in-the-loop-emberi-felugyelet) írom le, az ügyfélszolgálati esetet pedig az [AI ügyfélszolgálat emberi ellenőrzéssel](/hu/irasok/ai-ugyfelszolgalat-emberi-ellenorzessel) című írásban.

### 7. A hibákat méred, nem csak meséled

A pilot azt méri, milyen gyakran írják át vagy vetik el a vázlatokat, milyen gyakran tartózkodik a rendszer, és mely kérdések vezetnek hibás válaszhoz. Ez a lista a projekt legértékesebb dokumentuma. Megmutatja, mely források hiányoznak vagy avultak el, és ezzel tudod a cégvezetés és az adatvédelmi felelős előtt igazolni, hogy az ellenőrzés működik.

## Elég a jó prompt, az oktatás és a belső szabályzat?

A prompt, a modell beállításai, a munkatársak képzése és a belső AI-szabályzat hasznos, de önmagában egyik sem kezeli a hallucinációt. A prompt és az alacsonyabb temperature érték ritkítja a hibát, a szabályzat pedig leírja, hogy a kimenetet ellenőrizni kell. Egyik sem dönti el, mi történik azon a napon, amikor a munkatárs siet, és a válasz hihetőnek tűnik.

Egy kkv-nál ez általában így néz ki: a kollégák egy általános chatbotot használnak, a szabályzat annyit mond, hogy „mindig ellenőrizd”. Ez a szabály addig él, amíg van rá idő. A fenti hét minta azért a termékben és a folyamatban van, mert ott akkor is működik, ha senki sem gondol rá. A képzés ezután jön, és arról szól, hogyan olvasd a forrásjelzést és a vázlat állapotát. A bevezetés sorrendjét az [AI bevezetése KKV-nál: az első 90 nap](/hu/irasok/ai-bevezetese-kkv-elso-90-nap) című cikk írja le.

## Melyik AI hallucinál a legkevésbé, és számít ez?

Gyakori kérdés, hogy melyik modell hallucinál a legkevésbé, a válasz pedig minden modellgenerációval változik. Egy céges terméknél ez másodlagos. Egy közepes modell tiszta forrásokkal, látható hivatkozással és emberi ellenőrzéssel megbízhatóbb, mint a legjobb modell, amely szabadon, emlékezetből válaszol. A modellt később le lehet cserélni. A források, a felület és a munkafolyamat megmarad.

Ugyanez érvényes, amikor szállítókat hasonlítasz össze: azt kérdezd, hogyan viselkedik a termék, amikor a modell téved, ne azt, hogy melyik modell van benne. A költség is ezektől a tényezőktől függ: a források számától és állapotától, az integrációktól és az ellenőrzés mértékétől, mert minden megbízás egyedi munka.

## Mit mond erről az EU AI-rendelete?

Az EU AI-rendelete nem követel hibátlan AI-t. A magas kockázatú rendszereknél emberi felügyeletet ír elő (14. cikk), az emberekkel kapcsolatba lépő AI-nál pedig átláthatóságot (50. cikk, amely 2026. augusztus 2. óta alkalmazandó). A fenti minták mindkét követelményre a tervezési választ adják. A jelölésről külön cikk szól: [AI Act: mit kell jelölnie egy terméknek](/hu/irasok/ai-act-jelolesi-kotelezettseg). A jogalap az (EU) 2024/1689 rendelet (forrás: [EUR-Lex, (EU) 2024/1689 rendelet](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), lekérve 2026. október 22-én). Ez egy termékcsapat olvasata, nem jogi tanácsadás.

## Összegzés

Nem az a kérdés, hogy hallucinál-e a céged AI-rendszere. Hallucinál. Az a kérdés, hogy a terméked úgy épült-e meg, hogy a hibás válasz feltűnjön, mielőtt hatása lenne: saját források, látható hivatkozás, vázlat, tartózkodás, megmutatott bizonyosság, következményhez igazított ellenőrzés és mérés. Ha AI-funkciót tervezel, vagy egy meglévőt szeretnél átnézetni, egy beszélgetésben megmondom, a hét minta közül melyik hiányzik nálad először: [kapcsolat](/hu/kapcsolat). A módszert az [AI tanácsadás, automatizálás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) oldalon írom le.

## Gyakori kérdések

### Mi az az AI hallucináció?

Az AI hallucináció olyan kimenet, amely hihetően hangzik, de téves, vagy semmilyen forrás nem támasztja alá: kitalált idézet, nem létező szabályzat, hibás szám. A modell nem „hazudik”. Nincs fogalma igazról és hamisról, csak valószínűről.

### Meg lehet teljesen szüntetni az AI hallucinációt?

Nem. Jelentősen csökkenthető, ha az AI a cég saját forrásaiból dolgozik, és forrás hiányában tartózkodik, a hatása pedig megfogható, ha ember ellenőrzi a kimenetet, mielőtt hatása lenne. Az a szállító, amely hallucinációmentes AI-t ígér, pontatlanul írja le a termékét.

### Megoldja a RAG a hallucinációt?

A RAG a kitalált tények ellen segít. Nem segít a megtalált részek hibás összefoglalása, az elavult dokumentumok és az összekevert esetek ellen. Ezért a RAG mellé mindig látható forrás és ellenőrzési lépés kell.

### Hogyan ellenőrizzem, hogy az AI válasza helyes?

Nyisd meg a válasz mellett jelzett forrást, és vesd össze vele az állítást. Ha a rendszer nem mutat forrást, a választ kezeld ellenőrizetlen vázlatként. Számot, jogszabályi hivatkozást és ügyféladatot mindig az eredeti dokumentumból ellenőrizz.

### Ki felel, ha a cég AI-rendszere hibás választ ad?

Az a cég, amely a kimenetet felhasználja vagy az ügyfélnek továbbadja, nem a modell szolgáltatója. Ezért a következménnyel járó kimenetek emberi jóváhagyása nem puszta óvatosság: ez az a pont, ahol a felelősség ül. A pontos felelősségi helyzetet a jogi tanácsadód vizsgálja meg.

### Melyik AI modell hallucinál a legkevésbé?

Ez minden modellgenerációval változik, és a te esetedben csak a saját dokumentumaidon végzett mérés számít. A prototípusban több modellt tesztelünk ugyanazokon a példákon, és ez alapján választunk, nem ranglista alapján.
