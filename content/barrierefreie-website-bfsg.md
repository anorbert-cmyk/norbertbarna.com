---
title: "Barrierefreie Website: Was das BFSG für Firmen bedeutet"
description: "Barrierefreie Website nach BFSG: wer betroffen ist, was WCAG 2.1 AA verlangt, welche Ausnahmen gelten und wie Sie die Seite umbauen."
lang: de
slug: barrierefreie-website-bfsg
date: 2026-10-21T10:15:00+02:00
updated: 2026-10-21T10:15:00+02:00
tags: [barrierefreie website, barrierefreiheitsstärkungsgesetz, bfsg, wcag 2.1, barrierefreiheit website, website barrierefrei machen]
service: /de/webentwicklung
service_label: Webentwicklung und individuelle Webanwendungen für Unternehmen
cover: /assets/images/og/writing/barrierefreie-website-bfsg.jpg
cover_alt: Eine breite gefaltete Papierrampe führt sanft zu einer Papierplattform, daneben ein kleiner olivfarbener Kontrast-Keil
pair: null
---
Eine barrierefreie Website ist seit dem 28. Juni 2025 für viele Unternehmen in Deutschland Pflicht: Das Barrierefreiheitsstärkungsgesetz (BFSG) verlangt, dass Websites und Apps, über die Verbraucher Verträge schließen, Produkte kaufen, Termine buchen oder Konten führen, barrierefrei nutzbar sind. Maßstab ist in der Praxis die Norm EN 301 549, die auf die WCAG 2.1 auf Stufe AA verweist. Eine reine Informationsseite ohne Bestell- oder Buchungsfunktion fällt nach überwiegender Lesart nicht unter das Gesetz, und Kleinstunternehmen sind bei Dienstleistungen ausgenommen.

Dieser Artikel erklärt, wer betroffen ist, was die WCAG konkret verlangen, was bei Verstößen passiert, und wie ich eine Firmenwebsite so baue, dass Barrierefreiheit kein nachträgliches Pflaster ist. Es ist die Lesart eines Produktdesigners und Entwicklers, keine Rechtsberatung; ob Ihr Angebot unter das BFSG fällt, klärt im Zweifel Ihre Rechtsberatung.

Zur Zusammenarbeit vorab: Ich arbeite mit Unternehmen in Deutschland und der EU; die Kommunikation läuft auf Englisch oder Ungarisch.

## Welche Websites müssen nach dem BFSG barrierefrei sein?

Das BFSG setzt die europäische Barrierefreiheitsrichtlinie (European Accessibility Act) um und gilt für bestimmte Produkte und Dienstleistungen, die Verbrauchern angeboten werden. Für Websites ist der wichtigste Fall der „elektronische Geschäftsverkehr": Wenn über Ihre Website Verträge mit Verbrauchern geschlossen werden, also ein Onlineshop, eine Terminbuchung mit Bezahlung, ein Kundenkonto oder ein Abo-Abschluss, ist die Website eine Dienstleistung im Sinne des Gesetzes und muss barrierefrei sein. Dazu kommen unter anderem Bankdienstleistungen, Telekommunikation, Personenverkehr und E-Books (Quellen: [Bundesfachstelle Barrierefreiheit](https://www.bundesfachstelle-barrierefreiheit.de/DE/Barrierefreiheitsstaerkungsgesetz), [IHK München](https://www.ihk-muenchen.de/ratgeber/recht/werbung-fairer-wettbewerb/barrierefreiheitsstaerkungsgesetz/), abgerufen am 21.10.2026).

Nicht erfasst sind nach dieser Lesart:

- Websites, die ausschließlich informieren, ohne Vertragsabschluss oder Buchung.
- Angebote, die sich ausschließlich an Unternehmen richten (B2B).
- Dienstleistungen von Kleinstunternehmen: weniger als zehn Beschäftigte und höchstens zwei Millionen Euro Jahresumsatz oder Bilanzsumme. Diese Ausnahme gilt nur für Dienstleistungen, nicht für Produkte.

Zwei Einschränkungen dazu. Erstens wird die Ausnahme eng ausgelegt; ein Kontaktformular allein macht keinen Geschäftsverkehr, ein Warenkorb schon. Zweitens: Auch wer nicht verpflichtet ist, hat gute Gründe für eine barrierefreie Website, denn sie ist schneller, besser auffindbar und für alle Nutzer leichter zu bedienen. Dazu unten mehr.

## Was eine barrierefreie Website nach WCAG 2.1 AA konkret erfüllen muss

Das BFSG selbst nennt keine technischen Details. Die zugehörige Verordnung (BFSGV) verweist auf die europäische Norm EN 301 549, und die wiederum auf die Web Content Accessibility Guidelines 2.1, Konformitätsstufe AA. Die WCAG ordnen ihre Kriterien vier Prinzipien zu. Übersetzt in das, was Sie auf Ihrer Website sehen würden:

