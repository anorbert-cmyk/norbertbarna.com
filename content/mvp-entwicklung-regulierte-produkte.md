---
title: "MVP-Entwicklung für regulierte Produkte: Was echt sein muss"
description: "MVP-Entwicklung in Fintech, Gesundheit und regulierten Märkten: was Sie weglassen dürfen, was am ersten Tag echt sein muss, und wie."
lang: de
slug: mvp-entwicklung-regulierte-produkte
date: 2026-10-21T10:10:00+02:00
updated: 2026-11-28T12:00:00+01:00
tags: [mvp entwicklung, mvp software, mvp entwickeln lassen, minimum viable product, ki entwicklung, webentwicklung]
service: /de/mvp-entwicklung
service_label: MVP-Entwicklung für regulierte Produkte
cover: /assets/images/og/writing/mvp-entwicklung-regulierte-produkte.jpg
cover_alt: Eine kleine, sauber gefaltete Papierform auf einem festen dunkelgrünen Papiersockel, drumherum Platz für weitere Faltungen: MVP-Entwicklung für regulierte Produkte
pair: [en/mvp-development-regulated-products, hu/mvp-fejlesztes-szabalyozott-termekhez]
---
Ein MVP, ein Minimum Viable Product, ist die kleinste Version eines Produkts, mit der sich eine zentrale Annahme an echten Nutzern prüfen lässt. In der MVP-Entwicklung für einen regulierten Markt, etwa bei Zahlungen, Gesundheit, Versicherungen oder Glücksspiel, gilt das Prinzip genauso, aber mit einer Einschränkung: Was Sie weglassen dürfen, ist der Funktionsumfang. Was Sie nicht weglassen dürfen, ist alles, was Vertrauen und Zulässigkeit betrifft: Identitätsprüfung, Einwilligung, Datenschutz, sichere Bestätigung folgenreicher Aktionen, Nachvollziehbarkeit. Diese Dinge sind am ersten Tag echt, oder das Produkt darf nicht an echte Nutzer.

Dieser Artikel beschreibt, wie sich MVP-Entwicklung in regulierten Produkten von der im Startup-Lehrbuch unterscheidet, was in zwei Projekten, an denen ich gearbeitet habe, am ersten Tag echt sein musste, und wie der Ablauf von der Hypothese bis zum ersten Nutzer aussieht.

Zur Zusammenarbeit vorab: Ich arbeite mit Unternehmen in Deutschland und der EU; die Kommunikation läuft auf Englisch oder Ungarisch.

## Kurz gesagt: MVP-Entwicklung im regulierten Markt

- **Definition:** Ein MVP ist die kleinste funktionsfähige Version eines Produkts, mit der sich eine zentrale Annahme an echten Nutzern prüfen lässt.
- **Die Regel:** Fassade erlaubt, Fundament nicht. Weglassen dürfen Sie Nebenfunktionen, Hintergrundautomatisierung, Skalierung und Design-Feinschliff.
- **Am ersten Tag echt:** Identitätsprüfung und Einwilligung, die Bestätigung folgenreicher Aktionen, Datenschutz im Code, vollständige Protokolle, und bei KI Kennzeichnung, Prüfschritt und Konfidenz.
- **Prototyp oder MVP:** Ein Prototyp ist nicht funktionsfähig und geht nicht an echte Nutzer; er testet die kritischen Abläufe, bevor Pflichten greifen. Deshalb kommt er in regulierten Produkten vor dem MVP.
- **KI-Verordnung (EU) 2024/1689:** Die Hinweispflicht nach Artikel 50 gilt seit dem 2. August 2026 auch für ein MVP, und zwar nach Absatz 5 spätestens bei der ersten Interaktion. Die Hochrisiko-Pflichten nach Anhang III, zu deren Anwendungsfällen die Europäische Kommission die Kreditwürdigkeitsprüfung zählt, gelten ab dem 2. Dezember 2027.

## Was ist ein MVP, und was darf es in regulierten Märkten nicht sein?

Die Lean-Startup-Idee hinter dem MVP: Bauen, messen, lernen, in kurzen Schleifen, mit so wenig Aufwand wie möglich. Eine Landingpage, ein Klick-Dummy, eine von Hand bediente Fassade reichen oft, um zu prüfen, ob jemand das Produkt will.

