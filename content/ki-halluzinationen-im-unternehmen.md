---
title: "KI-Halluzinationen im Unternehmen: Was ein Produkt tun muss"
description: "KI-Halluzinationen lassen sich nicht abschalten, aber auffangen: Quellen, Entwürfe, Enthaltung, menschliche Prüfung. Sieben Muster."
lang: de
slug: ki-halluzinationen-im-unternehmen
date: 2026-10-21T10:20:00+02:00
updated: 2026-10-21T10:20:00+02:00
tags: [ki halluzination, ki halluzinationen, ki halluzinationen vermeiden, ki falsche antworten, rag retrieval augmented generation, human in the loop]
service: /de/ki-beratung-entwicklung
service_label: KI-Beratung, Automatisierung und Entwicklung für Unternehmen
cover: /assets/images/og/writing/ki-halluzinationen-im-unternehmen.jpg
cover_alt: Ein gefaltetes Papierblatt mit einer losen, abstehenden Ecke, daneben eine kleine olivfarbene Prüfmarke: KI-Halluzinationen im Unternehmen auffangen
pair: null
---
Eine KI-Halluzination ist eine überzeugend formulierte, aber falsche oder erfundene Ausgabe eines Sprachmodells. Im Unternehmen lässt sie sich nicht abschalten, sondern nur auffangen: Die KI arbeitet aus Ihren eigenen Quellen und zeigt sie an, die Ausgabe ist ein Entwurf, den ein Mensch bearbeitet, und bei Fragen, zu denen keine Quelle existiert, sagt das System „weiß ich nicht“ statt zu raten. Wer das in die Oberfläche einbaut, hat Halluzinationen nicht beseitigt, aber ihnen die Wirkung genommen.

Die meisten Texte zu diesem Thema erklären, was eine Halluzination ist und warum sie entsteht. Dieser Artikel setzt danach an: Was tut ein Produktteam, das eine KI-Funktion für Mitarbeiter oder Kunden baut, damit eine falsche Antwort keinen Schaden anrichtet. Die sieben Muster stammen aus zwei Produkten, an denen ich gearbeitet habe, KI-Funktionen in der Lernplattform von Instructure und ein KI-gestützter Prognosemarkt-MVP namens SportsGambit.

Zur Zusammenarbeit vorab: Ich arbeite mit Unternehmen in Deutschland und der EU; die Kommunikation läuft auf Englisch oder Ungarisch.

## Warum halluziniert KI? Drei Sätze