### Wahrnehmbar

- Jedes informative Bild hat einen Alternativtext; dekorative Bilder sind als solche markiert.
- Text und Hintergrund haben ausreichenden Kontrast (für normalen Text ein Verhältnis von mindestens 4,5 zu 1).
- Videos haben Untertitel, und Informationen werden nicht allein über Farbe vermittelt.
- Die Seite lässt sich auf 200 Prozent vergrößern und auf einem schmalen Bildschirm nutzen, ohne dass Inhalte abgeschnitten werden.

### Bedienbar

- Alles, was mit der Maus geht, geht auch mit der Tastatur, und der Fokus ist sichtbar.
- Es gibt keine Tastaturfallen, zum Beispiel in Menüs oder Dialogen.
- Überschriften, Linktexte und Seitentitel sagen, wohin es geht; „hier klicken" reicht nicht.
- Bewegte Inhalte lassen sich anhalten.

### Verständlich

- Die Sprache der Seite ist im Code angegeben, damit Vorleseprogramme richtig aussprechen.
- Formulare erklären, was erwartet wird, und sagen bei Fehlern, was falsch war und wie es zu korrigieren ist.
- Navigation und Bezeichnungen sind auf allen Seiten gleich.

### Robust

- Der Code ist so geschrieben, dass Hilfstechnologien ihn lesen können: korrekte HTML-Struktur, beschriftete Bedienelemente, sinnvoll eingesetzte ARIA-Attribute.

Wer die Liste liest, merkt: Das meiste davon ist schlicht gutes Handwerk. Eine Website, die sauber strukturiert, gut lesbar und mit der Tastatur bedienbar ist, erfüllt einen großen Teil der WCAG von selbst.

## Was passiert, wenn die Website nicht barrierefrei ist?

Die Marktüberwachungsbehörden der Länder prüfen, Verbraucher und Verbände können Verstöße melden. Mögliche Folgen sind Aufforderungen zur Nachbesserung, Bußgelder und im äußersten Fall die Untersagung des Angebots. Hinzu kommt das wettbewerbsrechtliche Risiko: Ein Mitbewerber kann eine nicht barrierefreie Verkaufsseite abmahnen. Welche Folge im Einzelfall droht, hängt von Schwere und Dauer des Verstoßes ab; die genaue Einordnung ist Sache Ihrer Rechtsberatung.

Zur Vollständigkeit: Für Dienstleistungsverträge, die vor dem 28. Juni 2025 geschlossen wurden, sieht das Gesetz eine Übergangsregel vor, die nach meiner Lektüre bis Juni 2030 reicht. Eine neue Website oder ein neuer Shop fällt nicht darunter.

## Barrierefreiheit ist eine Gestaltungsentscheidung, keine Nachrüstung

Die teuerste Art, eine Website barrierefrei zu machen, ist die nachträgliche: eine fertige Seite durch ein Prüfwerkzeug schicken und dann Hunderte Fehler einzeln beheben, oft mit einem „Overlay"-Skript, das die Probleme überdeckt statt löst. Die günstigste Art ist, Barrierefreiheit von Anfang an als Teil des Designs zu behandeln.

Zwei Beispiele aus meiner Arbeit. Bei Instructure haben wir KI-Funktionen für eine Lernplattform gestaltet, die Hochschulen, Gesundheitseinrichtungen und öffentliche Träger nutzen; dort war Barrierefreiheit keine Option, sondern Vertragsbedingung. Jede neue Oberfläche wurde gegen WCAG 2.1 AA geprüft, mit Tastaturführung, semantischer Struktur und Vorleseprogrammen, und zwar in allen Zuständen: leer, geladen, Fehler, Wartezeit. Details: [Instructure-Fallstudie](/work/instructure) (Englisch). Beim Mobile-Banking-Neubau von Raiffeisen haben wir eine Komponentenbibliothek aufgebaut, die WCAG-fähig war, bevor die erste Seite entstand: Kontraste, Fokuszustände und Beschriftungen steckten in den Bausteinen, nicht in jeder Seite einzeln. Details: [Raiffeisen-Fallstudie](/work/raiffeisen) (Englisch).

Die Lehre für eine Firmenwebsite: Barrierefreiheit gehört in die Bausteine, das Design-System und die Inhaltsregeln. Dann ist sie auf jeder neuen Seite automatisch da, und ein Relaunch zerstört sie nicht.

## So machen Sie eine bestehende Firmenwebsite barrierefrei