In regulierten Märkten gibt es zwei Grenzen. Erstens: Sobald echte Nutzer echtes Geld, echte Gesundheitsdaten oder echte Identitäten einbringen, greifen Pflichten, die kein MVP-Status aufhebt: Datenschutz-Grundverordnung, Zahlungsdienste-Regeln wie PSD2 mit starker Kundenauthentifizierung, Geldwäscheprävention mit Identitätsprüfung, je nach Produkt die KI-Verordnung (EU) 2024/1689 (Quelle: [EUR-Lex, Verordnung (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), abgerufen am 22. Oktober 2026). Zweitens: In diesen Märkten ist Vertrauen die Annahme, die geprüft wird. Ein MVP, das bei der Bestätigung einer Zahlung unsicher wirkt, misst nicht, ob die Idee gut ist, sondern nur, dass die Nutzer dem Produkt nicht trauen.

Daraus folgt die Trennung, die dieser Artikel vorschlägt: **Fassade erlaubt, Fundament nicht.**

## Was weggelassen werden darf

- Nebenfunktionen, die nicht Teil der zentralen Annahme sind: Einstellungen, Exporte, Statistiken, Mehrsprachigkeit.
- Automatisierung im Hintergrund. Vieles, was später ein System erledigt, kann im MVP ein Mensch tun, solange der Nutzer es nicht merkt und keine Pflicht verletzt wird.
- Skalierung. Ein MVP muss hundert Nutzer tragen, nicht hunderttausend.
- Perfektion im Design. Klar und konsistent ja, ausgefeilt nein.

## Was am ersten Tag echt sein muss

### 1. Identität und Einwilligung

Wer sich anmeldet, muss es wirklich sein, wenn das Produkt es verlangt, und muss wissen, wozu er einwilligt. Bei Benker, einer Banking-Plattform mit Blockchain-Infrastruktur, habe ich den gesamten Einstieg verantwortet: Onboarding, KYC-Prüfung, Kartenanbindung mit 3DS-Bestätigung. Nichts davon war im MVP ein Platzhalter. Die Arbeit lag darin, die Pflichtschritte so zu gestalten, dass Menschen, die nie ein Bankkonto per App eröffnet hatten, sie verstanden und durchkamen: klare Anleitung, Fortschritt sichtbar, Fehler erklärt, Weg zurück vorhanden. Details: [Benker-Fallstudie](/de/arbeit/benker).

### 2. Bestätigung folgenreicher Aktionen

Einzahlen, Ausführen, Abheben. Jede dieser Aktionen braucht eine Bestätigung, die zeigt, was passiert, was es kostet und ob es rückgängig gemacht werden kann. Bei Benker haben wir für alle Zustände, offen, ausstehend, erfolgreich, fehlgeschlagen, eskaliert, eine einheitliche Darstellung eingeführt, damit sich das Produkt überall gleich verhält. Das klingt nach Feinschliff, ist aber Fundament: Ein Nutzer, der nicht weiß, ob seine Überweisung unterwegs ist, ruft den Support an oder geht.

### 3. Datenschutz im Code, nicht in der Richtlinie

Einwilligung vor dem Tracking, Datensparsamkeit, verschlüsselte Übertragung, eine strenge Content Security Policy. Bei der Gesundheitsplattform Kineticare, die ich entworfen und gebaut habe, bleiben Analysewerkzeuge aus, bis der Besucher zustimmt, und die Anwendung liefert eine strikte Sicherheitsrichtlinie mit aus. Ein Gesundheitsprodukt trägt mehr Datenschutzrisiko als eine Portfolioseite, und das muss im Code stimmen, nicht auf einer Seite mit Rechtstexten. Details: [Kineticare-Fallstudie](/de/arbeit/kineticare).

### 4. Nachvollziehbarkeit

Wer hat wann was freigegeben, welche Version der Bedingungen hat der Nutzer akzeptiert, welche Entscheidung hat ein System getroffen. Diese Protokolle lassen sich nicht nachträglich erzeugen. Im MVP dürfen sie einfach sein, aber sie müssen von Anfang an vollständig sein.

### 5. Bei KI: Kennzeichnung, Prüfung, Konfidenz

Bei SportsGambit, einem KI-gestützten Prognosemarkt-MVP, stand bei jeder Empfehlung ein Konfidenzwert und die Erfolgsgeschichte des Agenten, und vor jeder Aktion gab es einen bewussten Prüfschritt. Die frühe Telemetrie zeigte, dass Nutzer sich stark auf die KI-Vorschläge verließen, was wir als Risiko behandelt haben, nicht als Erfolg. Die Fallstudie zieht dazu eine klare Grenze: Sie beschreibt die Informationsarchitektur und die Erklärbarkeit des MVP und behauptet nicht, dass produktionsreife Schutzmaßnahmen für Echtgeld-Wetten ausgeliefert wurden. Vor einem Start mit echtem Geld wären Alters- und Standortprüfung, Einzahlungs- und Verlustlimits, Sperrmöglichkeiten und eine rechtliche Prüfung Startvoraussetzungen. Details: [SportsGambit-Fallstudie](/de/arbeit/sportsgambit).

## Der Ablauf: von der Hypothese zum ersten Nutzer

1. **Die eine Annahme benennen.** Was muss wahr sein, damit das Produkt Sinn ergibt? Ein Satz, messbar.
2. **Die Pflichtliste erstellen.** Welche Regeln gelten, sobald ein echter Nutzer da ist. Diese Liste schreibt die Rechtsberatung mit, in der ersten Woche.
3. **Fassade und Fundament trennen.** Alles auf die Liste „weglassen“ oder „von Hand“, was nicht Annahme oder Pflicht ist. Alles andere wird echt gebaut.
4. **Die kritischen Abläufe zuerst entwerfen.** Onboarding, Bestätigung, Fehler, Weg zurück. Prototyp, Test mit Nutzern, Überarbeitung, bevor eine Zeile Produktcode entsteht.
5. **Bauen in kurzen Schleifen,** mit Messung von Anfang an: Wo brechen Nutzer ab, wo rufen sie an, wo zögern sie.
6. **Mit wenigen echten Nutzern starten,** hinter Zugangsbeschränkung, mit einem Verantwortlichen, der jede Woche die Zahlen liest.
7. **Entscheiden.** Ausbauen, umbauen oder einstellen, auf Basis dessen, was die Nutzer getan haben, nicht dessen, was sie gesagt haben.

: Phasen einer MVP-Entwicklung im regulierten Markt: was am Ende vorliegt und wer mitwirken muss
| Phase | Was am Ende vorliegt | Wer mitwirken muss |
| --- | --- | --- |
| Annahme und Pflichtliste (Schritte 1 und 2) | Ein messbarer Satz zur Annahme und die Liste der Pflichten ab dem ersten echten Nutzer | Produktverantwortliche und Rechtsberatung |
| Fassade und Fundament trennen (Schritt 3) | Zwei Listen: „weglassen oder von Hand“ und „echt bauen“ | Produktverantwortliche und Entwicklung |
| Prototyp der kritischen Abläufe (Schritt 4) | Mit Nutzern getestete Entwürfe für Onboarding, Bestätigung, Fehler und Weg zurück | Design und Testpersonen aus der Zielgruppe |
| Bau in kurzen Schleifen (Schritt 5) | Funktionsfähige Software mit echtem Fundament und Messung der Abbrüche | Entwicklung, Design und die Anbieter angebundener Dienste, etwa für Identitätsprüfung oder Zahlung |
| Start mit wenigen Nutzern (Schritt 6) | Verhaltensdaten echter Nutzer hinter einer Zugangsbeschränkung | Eine benannte verantwortliche Person und der Support |
| Entscheidung (Schritt 7) | Ausbauen, umbauen oder einstellen, mit den Zahlen als Begründung | Geschäftsführung und Produktverantwortliche |

## Wer entwickelt ein MVP für einen regulierten Markt?

Ein MVP in einem regulierten Markt braucht drei Rollen: jemanden, der die Abläufe gestaltet, jemanden, der sie baut, und eine Rechtsberatung, die die Pflichtliste mitschreibt. Dazu kommen die Anbieter der angebundenen Dienste, etwa für Identitätsprüfung und Zahlung. Ich übernehme Gestaltung und Entwicklung; die rechtliche Bewertung bleibt bei Ihrer Rechtsberatung, und die Entscheidung über die eine Annahme bleibt bei Ihnen.

## Was liegt am Ende einer MVP-Entwicklung vor?

Am Ende steht ein funktionsfähiges Produkt mit kleinem Funktionsumfang und vollständigem Fundament: echte Identitätsprüfung und Einwilligung, bestätigte Aktionen, Datenschutz im Code und lückenlose Protokolle. Dazu kommen die Messdaten der ersten Nutzer, also wo sie abbrechen, zögern oder den Support rufen, und eine dokumentierte Entscheidung über Ausbau, Umbau oder Einstellung. Was fehlt, steht auf der Liste „weglassen oder von Hand“ und ist damit sichtbar, nicht vergessen.

## Wovon Aufwand und Kosten abhängen, wenn Sie ein MVP entwickeln lassen

- Welche Pflichten greifen: Identitätsprüfung, Zahlungsabwicklung, Gesundheitsdaten, KI-Kennzeichnung.
- Ob Zahlungen oder Drittsysteme angebunden werden.
- Wie viel vom Fundament schon existiert, etwa ein Design-System oder eine Komponentenbibliothek.
- Zahl der Plattformen: Web, iOS, Android.
- Wie viele Nutzer der Start tragen muss.

Ich nenne keinen Festpreis, weil jedes Vorhaben individuelle Arbeit ist; der Preis ergibt sich, wenn die Pflichtliste und die eine Annahme stehen. Die Methode beschreibe ich auf der Seite [KI-Beratung, Automatisierung und Entwicklung](/de/ki-beratung-entwicklung).

## Häufige Fragen

### Was bedeutet der MVP-Ansatz?

Die kleinste Version eines Produkts bauen, mit der sich eine zentrale Annahme an echten Nutzern prüfen lässt, und dann aus dem Verhalten der Nutzer lernen, bevor mehr gebaut wird. Der Ansatz stammt aus der Lean-Startup-Methode.

### Wie lange dauert eine MVP-Entwicklung?

In regulierten Märkten je nach Pflichtliste und Integrationen einige Wochen bis einige Monate. Die Pflichtschritte, etwa Identitätsprüfung und Zahlung, bestimmen die Dauer stärker als die eigentlichen Funktionen.

### Was ist der Unterschied zwischen Prototyp und MVP?

Ein Prototyp prüft, ob Menschen einen Ablauf verstehen; er ist nicht funktionsfähig und geht nicht an echte Nutzer. Ein MVP ist funktionsfähig, geht an echte Nutzer und prüft, ob sie es nutzen. In regulierten Produkten kommt der Prototyp vor dem MVP, weil er die kritischen Abläufe ohne Pflichten testen lässt.

### Kann man ein MVP mit No-Code bauen?

Für die Fassade ja. Für Identitätsprüfung, Zahlung, Datenschutz und Protokollierung nur, wenn die Plattform diese Anforderungen nachweislich erfüllt, und das muss vorher geprüft werden, nicht nach dem Start.

### Was ist mit der KI-Verordnung bei einem KI-MVP?

Wenn Nutzer mit einer KI interagieren, gilt die Kennzeichnungspflicht nach Artikel 50 seit dem 2. August 2026 auch für ein MVP. Hochrisiko-Pflichten, etwa bei Kreditentscheidungen, gelten nach dem Digital Omnibus 2026 ab dem 2. Dezember 2027. Das ist die Lesart eines Produktteams, keine Rechtsberatung.

### In welcher Sprache arbeiten Sie?

Die Zusammenarbeit läuft auf Englisch oder Ungarisch. Ich arbeite mit Unternehmen in Ungarn, Deutschland und der übrigen EU; deutschsprachige Teams arbeiten mit mir auf Englisch.

## Fazit

Ein MVP in einem regulierten Markt ist klein im Umfang und vollständig im Fundament; das gilt für MVP-Software mit und ohne KI-Entwicklung, für eine Webanwendung genauso wie für eine App. Wenn Sie mir Ihre eine Annahme und den Markt nennen, in dem das Produkt startet, sage ich Ihnen in einem Gespräch, was auf die Pflichtliste gehört und was Sie getrost weglassen können: [Kontakt](/de/kontakt).

## Quellen

- [AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), Europäische Kommission, Abschnitte „A Risk-based Approach“ und „Application timeline“, abgerufen am 28. November 2026
- [Article 50: Transparency obligations for providers and deployers of certain AI systems](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50), AI Act Service Desk der Europäischen Kommission, abgerufen am 28. November 2026
