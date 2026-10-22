---
title: "KI-Kennzeichnungspflicht: Was Produktteams jetzt umsetzen"
description: "KI-Kennzeichnungspflicht nach Art. 50 KI-Verordnung: was seit August 2026 gilt, was der Digital Omnibus änderte, wie man es gestaltet."
lang: de
slug: ki-kennzeichnungspflicht
date: 2026-10-21T10:35:00+02:00
updated: 2026-10-21T10:35:00+02:00
tags: [ki kennzeichnungspflicht, ki verordnung, eu ai act, ki transparenzpflicht, ki kennzeichnung, human in the loop]
service: /de/ki-beratung-entwicklung
service_label: KI-Beratung, Automatisierung und Entwicklung für Unternehmen
cover: /assets/images/og/writing/ki-kennzeichnungspflicht.jpg
cover_alt: Eine große dunkelgrüne Papierform mit einem kleinen olivfarbenen Papieranhänger als Etikett: die KI-Kennzeichnungspflicht nach Artikel 50 der KI-Verordnung
pair: null
---
Die KI-Kennzeichnungspflicht ergibt sich aus Artikel 50 der EU-KI-Verordnung und gilt seit dem 2. August 2026. Kurz gefasst: Wer ein KI-System betreibt, das direkt mit Menschen interagiert, muss diese Menschen darüber informieren, außer es ist aus den Umständen offensichtlich. Wer KI-generierte Inhalte erzeugt oder veröffentlicht, muss sie in bestimmten Fällen kennzeichnen, insbesondere Deepfakes und maschinell erzeugte Inhalte. Der Digital Omnibus 2026 hat viele Fristen der Verordnung verschoben, diese Pflichten nicht.

Dieser Artikel ist für Produktteams geschrieben, nicht für Juristen. Er beschreibt, was der Text verlangt, soweit ich ihn als Produktverantwortlicher lese, und vor allem, wie man die Kennzeichnung so gestaltet, dass sie Vertrauen schafft, statt als Warnhinweis ignoriert zu werden. Er ist keine Rechtsberatung; welche Pflicht für Ihr Produkt gilt, klärt Ihre Rechtsabteilung.

Zur Zusammenarbeit: Ich arbeite mit Teams in Deutschland und der EU, die Kommunikation läuft auf Englisch oder Ungarisch.

## Was verlangt Artikel 50 der KI-Verordnung?

Artikel 50 der KI-Verordnung (im Englischen EU AI Act) enthält mehrere Transparenzpflichten für Anbieter und Betreiber bestimmter KI-Systeme; die KI-Transparenzpflicht und die Kennzeichnungspflicht sind zwei Seiten desselben Artikels. In der Lesart eines Produktteams sind es vier Fälle:

1. **Interaktion mit Menschen.** Ein KI-System, das für die direkte Interaktion mit Personen bestimmt ist (zum Beispiel ein Chatbot im Kundenservice), muss so gestaltet sein, dass die Person erfährt, dass sie mit einer KI interagiert, außer dies ist aus den Umständen für eine verständige Person offensichtlich.
2. **Synthetische Inhalte.** Systeme, die Audio, Bild, Video oder Text künstlich erzeugen, müssen ihre Ausgaben in maschinenlesbarer Form kennzeichnen, damit sie als künstlich erzeugt oder manipuliert erkennbar sind.
3. **Deepfakes.** Wer Bild-, Audio- oder Videoinhalte erzeugt oder verändert, die echten Personen, Orten oder Ereignissen täuschend ähneln, muss offenlegen, dass sie künstlich erzeugt oder manipuliert sind.
4. **Veröffentlichte KI-Texte.** Wer KI-generierten Text veröffentlicht, um die Öffentlichkeit über Angelegenheiten von öffentlichem Interesse zu informieren, muss das offenlegen, sofern nicht ein Mensch den Text geprüft hat und eine redaktionelle Verantwortung trägt.

