// Automatic confirmation sent to the person who used the contact form.
// One short mail in the visitor's page language (hu, en, de); it repeats no
// part of their message, so nothing they typed can reach a third party's
// inbox except their own name. Every value is HTML-escaped before it touches
// the markup in contact-autoreply.html.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const TEMPLATE = fs.readFileSync(path.join(__dirname, "contact-autoreply.html"), "utf8");
const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const SITE = "https://www.barnanorbert.com";
// The promise in the mail. Change it here when the real answer time changes.
const WORKING_DAYS = { hu: "két munkanapon belül", en: "within two working days", de: "innerhalb von zwei Werktagen" };

const COPY = {
  hu: {
    subject: "Megkaptam az üzenetet",
    preheader: "Köszönöm az üzenetet. Minden megkeresést személyesen olvasok és válaszolok rá.",
    eyebrow: "Az üzenet megérkezett",
    heading: (name) => `Köszönöm, ${name}.`,
    intro: (topic) => `Az üzenet megérkezett, a téma: ${topic}. Minden megkeresést személyesen olvasok, és általában ${WORKING_DAYS.hu} válaszolok.`,
    hintLabel: "Hogy az első válaszom hasznosabb legyen",
    hint: {
      web: "A válasz pontosabb lesz, ha megkapom a jelenlegi oldal címét (ha van), és azt az egy dolgot, amit az új oldalnak jobban kell tudnia.",
      ai: "A válasz pontosabb lesz, ha megkapom a gondolt folyamatot, és azt, hogy hol kell embernek jóváhagynia az eredményt.",
      role: "A válasz pontosabb lesz, ha megkapom a pozíciót, a csapatot és az időkeretet.",
      other: "A válasz pontosabb lesz, ha pár sorban megkapom, mit szeretne elérni, és mikorra.",
    },
    readLabel: "Addig is",
    reads: {
      web: ["Mennyibe kerül egy céges weboldal", "/hu/irasok/ceges-weboldal-ara"],
      ai: ["Melyik folyamattal kezdd az AI-automatizálást", "/hu/irasok/ai-automatizalas-melyik-folyamattal-kezdj"],
      role: ["Válogatott munkák", "/hu/munkak"],
      other: ["Válogatott munkák", "/hu/munkak"],
    },
    signoff: "Üdvözlettel,",
    tagline: "Weboldalak, webalkalmazások és AI-funkciók szabályozott cégeknek",
    homePath: "/hu/",
    footer: "Egyszeri, automatikus visszaigazolás: azért kapta, mert ezt a címet megadták a barnanorbert.com kapcsolati űrlapján. Ha válaszol erre a levélre, az közvetlenül hozzám érkezik. Ha nem Ön írt, hagyja figyelmen kívül, több levél nem megy.",
  },
  en: {
    subject: "I received your message",
    preheader: "Thanks for writing. I read every message myself and reply personally.",
    eyebrow: "Message received",
    heading: (name) => `Thank you, ${name}.`,
    intro: (topic) => `Your message about ${topic.toLowerCase()} reached me. I read every message myself and reply personally, usually ${WORKING_DAYS.en}.`,
    hintLabel: "To make my first reply more useful",
    hint: {
      web: "Send the address of your current site, if you have one, and the one thing the new site must do better.",
      ai: "Send the process you have in mind and the points where a person must approve the result.",
      role: "Send the role, the team and your timeline.",
      other: "Send a few lines on what you want to achieve and by when.",
    },
    readLabel: "While you wait",
    reads: {
      web: ["How much does a business website cost", "/writing/how-much-does-a-business-website-cost"],
      ai: ["Which process to automate with AI first", "/writing/which-process-to-automate-with-ai-first"],
      role: ["Selected work", "/works"],
      other: ["Selected work", "/works"],
    },
    signoff: "Best,",
    tagline: "Websites, web applications and AI features for regulated companies",
    homePath: "/",
    footer: "This is a one-time automatic confirmation. You received it because this address was entered in the contact form at barnanorbert.com. If you reply to this email it comes straight to me. If you did not write to me, ignore it; nothing further will be sent.",
  },
  de: {
    subject: "Ihre Nachricht ist angekommen",
    preheader: "Danke für Ihre Nachricht. Ich lese jede Anfrage selbst und antworte persönlich.",
    eyebrow: "Nachricht erhalten",
    heading: (name) => `Danke, ${name}.`,
    intro: (topic) => `Ihre Nachricht zum Thema ${topic} ist angekommen. Ich lese jede Anfrage selbst und antworte persönlich, in der Regel ${WORKING_DAYS.de}.`,
    hintLabel: "Damit meine erste Antwort hilfreicher wird",
    hint: {
      web: "Schicken Sie die Adresse Ihrer aktuellen Website, falls es eine gibt, und das eine, was die neue Seite besser können muss.",
      ai: "Schicken Sie den Prozess, den Sie im Blick haben, und die Stellen, an denen ein Mensch das Ergebnis freigeben muss.",
      role: "Schicken Sie die Rolle, das Team und Ihren Zeitrahmen.",
      other: "Schicken Sie ein paar Zeilen dazu, was Sie erreichen möchten und bis wann.",
    },
    readLabel: "Bis dahin",
    reads: {
      web: ["Was kostet eine Website", "/de/wissen/was-kostet-eine-website"],
      ai: ["Welcher Prozess zuerst mit KI automatisiert wird", "/de/wissen/ki-automatisierung-erster-prozess"],
      role: ["Ausgewählte Arbeiten", "/de/arbeiten"],
      other: ["Ausgewählte Arbeiten", "/de/arbeiten"],
    },
    signoff: "Beste Grüße",
    tagline: "Websites, Webanwendungen und KI-Funktionen für regulierte Unternehmen",
    homePath: "/de/",
    footer: "Dies ist eine einmalige automatische Bestätigung. Sie erhalten sie, weil diese Adresse im Kontaktformular auf barnanorbert.com eingegeben wurde. Wenn Sie auf diese E-Mail antworten, kommt die Antwort direkt zu mir. Falls nicht Sie geschrieben haben, ignorieren Sie sie; es folgt keine weitere Nachricht.",
  },
};

