---
title: "KI und Datenschutz: DSGVO-konforme KI durch Gestaltung"
description: "KI und Datenschutz: welche DSGVO-Fragen ein KI-Projekt stellt und wie Produktteams sie durch Gestaltung statt durch Papier beantworten."
lang: de
slug: ki-datenschutz-dsgvo
date: 2026-10-21T10:05:00+02:00
updated: 2026-10-21T10:05:00+02:00
tags: [ki datenschutz, dsgvo ki, dsgvo konforme ki, ki dsgvo konform, chatgpt dsgvo, datenschutz-folgenabschätzung]
service: /de/ki-beratung-entwicklung
service_label: KI-Beratung, Automatisierung und Entwicklung für Unternehmen
cover: /assets/images/og/writing/ki-datenschutz-dsgvo.jpg
cover_alt: Eine gefaltete Papierhülle, die eine kleinere Papierform nur halb freigibt, mit einem olivfarbenen Riegel davor
pair: null
---
Kein KI-Werkzeug ist von sich aus DSGVO-konform. Konform oder nicht ist die Art, wie Sie es einsetzen: welche Daten hineingehen, auf welcher Rechtsgrundlage, bei welchem Anbieter, mit welcher Protokollierung und mit welcher Kontrolle durch Menschen. Die gute Nachricht für Produktteams: Die meisten dieser Fragen lassen sich durch Gestaltung beantworten, nicht durch Papier. Eine KI-Funktion, die nur die nötigen Daten sieht, ihre Quellen zeigt, ihre Ausgaben prüfen lässt und protokolliert, was sie getan hat, erfüllt einen großen Teil der Anforderungen schon durch ihren Aufbau.

Dieser Artikel ordnet die Fragen, die bei KI und Datenschutz im Unternehmen aufkommen, und zeigt an Beispielen aus meiner Produktarbeit, welche Designentscheidung welche Frage beantwortet. Es ist die Lesart eines Produktteams, keine Rechtsberatung; die Rechtsgrundlage, die Folgenabschätzung und der Vertrag mit dem Anbieter sind Sache Ihres Datenschutzbeauftragten und Ihrer Rechtsberatung.

Zur Zusammenarbeit vorab: Ich arbeite mit Unternehmen in Deutschland und der EU; die Kommunikation läuft auf Englisch oder Ungarisch.

## Was Datenschutz mit KI zu tun hat

Die Datenschutz-Grundverordnung gilt für jede Verarbeitung personenbezogener Daten, und eine KI-Funktion verarbeitet sie an drei Stellen: in den Daten, die hineingehen (die Kundenanfrage, das Dokument, der Gesprächsmitschnitt), in dem, was das Modell daraus macht (eine Zusammenfassung, eine Einschätzung, ein Profil), und in dem, was beim Anbieter bleibt (Protokolle, gegebenenfalls Trainingsdaten). Die KI-Verordnung ersetzt die DSGVO nicht, sie kommt dazu; die Datenschutzaufsicht Nordrhein-Westfalen bringt es auf den Satz „KI-Verordnung kommt, Datenschutz bleibt" (Quelle: [LDI NRW](https://www.ldi.nrw.de/ki-verordnung-kommt-datenschutz-bleibt), abgerufen am 21.10.2026).

