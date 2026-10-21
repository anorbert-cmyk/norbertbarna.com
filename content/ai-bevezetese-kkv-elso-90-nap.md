---
title: "AI bevezetése KKV-nál: az első 90 nap lépésről lépésre"
description: "AI bevezetése KKV-nál lépésről lépésre: melyik folyamattal kezdj, mit tesztelj pilotban, mit ellenőrizzen ember, és mikor állj meg."
draft: true
lang: hu
slug: ai-bevezetese-kkv-elso-90-nap
date: 2026-12-02T09:00:00+01:00
updated: 2026-12-02T09:00:00+01:00
tags: [ai bevezetés, ai tanácsadás, mesterséges intelligencia cégeknek, ai automatizálás, kkv]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
cover: /assets/images/og/writing/ai-bevezetese-kkv-elso-90-nap.jpg
cover_alt: Három egyre magasabb, hajtogatott papírlépcső lila háttér előtt
pair: null
---
Egy kis- vagy középvállalkozásnál az AI bevezetése egyetlen munkafolyamattal kezdődik, nem egy eszközzel. Az első 90 napban kiválasztasz egy ismétlődő feladatot, rögzíted, mit csinálhat az AI és mit ellenőriz ember, kipróbálod valódi példákon, majd egy szűk pilotban mérsz. A végén nem „AI-stratégiád” lesz, hanem egy döntés: folytatod, átalakítod vagy leállítod.

A 90 nap az én javasolt menetrendem, nem garantált időtartam. Lejjebb leírom, mitől függ, hogy elég-e. Ez a cikk azt mutatja meg, mi történik a három szakaszban, mit kapsz a végükön, és milyen hibákat látok a leggyakrabban az első hónapokban.

## Mielőtt elkezded: három kérdés

- **Melyik feladat ismétlődik hetente, sok dokumentummal vagy adattal?** Ajánlatkérések feldolgozása, bejövő e-mailek besorolása, jegyzőkönyvek kivonatolása, termékleírások vázlata. Olyan kell, amelynél világosan mérhető a siker: megtakarított idő, kevesebb hiba vagy gyorsabb válasz.
- **Mi számítana javulásnak?** Ha erre nincs válasz, a pilot végén nem lesz mit mérni.
- **Megoldható-e egyszerűbben?** Néha egy szabály, egy sablon vagy egy érthetőbb felület ugyanazt adja, AI nélkül. Ha igen, nem kell hozzá AI, és ezt egy jó tanácsadó az elején megmondja.

## Az első 90 nap, három szakaszban

### Az első 30 nap: ismerd meg a munkát, és rögzítsd a kereteket

1. Leülünk azokkal, akik ma a feladatot végzik. Végigvesszük a bemeneteket, az átadásokat, az ismétlődő döntéseket és a hibák következményeit.
2. Meghatározzuk a viszonyítási alapot: mennyi idő, hány hiba, mennyi várakozás ma. Csak a saját méréseid számítanak; iparági átlagot nem használok.
3. Feltérképezzük az engedélyezett adatokat és hozzáféréseket: mi mehet ki egy külső szolgáltatóhoz, mi nem, és ki hagyja jóvá.
4. Leírjuk: mit javasolhat az AI, mit ellenőriz ember, és mi történik hiányzó vagy hibás válasznál.

Amit a szakasz végén kapsz: körülhatárolt problémát, adathozzáférési kereteket és a csapatoddal egyeztetett elfogadási feltételeket.

### A 31. naptól a 60. napig: próbáld ki fejlesztés előtt

5. Prototípust készítünk jellemző, felhasználásra jóváhagyott példákkal, és bevonjuk a leendő felhasználókat.
6. Teszteljük a kényelmetlen eseteket: bizonytalan kimenet, hiányzó adat, szerkesztés, hibajavítás. Nem a demóra tervezünk, hanem arra, amikor az AI téved.
7. Együtt döntjük el, indokolt-e a fejlesztés, vagy változtatni kell az elképzelésen.

Saját tapasztalatból: az Instructure-nél, ahol a Canvas Catalog ökoszisztémáján belül a funkciófejlesztést vezettem, a Uizard, a Galileo és a Lovable eszközeivel készült prototípusok lerövidítették az utat a koncepciótól a tesztig. A fejlesztés előtt összehasonlítottuk a promptmintákat, az ellenőrzési állapotokat és a tájékoztatási modelleket. Részletek: [Instructure esettanulmány](/hu/munka/instructure).

Amit kapsz: tesztelhető prototípust, értékelési példákat és egyértelmű döntést a fejlesztésről.

### A 61. naptól a 90. napig: szűk pilot, kijelölt felelőssel

