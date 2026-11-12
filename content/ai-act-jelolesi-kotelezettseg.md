---
title: "AI Act: mit kell jelölnie egy terméknek 2026 augusztusa óta"
description: "AI Act 50. cikk: mit kell jelölni 2026. augusztus 2. óta, mit nem halasztott el a Digital Omnibus, és hogyan tervezd meg a jelölést."
lang: hu
slug: ai-act-jelolesi-kotelezettseg
date: 2026-11-12T12:00:00+01:00
updated: 2026-11-12T12:00:00+01:00
tags: [ai act, eu ai act, mi rendelet, ai rendelet, mesterséges intelligencia rendelet, ai jelölés]
service: /hu/ai-tanacsadas-fejlesztes
service_label: AI tanácsadás, automatizálás és fejlesztés cégeknek
cover: /assets/images/og/writing/ki-kennzeichnungspflicht.jpg
cover_alt: Nagy, sötétzöld papírforma, rajta címkeként egy kis olajzöld papírfüggő: az AI Act 50. cikke szerinti jelölési kötelezettség
pair: [de/ki-kennzeichnungspflicht, en/eu-ai-act-transparency-obligations]
---
Az AI Act 50. cikke írja elő az AI jelölését, és ez a kötelezettség 2026. augusztus 2. óta alkalmazandó. Röviden: ha olyan AI-rendszert működtetsz, amely közvetlenül emberekkel lép kapcsolatba, erről tájékoztatnod kell őket, kivéve, ha ez a körülményekből nyilvánvaló. Ha AI-val készült tartalmat állítasz elő vagy teszel közzé, bizonyos esetekben jelölnöd kell, különösen a deepfake-et és a gépileg előállított tartalmat. A 2026-os Digital Omnibus a rendelet sok határidejét elhalasztotta, ezeket a kötelezettségeket nem.

Ezt a cikket termékcsapatoknak írom, nem jogászoknak. Azt írja le, mit kér a szöveg, ahogyan én termékfelelősként olvasom, és főleg azt, hogyan tervezd meg a jelölést úgy, hogy bizalmat építsen, ne pedig egy újabb figyelmeztetés legyen, amelyet mindenki átugrik. Nem jogi tanácsadás: hogy a te termékedre melyik kötelezettség vonatkozik, azt a jogászod dönti el.

Egy megjegyzés a nevekhez. Az AI Act, az EU AI Act, az MI rendelet, az AI rendelet és a mesterséges intelligencia rendelet ugyanazt az uniós jogszabályt jelenti. Ebben a cikkben az AI Act nevet használom, mert a termékcsapatok többnyire így hivatkoznak rá.

## Mit ír elő az AI Act 50. cikke?

Az 50. cikk több átláthatósági kötelezettséget tartalmaz bizonyos AI-rendszerek szolgáltatóinak és alkalmazóinak. Az átláthatósági és a jelölési kötelezettség ugyanannak a cikknek a két oldala. Egy termékcsapat szemével négy esetről van szó:

1. **Interakció emberekkel.** Azt az AI-rendszert, amelyet emberekkel való közvetlen interakcióra szántak (például egy ügyfélszolgálati chatbotot), úgy kell megtervezni, hogy az ember megtudja: AI-val lép kapcsolatba. Kivétel, ha ez egy észszerűen gondolkodó ember számára a körülményekből nyilvánvaló.
2. **Szintetikus tartalom.** Azoknak a rendszereknek, amelyek mesterségesen állítanak elő hangot, képet, videót vagy szöveget, géppel olvasható formában kell jelölniük a kimenetüket, hogy felismerhető legyen: mesterségesen előállított vagy manipulált tartalomról van szó.
3. **Deepfake.** Aki olyan kép-, hang- vagy videótartalmat állít elő vagy módosít, amely megtévesztően hasonlít valós személyekre, helyekre vagy eseményekre, annak közölnie kell, hogy a tartalom mesterségesen előállított vagy manipulált.
4. **Közzétett AI-szöveg.** Aki AI-val készült szöveget tesz közzé azért, hogy a nyilvánosságot közérdekű ügyekről tájékoztassa, annak ezt közölnie kell. Kivétel, ha a szöveget ember ellenőrizte, és valaki szerkesztői felelősséget visel érte.

