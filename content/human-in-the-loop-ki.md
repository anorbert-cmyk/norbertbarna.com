---
title: "Human in the Loop: Was es im regulierten Produkt bedeutet"
description: "Human in the Loop bei KI: sieben Muster, die eine Prüfung bestehen. Kennzeichnung, editierbare Ausgaben, Quellen, Stopp. Art. 14 KI-VO."
lang: de
slug: human-in-the-loop-ki
date: 2026-10-21T10:40:00+02:00
updated: 2026-10-21T10:40:00+02:00
tags: [human in the loop, human in the loop ki, menschliche aufsicht ki, ki verordnung, ki integration, ki entwicklung]
service: /de/ki-beratung-entwicklung
service_label: KI-Beratung, Automatisierung und Entwicklung für Unternehmen
cover: /assets/images/og/writing/human-in-the-loop-ki.jpg
cover_alt: Ein gefaltetes Papierband läuft durch ein Papiertor mit einer kleinen olivfarbenen Kontrollfalte
pair: en/human-in-the-loop-ai
---
Human in the Loop bedeutet, dass ein Mensch prüft, bearbeitet oder freigibt, was ein KI-System vorschlägt, bevor es Wirkung entfaltet, und dass er es übersteuern oder stoppen kann. In einem regulierten Produkt ist das kein Häkchen am Ende des Projekts. Es ist ein Satz von Entscheidungen über die Oberfläche, die am ersten Tag getroffen werden: Was darf die KI vorschlagen, was muss ein Mensch prüfen, wie sieht er das Warum, und was passiert, wenn die Ausgabe falsch ist.

Dieser Artikel beschreibt sieben Muster, die in zwei Produkten, an denen ich gearbeitet habe, einer Prüfung standgehalten haben: KI-Funktionen in der Lernplattform von Instructure und ein KI-gestützter Prognosemarkt-MVP namens SportsGambit. Die Beispiele stammen aus diesen Projekten; die Schlussfolgerungen sind meine.

Zur Zusammenarbeit: Ich arbeite mit Teams in Deutschland und der EU, die Kommunikation läuft auf Englisch oder Ungarisch.

## Was Human in the Loop bedeutet, und was nicht

Drei Begriffe werden häufig verwendet, und sie beschreiben unterschiedlich viel menschliche Kontrolle:

- **Human in the Loop:** Ein Mensch gibt jede folgenreiche Ausgabe frei, bevor sie wirkt.
- **Human on the Loop:** Das System handelt selbst; ein Mensch überwacht und kann eingreifen.
- **Human out of the Loop:** vollständig automatisiert, Prüfung höchstens im Nachhinein.

Das sind Gestaltungsbegriffe, keine Rechtskategorien. Die richtige Stufe hängt von den Folgen einer falschen Ausgabe ab, nicht davon, wie gut das Modell ist. Ein Entwurf, den ohnehin jemand überarbeitet, verträgt ein schwächeres Modell; eine Aktion, die einen Kunden erreicht oder Geld bewegt, nicht.

Drei Dinge müssen gelten, damit ein Mensch wirklich „in the Loop“ ist: Er sieht, dass KI beteiligt war. Er kann die Ausgabe ändern oder ablehnen. Und die Entscheidung wird aufgezeichnet, sodass sich später rekonstruieren lässt, wer was auf welcher Grundlage akzeptiert hat. Fehlt eines davon, ist der Mensch nicht in der Schleife. Er schaut zu.

## Was die KI-Verordnung zur menschlichen Aufsicht verlangt

Artikel 14 der EU-KI-Verordnung verlangt, dass Hochrisiko-KI-Systeme so gestaltet sind, dass die beaufsichtigenden Personen die Fähigkeiten und Grenzen des Systems verstehen, sich des Automatisierungsbias bewusst bleiben, die Ausgabe richtig interpretieren, sie nicht verwenden oder übersteuern können, und das System über eine „Stopp“-Taste oder ein ähnliches Verfahren anhalten können (Quelle: [AI Act Service Desk, Artikel 14](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14), abgerufen am 21.10.2026).

Zum Zeitplan: Der Digital Omnibus zur KI (Verordnung (EU) 2026/1744, in Kraft seit 27. Juli 2026) hat die Pflichten für Hochrisiko-Systeme nach Anhang III auf den 2. Dezember 2027 und nach Anhang I auf den 2. August 2028 verschoben. Die Transparenzpflichten nach Artikel 50, etwa der Hinweis, dass man mit einem KI-System interagiert, gelten weiterhin seit dem 2. August 2026 (Quellen: [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/), [National Law Review](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), abgerufen am 21.10.2026). Was die Kennzeichnung konkret für Produktteams bedeutet, steht in einem eigenen Artikel: [KI-Kennzeichnungspflicht](/de/wissen/ki-kennzeichnungspflicht).