8. A pilotot a meglévő rendszereidhez kötjük, kis felhasználói körrel. A felület, a rendszerkapcsolatok, a jogosultságok, az ellenőrzési lépések és a hibaágak is a feladat részei.
9. Egy ember felel a pilotért: kezeli a problémákat, és szükség esetén leállíthatja vagy visszaállíthatja az előző verziót.
10. Mérünk a kiinduló állapothoz képest: feladatok teljesítése, ellenőrzésre fordított munka, a kimenet minősége, válaszidő, működési költség.

Amit kapsz: pilotértékelést, működtetési útmutatót és döntést a következő lépésről. Ez az [AI tanácsadás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) ötlépéses módszerének utolsó két lépése.

## Mitől függ, hogy 90 nap elég-e

- Mennyire rendezettek az adatok, és ki hagyja jóvá a hozzáférést.
- Hány rendszerhez kell kapcsolódni, és van-e hozzájuk dokumentált felület.
- Milyen következménye van egy hibás kimenetnek: egy belső vázlat más, mint egy ügyfélnek kimenő válasz.
- Mennyi ideje van a csapatodnak a tesztelésre a napi munka mellett.
- Kell-e jogi vagy adatvédelmi egyeztetés, és mennyi idő alatt születik döntés.

## Gyakori hibák az első hónapokban

- **Eszközzel kezdeni feladat helyett.** Az „AI-t akarunk” nem feladat. A „hetente húsz ajánlatkérést dolgozunk fel kézzel” az.
- **Látványos demó, amely a hibás esetekre nincs felkészítve.** Az Instructure-nél mindent feltehettünk volna az automatizálásra, és látványos demóink lettek volna. Az oktatási, közszférabeli és egészségügyi ügyfelek viszont bizalmat vásárolnak, és a demó őket nem győzi meg. Ezért azzal kezdtük, minek kell emberi kézben maradnia.
- **Viszonyítási alap nélkül mérni.** Ha nem tudod, mennyi idő volt a feladat a pilot előtt, nem tudod, segített-e.
- **Nincs, aki leállíthatja.** Egy pilotnak akkor is kell felelős, ha minden jól megy.

## Szabályozás egy bekezdésben

Ha az AI-rendszer ügyfelekkel beszél, az EU AI-rendelet 50. cikke szerinti átláthatósági kötelezettségek 2026. augusztus 2. óta alkalmazandók: például jelezni kell, hogy a felhasználó AI-val lép kapcsolatba. A 2026-os Digital Omnibus (az (EU) 2026/1744 rendelet) a magas kockázatú rendszerek határidejét 2027. december 2-ra tolta, az 50. cikket nem halasztotta el (forrás: [National Law Review, 2026](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), lekérve 2026-10-21). Ez tervezési szempont, nem jogi tanácsadás; hogy a te rendszered melyik kategóriába esik, azt jogásszal érdemes tisztázni. Az ügyfélszolgálati esetről külön cikk szól: [AI ügyfélszolgálat emberi ellenőrzéssel](/hu/irasok/ai-ugyfelszolgalat-emberi-ellenorzessel).

## Gyakori kérdések

### Mennyibe kerül az AI bevezetése egy KKV-nál?

Minden bevezetés egyedi munka: az ár a kiválasztott feladatból, az adatokból és az integrációból következik, ezért a feltárás után adok ajánlatot. Ami nem kerül pénzbe: az első beszélgetés előkészítése, vagyis a fenti három kérdés megválaszolása.

### Kell-e saját AI-modellt fejleszteni?

Az első pilothoz jellemzően nem. A kérdés az, hogyan kötjük be a meglévő modelleket a te munkafolyamatodba, adataidba és döntéseidbe, és hol marad az ember.

### Mi van, ha a pilot nem válik be?

Akkor ez a 90 nap eredménye: tudod, miért, és mit nem érdemes megépíteni. Ez olcsóbb, mint egy év után jönni rá.

### Kell-e informatikus a csapatban?

Kell valaki, aki ismeri a rendszereidet és a hozzáféréseket. A fejlesztést én is vállalom: a prototípustól az éles működésig, a rendszereiddel integrálva, átadással a csapatodnak.

### Hogyan védjük az ügyféladatokat a pilot alatt?

Csak engedélyezett adat, rögzített hozzáférés, és leírt szabály arról, hová kerülhet információ. A kapcsolatfelvételhez egy rövid, anonimizált leírás elég a munkafolyamatról; jelszót, ügyféladatot vagy bizalmas anyagot ne küldj, amíg nem egyeztettük a megosztás módját.

### Milyen nyelven dolgozol?

Magyarul és angolul. Magyar, német és más EU-s cégekkel is dolgozom; a német ügyfelekkel angolul.

## Összegzés

Az AI bevezetése egy KKV-nál nem technológiai projekt, hanem egy munkafolyamat átalakítása, amelyben az ember marad a döntéshozó. Hozd a munkafolyamatot, azt, hogy kik használják, és azt, hogy mi számítana sikernek. Az első beszélgetéshez [ennyi elég](/hu/kapcsolat).