function composeAutoReply({ name, topic, lang }, topics) {
  const language = COPY[lang] ? lang : "en";
  const copy = COPY[language];
  const key = copy.hint[topic] ? topic : "other";
  const topicLabel = topics[key][language];
  const [readTitle, readPath] = copy.reads[key];
  const shortName = String(name).slice(0, 60);
  const values = {
    LANG: language,
    SUBJECT: escapeHtml(copy.subject),
    PREHEADER: escapeHtml(copy.preheader),
    EYEBROW: escapeHtml(copy.eyebrow),
    HEADING: escapeHtml(copy.heading(shortName)),
    INTRO: escapeHtml(copy.intro(topicLabel)),
    HINT_LABEL: escapeHtml(copy.hintLabel),
    HINT: escapeHtml(copy.hint[key]),
    READ_LABEL: escapeHtml(copy.readLabel),
    READ_TITLE: escapeHtml(readTitle),
    READ_URL: escapeHtml(SITE + readPath),
    SIGNOFF: escapeHtml(copy.signoff),
    TAGLINE: escapeHtml(copy.tagline),
    HOME_PATH: escapeHtml(copy.homePath),
    FOOTER: escapeHtml(copy.footer),
  };
  const html = TEMPLATE.replace(/\{\{\{([A-Z_]+)\}\}\}/g, (match, k) => (Object.hasOwn(values, k) ? values[k] : ""));
  const text = [
    copy.heading(shortName),
    "",
    copy.intro(topicLabel),
    "",
    `${copy.hintLabel}:`,
    copy.hint[key],
    "",
    `${copy.readLabel}: ${readTitle}`,
    SITE + readPath,
    "",
    copy.signoff,
    "Norbert Barna",
    copy.tagline,
    `${SITE}${copy.homePath}`,
    "",
    copy.footer,
  ].join("\n");
  return { subject: copy.subject, text, html };
}

module.exports = { composeAutoReply };