Das ist die Lesart aus Produktsicht, keine Rechtsberatung. Ob Ihr System ein Hochrisiko-System ist, klärt Ihre Rechtsabteilung. Aus Projekten, die live gegangen sind, kann ich sagen: Jede der fünf Aufsichtsfähigkeiten in Artikel 14 entspricht einer Entscheidung über die Oberfläche. Der Rest dieses Artikels sind diese Entscheidungen.

## Sieben Human-in-the-Loop-Muster, die eine Prüfung bestehen

### 1. Jede KI-Ausgabe kennzeichnen

Bei Instructure, wo ich die Funktionsgestaltung innerhalb des Canvas-Catalog-Ökosystems von Anfang bis Ende geleitet habe, Teil eines Produkts, das täglich mehrere Millionen Menschen nutzten, war die klare KI-Kennzeichnung eine Leitplanke vom ersten Tag an. Jeder KI-Vorschlag hatte ein Label, einen Bearbeitungszustand und einen Weg zurück, und nichts, was das Modell entschied, durfte unsichtbar bleiben.

Vor dem Bau entscheiden: Wortlaut des Labels, Platzierung, und ob es bestehen bleibt, nachdem ein Mensch die Ausgabe bearbeitet hat.

### 2. Erst erklären, dann vorschlagen

Das Gestaltungsprinzip bei Instructure hieß „Erklärung vor Vorschlag“: Signale und Quellen hinter einem Vorschlag zeigen, bevor der Vorschlag selbst erscheint. Wer das Warum sieht, kann urteilen; wer nur das Was sieht, kann nur vertrauen.

Entscheiden: Welchen Quellenhinweis kann der Prüfer in der verfügbaren Zeit tatsächlich nachvollziehen? Eine Fußnote, die niemand öffnet, ist Dekoration.

### 3. Ausgaben editierbar und rückgängig machbar halten

Ausgaben bei Instructure waren editierbar und rückgängig zu machen, mit ausdrücklichen Prüfzuständen: Entwurf, geprüft, veröffentlicht. Das ist die Oberflächenform von „nicht verwenden, übersteuern oder rückgängig machen“ aus Artikel 14. Eine KI-Ausgabe, die nur angenommen oder abgelehnt werden kann, drängt Menschen zum Annehmen.

### 4. Die Zustände gestalten, die niemand in der Demo zeigt

Wir haben barrierefreie Komponentenzustände für leer, laden, Fehler und Verzögerung über alle Produktvarianten ausgeliefert. In einer Prüfung beginnen die Fragen beim Fehlerzustand: Was sieht die Lehrkraft, wenn das Modell nichts, zu spät oder etwas Unzulässiges liefert? Verbirgt die Oberfläche diese Zustände, kann ein Mensch nicht prüfen, was er nicht sieht.

### 5. Konfidenz anzeigen und einen bewussten Prüfschritt behalten

Bei SportsGambit, einem Prognosemarkt-MVP mit KI-Agenten, die Tipps empfahlen, trug jeder Tipp einen Konfidenzwert, Ranglisten ließen Nutzer die Historie eines Agenten prüfen, bevor sie seinem Rat folgten, und vor jeder Aktion stand ein bewusster Prüfschritt. Frühe Produktdaten zeigten eine starke Nutzung KI-generierter Empfehlungen; wir behandelten das als Risiko, das zu beobachten ist, nicht als Erfolgskennzahl, weil blindes Vertrauen in die Automatisierung genau der Fehlerfall ist, den menschliche Aufsicht auffangen soll.

Die Fallstudie benennt auch ihre Grenze: Der MVP hat keine produktionsreifen Schutzmechanismen für Wetten validiert. Details: [SportsGambit-Fallstudie](/work/sportsgambit) (Englisch).

### 6. Recht, Compliance und Data Science früh an den Tisch holen

Bei Instructure wurden die Abläufe gemeinsam mit Recht, Compliance und Data Science geprüft und dann in wiederverwendbare Muster überführt: Prompts, Prüfzustände, Bestätigungen, Feedbackschleifen. Diese Teams standen nicht am Ende im Weg; sie haben die Leitplanken von Anfang an mitgeschrieben. Eine Leitplanke, die nach dem Design hinzukommt, ist meist ein Warndialog, den niemand liest.

Dasselbe galt in regulierter Arbeit ohne KI. Bei Raiffeisen, wo ich als Product Lead die Neugestaltung der Mobile-Banking-App verantwortete, kamen PSD2, starke Kundenauthentifizierung, KYC und Audit-Trail als nicht verhandelbare Anforderungen. Wir haben fast jeden Schritt behalten und verändert, wie es sich anfühlt, ihn zu durchlaufen. Das ist die Parallele aus regulierter Lieferung, kein KI-Beispiel. Details: [Raiffeisen-Fallstudie](/work/raiffeisen) (Englisch).

### 7. Hinter Feature-Flags ausliefern, messen, und benennen, wer stoppen darf