Diese Pflichten gelten seit dem 2. August 2026. Der Digital Omnibus zur KI (Verordnung (EU) 2026/1744, im Amtsblatt vom 24. Juli 2026, in Kraft seit 27. Juli 2026) hat die Pflichten für Hochrisiko-Systeme nach Anhang III auf den 2. Dezember 2027 und nach Anhang I auf den 2. August 2028 verschoben und die Pflicht zur KI-Kompetenz von „sicherstellen“ auf „fördern“ abgeschwächt; die Transparenzpflichten nach Artikel 50 blieben unverändert (Quellen: [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/), [National Law Review](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), abgerufen am 21.10.2026).

Zwei Einschränkungen zu dieser Zusammenfassung: Für die genauen Ausnahmen, etwa für gesetzlich zugelassene Zwecke oder für offensichtlich künstlerische Inhalte, gilt der Verordnungstext, nicht dieser Artikel. Und ob Ihr System zusätzlich unter die Hochrisiko-Regeln fällt, ist eine eigene Frage mit eigenem Zeitplan.

## Warum die Kennzeichnung eine Gestaltungsaufgabe ist

Ein Satz wie „Diese Antwort wurde von einer KI erstellt“ erfüllt die Pflicht vielleicht formal. Ob er etwas bewirkt, hängt davon ab, ob die Person ihn liest, versteht und daraus eine bessere Entscheidung trifft. Bei Instructure, wo ich die Funktionsgestaltung für KI-Funktionen in einer Lernplattform geleitet habe, die täglich mehrere Millionen Menschen nutzten, war die klare KI-Kennzeichnung eine Leitplanke vom ersten Tag an, lange bevor die Verordnung galt. Der Grund war nicht das Gesetz. Bildungs-, Behörden- und Gesundheitskunden kaufen Vertrauen, und eine Kennzeichnung, die ehrlich sagt, was die KI getan hat, war Teil dieses Vertrauens.

Was wir dort gelernt haben, lässt sich in fünf Entscheidungen fassen.

## Fünf Entscheidungen zur KI-Kennzeichnung

### 1. Wo das Label sitzt, und ob es bleibt

Das Label gehört an die Ausgabe, nicht in die Fußzeile oder die Nutzungsbedingungen. Entscheiden Sie auch, was passiert, wenn ein Mensch die Ausgabe bearbeitet: Verschwindet das Label, wird daraus „von KI vorgeschlagen, von einer Person bearbeitet“, oder bleibt es unverändert? Jede Antwort ist vertretbar; keine Antwort ist das Problem.

### 2. Was das Label sagt

„KI-generiert“ sagt wenig. Nützlicher ist, was die KI getan hat: zusammengefasst, übersetzt, einen Entwurf geschrieben, eine Empfehlung berechnet. Bei Instructure galt das Prinzip „Erklärung vor Vorschlag“: Die Signale und Quellen hinter einem Vorschlag standen vor dem Vorschlag. Das ist Kennzeichnung, die beim Entscheiden hilft.

### 3. Der Moment der Offenlegung im Gespräch

Im Kundenservice gehört der Hinweis an den Anfang des Gesprächs, nicht in die dritte Antwort, und er gehört wiederholt, wenn ein Mensch übernimmt. Der Kunde sollte zu jedem Zeitpunkt wissen, ob er mit einer KI oder mit einer Person spricht, und wie er eine Person erreicht. Wie ein solcher Ablauf aufgebaut ist, steht im Artikel [KI im Kundenservice mit menschlicher Kontrolle](/de/wissen/ki-im-kundenservice).

### 4. Kennzeichnung und menschliche Prüfung gehören zusammen

Eine Ausgabe, die als KI-generiert gekennzeichnet ist, aber weder bearbeitet noch abgelehnt werden kann, erzeugt Misstrauen statt Vertrauen. Bei Instructure hatte jeder KI-Vorschlag ein Label, einen Bearbeitungszustand und einen Weg zurück; nichts, was das Modell entschied, durfte unsichtbar bleiben. Die Muster dahinter beschreibe ich im Artikel [Human in the Loop in einem regulierten Produkt](/de/wissen/human-in-the-loop-ki).

### 5. Was protokolliert wird