Zum Stand der Gesetzgebung: Die EU verhandelt im Rahmen des Digital Omnibus auch Änderungen an der DSGVO; im Oktober 2026 waren diese noch im Gesetzgebungsverfahren und nicht geltendes Recht (Quelle: [BTL Rechtsanwälte](https://www.btl-recht.de/blog/eu-digital-omnibus-2026-was-sich-bei-dsgvo-und-ki-vo-aendert/), abgerufen am 21.10.2026). Dieser Artikel beschreibt die DSGVO, wie sie heute gilt.

## Sechs Fragen, die jedes KI-Projekt beantworten muss

### 1. Welche Daten sieht die KI überhaupt?

Die wichtigste Entscheidung, und sie fällt in der ersten Woche. Datenminimierung ist ein Grundsatz der DSGVO (Artikel 5), und im KI-Projekt heißt das: Die Funktion bekommt nur die Felder, die sie für ihre Aufgabe braucht. Ein Antwortentwurf für den Kundenservice braucht die Frage und die Wissensbasis, nicht die Kontohistorie des Kunden. Bei Instructure, wo ich KI-Funktionen für eine Lernplattform mit mehreren Millionen Nutzern gestaltet habe, war „Privacy by default" ein Designprinzip: Die Datenverwendung wurde offengelegt, Opt-outs und Aufbewahrungsregeln waren sichtbar, und Legal, Compliance und Data Science haben die Abläufe von Anfang an mitgeprüft, nicht am Ende. Details: [Instructure-Fallstudie](/work/instructure) (Englisch).

### 2. Auf welcher Rechtsgrundlage?

Vertrag, berechtigtes Interesse oder Einwilligung. Das entscheidet die Rechtsberatung, aber das Produkt muss die Entscheidung umsetzen können. Der Europäische Datenschutzausschuss hat in seiner Stellungnahme 28/2024 vom 17. Dezember 2024 klargestellt, dass das berechtigte Interesse beim Training und Einsatz von KI-Modellen keine Standardgrundlage ist, sondern eine dreistufige Abwägung verlangt, und dass Maßnahmen wie Pseudonymisierung und erweiterte Transparenz in diese Abwägung einfließen (Quelle: [CMS, Zusammenfassung der EDPB-Stellungnahme 28/2024](https://cms.law/en/int/legal-updates/edpb-opinion-28-2024-key-takeaways-on-processing-personal-data-in-the-context-of-ai-models), abgerufen am 21.10.2026). Für das Produktteam heißt das: Pseudonymisierung vor der Verarbeitung und sichtbare Information im Produkt sind keine Kür, sondern Teil der Rechtsgrundlage.

### 3. Wo läuft das Modell, und was behält der Anbieter?

Ein Modell in der EU bei einem Anbieter mit Auftragsverarbeitungsvertrag, der die Eingaben nicht zum Training nutzt und Protokolle nach kurzer Frist löscht, ist eine andere Lage als ein kostenloses Konsumentenwerkzeug. Die Frage „Ist ChatGPT DSGVO-konform?" lässt sich deshalb nicht pauschal beantworten; sie hängt von Vertrag, Konfiguration und Datenfluss ab. Im Projekt gehört die Anbieterprüfung in die erste Phase, bevor der erste Prototyp mit echten Daten läuft.

### 4. Trifft die KI Entscheidungen über Menschen?

Artikel 22 der DSGVO schützt vor ausschließlich automatisierten Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung. Die Gestaltungsantwort heißt Human in the Loop: Die KI bereitet vor, ein Mensch entscheidet, und das ist im Produkt sichtbar, nicht nur in der Richtlinie. Bei einer Lernplattform hieß das: Jeder KI-Vorschlag hatte eine Kennzeichnung, einen Bearbeitungszustand und einen Weg zurück; nichts, was das Modell entschied, durfte unsichtbar bleiben. Wie diese Muster aussehen, steht im Artikel [Human in the Loop](/de/wissen/human-in-the-loop-ki).

### 5. Was wird protokolliert, und wie lange?

Protokolle sind zweischneidig: Sie belegen, wer was freigegeben hat, und sie sind selbst personenbezogene Daten. Das Produkt braucht deshalb eine bewusste Entscheidung, welche Ereignisse gespeichert werden, in welcher Form, für wie lange, und wer sie sehen darf. Ein Protokoll, das jede Eingabe im Volltext aufhebt, ist kein Nachweis von Sorgfalt, sondern ein zweites Datenschutzproblem.

### 6. Braucht es eine Datenschutz-Folgenabschätzung?

Bei neuen Technologien mit voraussichtlich hohem Risiko für Betroffene verlangt Artikel 35 eine Folgenabschätzung, und viele Aufsichtsbehörden sehen KI-Einsätze mit personenbezogenen Daten als solchen Fall. Ob sie nötig ist, klärt der Datenschutzbeauftragte. Was das Produktteam liefern kann: die Beschreibung des Datenflusses, die Liste der Daten, die Grenzen der KI und die Prüfschritte durch Menschen. Wenn diese Dinge gestaltet und dokumentiert sind, ist die Folgenabschätzung eine Zusammenfassung, keine Neuerfindung.

## Datenschutz im Code: zwei Beispiele

Bei der Gesundheitsplattform Kineticare, die ich entworfen und gebaut habe, bleiben Analysewerkzeuge aus, bis der Besucher einwilligt, die Einwilligung folgt der DSGVO, und die Anwendung liefert eine strenge Content Security Policy aus. Ein Gesundheitsprodukt trägt mehr Datenschutzrisiko als eine Portfolioseite, und das muss im Code wahr sein, nicht nur auf der Datenschutzseite. Details: [Kineticare-Fallstudie](/work/kineticare) (Englisch).

Beim Mobile-Banking-Neubau von Raiffeisen, einem Projekt ohne KI, kamen Compliance und Recht mit festen Anforderungen: PSD2, starke Kundenauthentifizierung, Identitätsprüfung, Prüfpfade. Die Aufgabe war, diese Anforderungen in Gestaltung zu übersetzen, nicht in Bürokratie: klare Zustände, verständliche Sprache, keine Schritte, die der Nutzer nicht versteht. Dieselbe Übersetzung braucht ein KI-Projekt. Details: [Raiffeisen-Fallstudie](/work/raiffeisen) (Englisch).

## Checkliste für DSGVO-konforme KI im Unternehmen

1. Datenfluss aufzeichnen: Was geht hinein, was kommt heraus, was bleibt beim Anbieter.
2. Datenminimierung umsetzen: nur die nötigen Felder, Pseudonymisierung, wo möglich.
3. Anbieter prüfen: Standort, Auftragsverarbeitungsvertrag, kein Training mit Ihren Daten, Löschfristen.
4. Rechtsgrundlage festlegen, mit der Rechtsberatung, und im Produkt transparent machen.
5. Menschliche Prüfung bei allen Ausgaben mit Folgen für Personen, sichtbar in der Oberfläche.
6. Protokollierung gestalten: welche Ereignisse, welche Form, welche Frist, welcher Zugriff.
7. Betroffenenrechte vorbereiten: Auskunft, Löschung, Widerspruch müssen auch für KI-Verarbeitungen umsetzbar sein.
8. Folgenabschätzung mit dem Datenschutzbeauftragten klären, bevor echte Daten fließen.
9. Mitarbeiter anleiten: Was darf in welches Werkzeug, was nicht.

## Häufige Fragen

### Ist ChatGPT DSGVO-konform?

Nicht von sich aus. Es kommt darauf an, welche Version Sie nutzen, ob ein Auftragsverarbeitungsvertrag besteht, ob Eingaben zum Training verwendet werden und welche Daten Ihre Mitarbeiter eingeben. Ein Konsumentenkonto mit Kundendaten ist in der Regel nicht vertretbar; ein Unternehmensvertrag mit passender Konfiguration kann es sein. Das prüft Ihr Datenschutzbeauftragter.

### Wem gehören die Daten, die mit KI verarbeitet werden?

Die Verantwortung für personenbezogene Daten bleibt beim Unternehmen, das sie verarbeitet, auch wenn ein Anbieter das Modell betreibt. Was der Anbieter mit Eingaben und Ausgaben tun darf, regelt der Vertrag; ohne Vertrag gilt im Zweifel, was in seinen Nutzungsbedingungen steht, und das ist selten in Ihrem Interesse.

### Brauche ich eine Einwilligung der Kunden, um KI einzusetzen?

Nicht zwingend. Die Rechtsgrundlage kann auch der Vertrag oder ein berechtigtes Interesse sein, mit Abwägung und Transparenz. Welche Grundlage trägt, hängt vom Einsatz ab und ist eine Frage für die Rechtsberatung. Unabhängig davon verlangt die KI-Verordnung seit dem 2. August 2026, dass Menschen erfahren, wenn sie mit einer KI interagieren.

### Dürfen Mitarbeiter Kundendaten in KI-Werkzeuge eingeben?

Nur in Werkzeuge, die das Unternehmen geprüft und vertraglich abgesichert hat, und nur die Daten, die für die Aufgabe nötig sind. Eine kurze, konkrete Anweisung dazu verhindert mehr Verstöße als jede Richtlinie im Intranet.

### Was ändert sich beim Datenschutz ab 2026?

Die KI-Verordnung gilt seit dem 2. August 2026 in weiten Teilen, mit verschobenen Fristen für Hochrisiko-Systeme. Die DSGVO selbst wurde bis Oktober 2026 nicht geändert; die im Digital Omnibus vorgeschlagenen Anpassungen waren zu diesem Zeitpunkt noch im Gesetzgebungsverfahren. Dieser Artikel wird aktualisiert, wenn sich das ändert.

### In welcher Sprache arbeiten Sie?

Die Zusammenarbeit läuft auf Englisch oder Ungarisch. Ich arbeite mit Unternehmen in Ungarn, Deutschland und der übrigen EU; deutschsprachige Teams arbeiten mit mir auf Englisch.

## Fazit

DSGVO-konforme KI entsteht nicht in der Datenschutzerklärung, sondern in den Entscheidungen darüber, welche Daten die KI sieht, wer ihre Ausgaben prüft und was protokolliert wird. Wenn Sie ein KI-Vorhaben planen, beschreibe ich Ihnen in einem Gespräch, welche dieser Entscheidungen in Ihrem Fall zuerst anstehen, damit Ihr Datenschutzbeauftragter mit einem fertigen Datenfluss arbeiten kann statt mit einer Idee: [Kontakt](/de/kontakt). Die Methode steht auf der Seite [KI-Beratung, Automatisierung und Entwicklung](/de/ki-beratung-entwicklung).