1. **Klären Sie, ob und welche Teile betroffen sind.** Shop, Buchung, Kundenkonto, Formulare mit Vertragsabschluss. Priorisieren Sie diese Pfade.
2. **Prüfen Sie automatisch und manuell.** Werkzeuge wie axe oder Lighthouse finden nur einen Teil der Probleme; den Rest findet nur ein Mensch mit Tastatur und Vorleseprogramm, der versucht, einen Kauf abzuschließen.
3. **Beheben Sie die Grundlagen zuerst.** Struktur, Kontraste, Alternativtexte, Tastaturbedienung, Formularfehler. Diese fünf Punkte decken die meisten Beschwerden ab.
4. **Legen Sie Regeln für die Redaktion fest.** Wer Inhalte einpflegt, braucht eine kurze Anleitung: Alternativtexte, Überschriftenreihenfolge, Linktexte. Sonst ist die Seite nach drei Monaten wieder voller Barrieren.
5. **Veröffentlichen Sie eine Erklärung zur Barrierefreiheit.** Das BFSG verlangt für Dienstleistungen Informationen darüber, wie die Anforderungen erfüllt werden; die gehören auf die Website, mit einer Kontaktmöglichkeit für Rückmeldungen.
6. **Prüfen Sie nach jedem größeren Umbau erneut.** Barrierefreiheit ist ein Zustand, der gepflegt werden muss, kein Zertifikat.

## Warum sich eine barrierefreie Website auch ohne Pflicht lohnt

- **Auffindbarkeit.** Saubere Überschriftenstruktur, Alternativtexte und sprechende Linktexte sind dieselben Dinge, die Suchmaschinen und KI-Suchsysteme zum Verstehen einer Seite brauchen.
- **Geschwindigkeit.** Barrierefreie Seiten verzichten auf überladene Skripte und laden schneller.
- **Mehr Nutzer.** Menschen mit Sehschwäche, motorischen Einschränkungen oder schlicht mit der Sonne auf dem Handybildschirm bedienen die Seite leichter.
- **Weniger Support.** Verständliche Formulare mit klaren Fehlermeldungen erzeugen weniger Anrufe. Diesen Zusammenhang haben wir bei Raiffeisen gesehen, wo der Kundenservice meldete, welche Fehler tatsächlich zu Anrufen führten.

## Häufige Fragen

### Wer ist zur Erstellung barrierefreier Websites verpflichtet?

Anbieter von Produkten und Dienstleistungen für Verbraucher, die unter das BFSG fallen: vor allem Onlineshops und Websites, über die Verträge geschlossen oder Buchungen mit Zahlung vorgenommen werden, dazu Banken, Telekommunikation, Personenverkehr und E-Books. Öffentliche Stellen unterliegen eigenen Regeln (BITV 2.0).

### Für wen gilt das Barrierefreiheitsstärkungsgesetz nicht?

Für Kleinstunternehmen, die Dienstleistungen anbieten (weniger als zehn Beschäftigte und höchstens zwei Millionen Euro Umsatz oder Bilanzsumme), für reine B2B-Angebote und für Websites ohne Vertragsabschluss oder Buchung. Die Ausnahmen werden eng ausgelegt.

### Muss eine reine Informationswebsite barrierefrei sein?

Nach überwiegender Lesart nicht, solange darüber keine Verträge geschlossen werden. Sobald ein Shop, eine kostenpflichtige Buchung oder ein Kundenkonto dazukommt, ändert sich das.

### Reicht ein Barrierefreiheits-Overlay oder Plugin?

Nein. Overlays legen eine Bedienhilfe über die Seite, beheben aber die Fehler im Code nicht, und viele Nutzer von Hilfstechnologien schalten sie ab. Barrierefreiheit entsteht in Struktur, Design und Inhalt der Seite selbst.

### Wie prüfe ich, ob meine Website barrierefrei ist?

Automatisch mit Werkzeugen wie axe oder Lighthouse, manuell mit der Tastatur (ohne Maus durch den Kaufprozess) und mit einem Vorleseprogramm wie NVDA oder VoiceOver. Die manuelle Prüfung findet, was die Werkzeuge nicht sehen.

### In welcher Sprache arbeiten Sie?

Die Zusammenarbeit läuft auf Englisch oder Ungarisch. Ich arbeite mit Unternehmen in Ungarn, Deutschland und der übrigen EU; deutschsprachige Teams arbeiten mit mir auf Englisch.

## Fazit

Das BFSG hat Barrierefreiheit für viele Unternehmenswebsites zur Pflicht gemacht, aber die eigentliche Erkenntnis ist älter als das Gesetz: Eine Website, die für alle bedienbar ist, ist eine bessere Website. Wenn Sie wissen wollen, wo Ihre Seite heute steht, schicken Sie mir die Adresse, und ich sage Ihnen nach einer ersten Prüfung, welche drei Punkte zuerst anstehen: [Kontakt](/de/kontakt). Wie ich Websites mit Barrierefreiheit von Anfang an baue, steht auf der Seite [Webentwicklung](/de/webentwicklung).