Für die Pflicht zur maschinenlesbaren Kennzeichnung synthetischer Inhalte und für spätere Prüfungen muss nachvollziehbar sein, welche Ausgabe von welchem System erzeugt und von wem bearbeitet wurde. Das ist eine Entscheidung über Datenmodell und Protokollierung, die vor dem Bau getroffen werden sollte, nicht nach der ersten Anfrage einer Aufsichtsbehörde.

## Was das für kleine und mittlere Unternehmen bedeutet

Die meisten mittelständischen Unternehmen sind von Artikel 50 in genau einem Fall betroffen: Sie setzen ein KI-System ein, das mit Kunden spricht, oder sie veröffentlichen KI-generierte Inhalte. Beides lässt sich mit den fünf Entscheidungen oben in einem Pilotprojekt umsetzen, ohne eine Rechtsabteilung aufzubauen. Wichtig ist, die Rechtsberatung früh einzubeziehen, so wie bei Instructure Recht, Compliance und Data Science die Leitplanken von Anfang an mitgeschrieben haben, statt sie am Ende zu prüfen.

Eine Checkliste für den Anfang:

- Welche unserer KI-Funktionen interagieren direkt mit Personen?
- Welche erzeugen Text, Bild, Audio oder Video, das veröffentlicht wird?
- Wo und wann erfährt die Person, dass KI beteiligt ist?
- Kann die Person die Ausgabe bearbeiten, ablehnen oder einen Menschen erreichen?
- Was wird protokolliert, und wer kann die Funktion stoppen?

## Häufige Fragen

### Seit wann gilt die KI-Kennzeichnungspflicht?

Die Transparenzpflichten nach Artikel 50 der KI-Verordnung gelten seit dem 2. August 2026. Der Digital Omnibus 2026 hat sie nicht verschoben.

### Muss jeder Chatbot gekennzeichnet werden?

Ein KI-System, das für die direkte Interaktion mit Personen bestimmt ist, muss diese Personen informieren, außer es ist aus den Umständen offensichtlich. Ob die Ausnahme für Ihren Fall gilt, klärt Ihre Rechtsberatung.

### Gilt die Pflicht auch für intern genutzte KI?

Artikel 50 zielt auf die Interaktion mit Personen und auf veröffentlichte Inhalte. Ein interner Assistent, dessen Ausgaben Mitarbeiter prüfen, bevor sie nach außen gehen, ist ein anderer Fall; die Pflichten des Arbeitgebers gegenüber den Beschäftigten sind eine eigene Frage. Das ist keine Rechtsberatung.

### Was hat der Digital Omnibus 2026 geändert?

Er hat die Fristen für Hochrisiko-Systeme verschoben (Anhang III auf den 2. Dezember 2027, Anhang I auf den 2. August 2028) und die Pflicht zur KI-Kompetenz abgeschwächt. Die Kennzeichnungs- und Transparenzpflichten nach Artikel 50 blieben bestehen.

### Reicht ein Hinweis in den Nutzungsbedingungen?

Aus Produktsicht nicht: Die Pflicht zielt darauf, dass die Person im Moment der Interaktion informiert ist. Ob eine bestimmte Umsetzung rechtlich ausreicht, klärt Ihre Rechtsberatung; gestalterisch gehört das Label an die Ausgabe.

### In welcher Sprache arbeiten Sie?

Die Zusammenarbeit läuft auf Englisch oder Ungarisch. Ich arbeite mit Unternehmen in Ungarn, Deutschland und der übrigen EU; deutschsprachige Teams arbeiten mit mir auf Englisch.

## Fazit

Die KI-Kennzeichnungspflicht ist für ein gut gestaltetes Produkt keine zusätzliche Last, sondern die gesetzliche Form von etwas, das Nutzer ohnehin erwarten: zu wissen, womit sie es zu tun haben. Wer Label, Bearbeitungszustand und Weg zurück von Anfang an gestaltet, erfüllt die Pflicht nebenbei. Wenn Sie eine KI-Funktion planen, die mit Kunden spricht, bringen Sie den Ablauf mit, und wir [beginnen dort](/de/kontakt). Die Methode dahinter steht auf der Seite [KI-Beratung, Automatisierung und Entwicklung](/de/ki-beratung-entwicklung).