Funktionen bei Instructure gingen hinter Feature-Flags live, und wir haben Nutzung und Aufgabenabschluss gemessen, damit jede Iteration auf dem aufbaute, was die Daten zeigten. In meiner [KI-Beratung und -Entwicklung](/de/ki-beratung-entwicklung) wird daraus der vierte Schritt der Methode: ein begrenzter Pilot mit einer benannten Person, die ihn anhalten oder auf die vorherige Version zurücksetzen kann.

Entscheiden: Wer ist für den Stopp verantwortlich, wie schnell kann er wirken, und was wird für eine spätere Prüfung protokolliert?

## Was Sie vor dem Bau entscheiden sollten: acht Fragen

1. Was ist die Folge einer falschen Ausgabe, und für wen?
2. Was darf die KI vorschlagen, und was muss ein Mensch freigeben?
3. Was sieht der Prüfer, um die Ausgabe zu beurteilen?
4. Wie bearbeitet, verwirft oder widerruft er sie?
5. Was passiert bei leerer, fehlender oder verspäteter Ausgabe?
6. Wer kann die Funktion stoppen, und wie schnell?
7. Was wird für eine spätere Prüfung protokolliert?
8. Welche Kennzahlen entscheiden, ob der Pilot weiterläuft?

Wenn diese Fragen noch keine Antworten haben, beginnt dort die Arbeit. In meiner Methode ist der zweite Schritt, vor jedem Bau, die Festlegung von Zugriff und menschlicher Kontrolle: Was die KI vorschlagen darf, was ein Mensch prüfen muss, und was passiert, wenn eine Antwort fehlt oder falsch ist.

## Was schwierig war

Die meisten KI-Projekte beginnen mit dem, was sich automatisieren lässt. Bei Instructure haben wir mit dem begonnen, was menschlich bleiben muss. Der schwierige Teil war ethisch, nicht technisch: für den Fall zu gestalten, dass die KI irrt, verzerrt ist oder missbraucht wird, statt so zu tun, als käme das nicht vor. Daraus wird keine beeindruckende Präsentation. Daraus wird KI, die echte Institutionen für Millionen Menschen einführen können und danach ruhig schlafen. Details: [Instructure-Fallstudie](/work/instructure) (Englisch).

## Häufige Fragen

### Was bedeutet Human in the Loop bei KI?

Einen Ablauf, in dem das System vorschlägt und ein Mensch an festgelegten Punkten entscheidet, mit genug Information, um gut zu entscheiden. Der Mensch sieht, dass KI beteiligt war, kann die Ausgabe ändern oder ablehnen, und die Entscheidung wird aufgezeichnet.

### Verlangt die KI-Verordnung Human in the Loop?

Artikel 14 verlangt wirksame menschliche Aufsicht für Hochrisiko-Systeme, einschließlich der Möglichkeit, zu übersteuern und zu stoppen. Er schreibt kein bestimmtes Oberflächenmuster vor. Ob ein System Hochrisiko ist, ist eine Rechtsfrage; dieser Artikel ist keine Rechtsberatung.

### Ab wann gelten die Hochrisiko-Pflichten?

Nach dem Digital Omnibus 2026: für Anhang-III-Systeme ab 2. Dezember 2027, für Anhang-I-Systeme ab 2. August 2028. Die Transparenzpflichten nach Artikel 50 gelten seit 2. August 2026.

### Bremst menschliche Prüfung alles aus?

Sie verlagert Aufwand dorthin, wo ein Fehler am meisten kostet. Messen Sie den Prüfaufwand im Pilot: Wenn Prüfer alles in zwei Sekunden freigeben, funktioniert die Schleife nicht; dauert die Prüfung länger als die ursprüngliche Aufgabe, funktioniert die Funktion nicht.

### Kann ein kleines Team das umsetzen?

Ja. Die Muster sind Entscheidungen über die Oberfläche, keine Infrastruktur. Beginnen Sie mit einem Ablauf, einem Label, einem Bearbeitungszustand und einer benannten verantwortlichen Person.

### Was ist Automatisierungsbias?

Die Neigung, der Ausgabe eines Systems zu sehr zu vertrauen. Die gestalterische Antwort: sichtbare Konfidenz, nachprüfbare Quellen und ein bewusster Prüfschritt vor jeder Aktion.

### Arbeiten Sie mit Teams in Deutschland?

Ja. Die Zusammenarbeit läuft auf Englisch oder Ungarisch; deutschsprachige Teams arbeiten mit mir auf Englisch.

## Fazit

Aufsicht lässt sich leichter gestalten als nachrüsten. Das Produkt, das eine Prüfung besteht, ist das, in dem jede KI-Ausgabe schon ein Label, einen Bearbeitungszustand und einen Weg zurück hatte. Bringen Sie den Ablauf und die Entscheidung mit, die Ihnen Sorgen macht, und [dort fangen wir an](/de/kontakt).