Ezek a kötelezettségek 2026. augusztus 2. óta alkalmazandók. Az AI-ra vonatkozó Digital Omnibus (az (EU) 2026/1744 rendelet, megjelent a Hivatalos Lapban 2026. július 24-én, hatályos 2026. július 27-től) a magas kockázatú rendszerekre vonatkozó kötelezettségeket a III. melléklet szerinti rendszereknél 2027. december 2-ra, az I. melléklet szerintieknél 2028. augusztus 2-ra halasztotta. Az AI-jártasságra vonatkozó kötelezettséget is enyhítette: a „biztosítani” helyére az „elősegíteni” került. Az 50. cikk átláthatósági kötelezettségei változatlanok maradtak (források: [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/) és [National Law Review](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), lekérve 2026-10-21).

Két megszorítás ehhez az összefoglalóhoz. A pontos kivételekre, például a jogszabály által engedélyezett célokra vagy a nyilvánvalóan művészi tartalmakra a rendelet szövege irányadó, nem ez a cikk. Az pedig, hogy a rendszered emellett a magas kockázatú szabályok alá is esik-e, külön kérdés, saját menetrenddel.

## Miért tervezési feladat a jelölés

Egy olyan mondat, mint „Ezt a választ AI készítette”, formálisan talán teljesíti a kötelezettséget. Hogy ér-e valamit, az azon múlik, hogy az ember elolvassa-e, megérti-e, és jobb döntést hoz-e tőle.

Az Instructure-nél egy tanulási platform AI-funkcióinak funkciótervezését vezettem. A platformot naponta több millió ember használta. Az egyértelmű AI-jelölés ott az első naptól védőkorlát volt, jóval azelőtt, hogy a rendelet alkalmazandó lett volna. Az ok nem a jogszabály volt. Az oktatási, a közigazgatási és az egészségügyi ügyfelek bizalmat vásárolnak, és ennek a bizalomnak része volt az a jelölés, amely őszintén megmondja, mit csinált az AI. A hátteret az [Instructure esettanulmányban](/hu/munka/instructure) írom le.

Amit ott megtanultunk, öt döntésben foglalható össze.

## Öt döntés az AI-jelölésről

### 1. Hol van a címke, és megmarad-e

A címke a kimenet mellé való, nem a láblécbe és nem a felhasználási feltételekbe. Azt is döntsd el, mi történik, ha ember szerkeszti a kimenetet. Eltűnik a címke? Átvált arra, hogy „AI javasolta, ember szerkesztette”? Vagy változatlan marad? Mindhárom válasz védhető. A baj az, ha nincs válasz.

### 2. Mit mond a címke

Az „AI által generált” felirat keveset mond. Hasznosabb azt kiírni, mit csinált az AI: összefoglalt, fordított, vázlatot írt, ajánlást számolt. Az Instructure-nél az volt az elv, hogy a magyarázat megelőzi a javaslatot. A javaslat mögötti jelek és források a javaslat előtt álltak. Ez olyan jelölés, amely segít dönteni.

### 3. A közlés pillanata a beszélgetésben

Ügyfélszolgálaton a jelzés a beszélgetés elejére való, nem a harmadik válaszba, és meg kell ismételni, amikor ember veszi át a szálat. Az ügyfélnek minden pillanatban tudnia kell, hogy AI-val vagy emberrel beszél, és hogyan ér el egy embert. Hogy egy ilyen folyamat hogyan épül fel, azt az [AI ügyfélszolgálat emberi ellenőrzéssel](/hu/irasok/ai-ugyfelszolgalat-emberi-ellenorzessel) című cikkben írom le.

### 4. A jelölés és az emberi ellenőrzés összetartozik

Az a kimenet, amely AI-jelölést kap, de sem szerkeszteni, sem elutasítani nem lehet, bizalmatlanságot kelt, nem bizalmat. Az Instructure-nél minden AI-javaslatnak volt címkéje, szerkesztési állapota és visszaútja. Semmi nem maradhatott láthatatlan abból, amit a modell döntött. Ez a human in the loop gyakorlati oldala: a jelölés megmondja, mi jött a géptől, a szerkesztés és az elvetés pedig az ember kezében hagyja a döntést.

### 5. Mi kerül a naplóba

A szintetikus tartalom géppel olvasható jelöléséhez és a későbbi ellenőrzésekhez követhetőnek kell lennie, hogy melyik kimenetet melyik rendszer állította elő, és ki szerkesztette. Ez az adatmodellről és a naplózásról szóló döntés. Fejlesztés előtt hozd meg, ne a felügyeleti hatóság első megkeresése után.

## Mit jelent ez egy kis- vagy középvállalkozásnak