Ein Sprachmodell sagt nicht die Wahrheit voraus, sondern das wahrscheinlichste nächste Wort. Wo das Training keine Fakten enthält, füllt es die Lücke mit etwas, das plausibel klingt. Und die gängigen Bewertungsverfahren belohnen das Raten: Eine Forschungsarbeit von OpenAI zeigt, dass ein Modell, das bei Unsicherheit tippt, in den üblichen Tests besser abschneidet als eines, das sich enthält, weil „weiß ich nicht“ null Punkte bringt und ein Treffer beim Raten einen (Quelle: Kalai, Nachum, Vempala, Zhang, [Why Language Models Hallucinate](https://arxiv.org/abs/2509.04664), 4. September 2025, abgerufen am 21.10.2026).

Für das Produkt folgt daraus: Das Modell wird nicht von allein vorsichtiger. Die Vorsicht muss die Oberfläche und der Ablauf einbauen.

## Welche KI-Halluzinationen im Unternehmen wirklich wehtun

Nicht jede falsche Antwort der KI ist gleich teuer. Drei Arten begegnen mir in Unternehmensprojekten am häufigsten:

- **Erfundene Quellen und Zahlen.** Die KI nennt eine Richtlinie, einen Paragrafen oder einen Preis, den es nicht gibt. Gefährlich, weil die Ausgabe nach Belegen aussieht.
- **Vermischte Fälle.** Die KI beantwortet die Frage eines Kunden mit den Daten eines anderen, weil zwei Dokumente ähnlich aussahen. Im Kundenservice und überall, wo personenbezogene Daten im Spiel sind, ist das der teuerste Fehler.
- **Veraltete Wahrheit.** Die Antwort war vor zwei Jahren richtig. Das Dokument, aus dem sie stammt, wurde nie aktualisiert. Streng genommen keine Halluzination, aber für den Nutzer dasselbe.

Die zweite und dritte Art entstehen nicht im Modell, sondern in Ihren Daten. Deshalb beginnt die Arbeit gegen Halluzinationen bei der Frage, aus welchen Quellen die KI überhaupt arbeiten darf.

## KI-Halluzinationen vermeiden und auffangen: sieben Muster

### 1. Die KI arbeitet aus Ihren Quellen, nicht aus ihrem Gedächtnis

Das technische Verfahren heißt Retrieval Augmented Generation, kurz RAG: Das System sucht zuerst die passenden Stellen in Ihren Dokumenten und lässt das Modell dann daraus antworten. Das senkt die Zahl erfundener Fakten deutlich, beseitigt sie aber nicht, weil das Modell die gefundenen Stellen immer noch falsch zusammenfassen kann. RAG ist die Grundlage, nicht die Lösung.

### 2. Die Quelle steht neben der Antwort

Jede Antwort zeigt, aus welchem Dokument und welcher Stelle sie stammt, und der Nutzer kann mit einem Klick dorthin. Bei Instructure war das eine der Leitplanken vom ersten Tag: Quellenhinweise bei jeder KI-Ausgabe, damit Lehrende sehen, worauf ein Vorschlag beruht. Ohne sichtbare Quelle prüfen die Nutzer entweder alles nach, und die Zeitersparnis ist weg, oder sie prüfen nichts, und der Fehler geht durch. Details: [Instructure-Fallstudie](/work/instructure) (Englisch).

### 3. Die Ausgabe ist ein Entwurf, kein Ergebnis

Die KI schreibt, der Mensch sendet. Das Feld ist editierbar, das Verwerfen ist ein Klick, und das Produkt zeigt nicht „fertig“, sondern „Entwurf zur Prüfung“. Dieses eine Wort in der Oberfläche verändert, wie die Nutzer mit der Ausgabe umgehen.

### 4. Enthaltung ist eine erlaubte Antwort

Wenn die Suche keine passende Stelle in Ihren Quellen findet, antwortet das System nicht aus dem allgemeinen Wissen des Modells, sondern sagt: „Dazu habe ich in den Unterlagen nichts gefunden.“ Das muss ausdrücklich gestaltet und getestet werden, denn von sich aus rät das Modell lieber. Ein System, das sich zehnmal am Tag enthält, ist besser als eines, das zehnmal am Tag überzeugend falsch liegt.

### 5. Sicherheit wird angezeigt, nicht behauptet

Bei SportsGambit stand bei jeder KI-Empfehlung ein Konfidenzwert und die bisherige Trefferquote des Agenten, damit Nutzer die Empfehlung einordnen konnten, bevor sie handeln. Die frühe Telemetrie zeigte zugleich ein Risiko: Nutzer verließen sich stark auf die KI-Vorschläge, weshalb der sichtbare Konfidenzwert und ein bewusster Prüfschritt vor jeder Aktion wichtiger wurden, nicht weniger wichtig. Ein Konfidenzwert ist kein Beweis für Richtigkeit; er sagt dem Nutzer, wie viel Prüfung die Antwort verdient. Details: [SportsGambit-Fallstudie](/work/sportsgambit) (Englisch).

### 6. Die Prüfung ist nach Folgen gestaffelt

Nicht jede Ausgabe braucht dieselbe Kontrolle. Eine interne Zusammenfassung darf die KI selbst liefern. Ein Antwortentwurf an einen Kunden wird von einem Menschen freigegeben. Alles, was Geld bewegt, eine Rechtslage berührt oder eine Entscheidung über eine Person vorbereitet, geht gar nicht erst automatisch raus. Diese Staffelung beschreibe ich ausführlicher im Artikel [Human in the Loop](/de/wissen/human-in-the-loop-ki).

### 7. Fehler werden gemessen, nicht nur erzählt

Der Pilot misst, wie oft Entwürfe umgeschrieben oder verworfen werden, wie oft das System sich enthält, und welche Fragen zu falschen Antworten führen. Diese Liste ist das wertvollste Dokument des Projekts: Sie zeigt, welche Quellen fehlen oder veraltet sind, und sie ist der Beleg, mit dem Sie gegenüber Geschäftsführung und Datenschutz zeigen, dass die Prüfung funktioniert.

## Was das für die Wahl des Modells bedeutet

Die Frage „Welche KI halluziniert am wenigsten?“ wird oft gestellt, und die Antwort ändert sich mit jeder Modellgeneration. Für ein Unternehmensprodukt ist sie zweitrangig. Ein mittelmäßiges Modell mit sauberen Quellen, sichtbaren Belegen und menschlicher Prüfung ist zuverlässiger als das beste Modell, das frei aus dem Gedächtnis antwortet. Das Modell lässt sich später austauschen; die Quellen, die Oberfläche und der Ablauf bleiben.

## Was die KI-Verordnung dazu sagt

Die EU-KI-Verordnung verlangt keine fehlerfreie KI. Sie verlangt bei Hochrisiko-Systemen menschliche Aufsicht (Artikel 14) und bei KI, die Menschen gegenübertritt, Transparenz (Artikel 50, gültig seit dem 2. August 2026). Die Muster oben sind die Gestaltungsantwort auf beide Anforderungen. Das ist die Lesart eines Produktteams, keine Rechtsberatung.

## Häufige Fragen

### Was bedeutet es, wenn eine KI halluziniert?

Das Modell erzeugt eine Ausgabe, die plausibel klingt, aber falsch ist oder durch keine Quelle gedeckt wird: ein erfundenes Zitat, eine nicht existierende Richtlinie, eine falsche Zahl. Das Modell „lügt“ nicht; es hat keinen Begriff von wahr und falsch, nur von wahrscheinlich.

### Kann man KI-Halluzinationen ganz vermeiden?

Nein. Sie lassen sich deutlich reduzieren, indem die KI aus Ihren Quellen arbeitet und sich bei fehlenden Quellen enthält, und ihre Wirkung lässt sich auffangen, indem ein Mensch die Ausgabe prüft, bevor sie wirkt. Ein Anbieter, der Ihnen eine halluzinationsfreie KI verspricht, beschreibt sein Produkt ungenau.

### Hilft RAG gegen Halluzinationen?

Ja, gegen erfundene Fakten. Nicht gegen falsche Zusammenfassungen gefundener Stellen, nicht gegen veraltete Dokumente und nicht gegen vermischte Fälle. Deshalb gehören zu RAG immer sichtbare Quellen und eine Prüfung.

### Wer haftet, wenn die KI im Unternehmen etwas Falsches sagt?

Das Unternehmen, das die Ausgabe verwendet oder an Kunden weitergibt, nicht der Modellanbieter. Genau deshalb ist die menschliche Freigabe bei Ausgaben mit Folgen keine Vorsicht, sondern die Stelle, an der die Verantwortung sitzt. Die genaue Haftungslage prüft Ihre Rechtsberatung.

### Welche KI hat die wenigsten Halluzinationen?

Das ändert sich mit jeder Modellgeneration, und für Ihren Anwendungsfall zählt nur die Messung an Ihren eigenen Dokumenten. Im Prototyp testen wir mehrere Modelle an denselben Beispielen und wählen danach, nicht nach Rangliste.

### In welcher Sprache arbeiten Sie?

Die Zusammenarbeit läuft auf Englisch oder Ungarisch. Ich arbeite mit Unternehmen in Ungarn, Deutschland und der übrigen EU; deutschsprachige Teams arbeiten mit mir auf Englisch.

## Fazit

Die Frage ist nicht, ob Ihre KI halluziniert. Sie tut es. Die Frage ist, ob Ihr Produkt so gebaut ist, dass eine falsche Antwort auffällt, bevor sie wirkt. Wenn Sie eine KI-Funktion planen oder eine bestehende prüfen lassen wollen, beschreibe ich Ihnen in einem Gespräch, welche der sieben Muster in Ihrem Fall zuerst fehlen: [Kontakt](/de/kontakt). Die Methode steht auf der Seite [KI-Beratung, Automatisierung und Entwicklung](/de/ki-beratung-entwicklung).