A legtöbb közepes méretű céget az 50. cikk pontosan egy esetben érinti: olyan AI-rendszert használ, amely ügyfelekkel beszél, vagy AI-val készült tartalmat tesz közzé. Mindkettő megoldható a fenti öt döntéssel, egy pilot keretében, saját jogi osztály felépítése nélkül. Hogy egy ilyen pilot hogyan fér bele az első hónapokba, arról az [AI bevezetése KKV-nál](/hu/irasok/ai-bevezetese-kkv-elso-90-nap) című cikk szól.

A lényeg, hogy a jogászt korán vond be. Az Instructure-nél a jog, a compliance és a data science az elejétől együtt írta a védőkorlátokat, nem a végén ellenőrizte őket. Kis csapatnál ez egyetlen beszélgetést jelent a tervezés elején, de ugyanazt a sorrendet.

Ellenőrzőlista az induláshoz:

- Melyik AI-funkciónk lép közvetlenül kapcsolatba emberekkel?
- Melyik állít elő olyan szöveget, képet, hangot vagy videót, amelyet közzéteszünk?
- Hol és mikor tudja meg az ember, hogy AI is részt vesz a folyamatban?
- Tudja-e szerkeszteni vagy elutasítani a kimenetet, és el tud-e érni egy embert?
- Mit naplózunk, és ki tudja leállítani a funkciót?

Ha az öt kérdés közül valamelyikre nincs válaszod, ott kezdd a munkát. A válaszok nem jogi vélemények, hanem terméktervezési döntések, amelyeket a jogászod utána át tud nézni.

## Összegzés

Egy jól megtervezett terméknél az AI Act jelölési kötelezettsége nem többletteher. Jogszabályi formája annak, amit a felhasználók amúgy is elvárnak: tudni akarják, mivel van dolguk. Ha a címkét, a szerkesztési állapotot és a visszautat az elejétől megtervezed, a kötelezettséget mellékesen teljesíted.

Ha olyan AI-funkciót tervezel, amely ügyfelekkel beszél, hozd a folyamatot, és [onnan indulunk](/hu/kapcsolat). A módszert az [AI tanácsadás, automatizálás és fejlesztés](/hu/ai-tanacsadas-fejlesztes) oldalon írom le.

## Gyakori kérdések

### Mióta kell alkalmazni az AI Act jelölési kötelezettségét?

Az AI Act 50. cikke szerinti átláthatósági kötelezettségek 2026. augusztus 2. óta alkalmazandók. A 2026-os Digital Omnibus ezeket nem halasztotta el.

### Minden chatbotot jelölni kell?

Annak az AI-rendszernek, amelyet emberekkel való közvetlen interakcióra szántak, tájékoztatnia kell az érintetteket, kivéve, ha ez a körülményekből nyilvánvaló. Hogy a kivétel a te esetedre érvényes-e, azt a jogászod tisztázza.

### A cégen belül használt AI-ra is vonatkozik a kötelezettség?

Az 50. cikk az emberekkel való interakcióra és a közzétett tartalmakra irányul. Egy belső asszisztens, amelynek a kimenetét a munkatársak ellenőrzik, mielőtt bármi kikerül a cégből, más eset. A munkáltató kötelezettségei a munkavállalókkal szemben külön kérdés. Ez nem jogi tanácsadás.

### Mit változtatott a 2026-os Digital Omnibus az AI Acten?

Elhalasztotta a magas kockázatú rendszerek határidejét: a III. melléklet szerintieknél 2027. december 2-ra, az I. melléklet szerintieknél 2028. augusztus 2-ra. Enyhítette az AI-jártasságra vonatkozó kötelezettséget is. Az 50. cikk jelölési és átláthatósági kötelezettségei megmaradtak.

### Elég, ha a felhasználási feltételekben jelzem, hogy AI-t használok?

Termékszempontból nem. A kötelezettség célja, hogy az ember az interakció pillanatában tudjon róla. Hogy egy adott megoldás jogilag elegendő-e, azt a jogászod tisztázza; tervezési szempontból a címke a kimenet mellé való.

### Jelölni kell-e az AI-val írt szöveget?

Az 50. cikk azt az AI-val készült szöveget nevezi meg, amelyet azért tesznek közzé, hogy a nyilvánosságot közérdekű ügyekről tájékoztassa. Ilyenkor közölni kell, hogy AI készítette, kivéve, ha ember ellenőrizte, és valaki szerkesztői felelősséget visel érte. Hogy a te tartalmad ide tartozik-e, azt a rendelet szövege és a jogászod dönti el, nem ez a cikk.
