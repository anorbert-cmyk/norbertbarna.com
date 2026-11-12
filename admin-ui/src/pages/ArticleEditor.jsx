import React, { useEffect, useMemo, useRef, useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Card } from "@astryxdesign/core/Card";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useToast } from "@astryxdesign/core/Toast";
import { api, messageOf } from "../api.js";
import { go } from "../App.jsx";
import { CheckList, LoadError, Loading, PageHeader, Score } from "../ui.jsx";

const SECTION = { hu: "/hu/irasok", en: "/writing", de: "/de/wissen" };
const SERVICES = {
  hu: [["/hu/webfejlesztes", "Weboldal készítés és egyedi webfejlesztés cégeknek"], ["/hu/ai-tanacsadas-fejlesztes", "AI tanácsadás és fejlesztés"]],
  en: [["/web-development", "Web development"], ["/ai-integration", "AI integration"]],
  de: [["/de/webentwicklung", "Webentwicklung"], ["/de/ki-beratung-entwicklung", "KI-Beratung und Entwicklung"]],
};
const pad = (n) => String(n).padStart(2, "0");
function nowStamp() {
  const d = new Date();
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}
const slugify = (value) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const EMPTY = { title: "", description: "", lang: "hu", slug: "", date: "", updated: "", tags: "", service: "", service_label: "", cover: "", cover_alt: "", pair: "", draft: true, body: "" };

// Frontmatter exactly as scripts/writing-content.mjs reads it.
const needsQuotes = (value) => /^[\["']|^(?:true|false|null)$|^\s|\s$/.test(value);
const scalar = (value, always = false) => (always || needsQuotes(value) ? JSON.stringify(value) : value);
const listItem = (value) => (/[,\[\]"']/.test(value) ? JSON.stringify(value) : value);
function serialise(form) {
  const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const pairs = form.pair.split(",").map((pair) => pair.trim()).filter(Boolean);
  const lines = [
    form.draft ? "draft: true" : null,
    `title: ${scalar(form.title.trim(), true)}`,
    `description: ${scalar(form.description.trim(), true)}`,
    `lang: ${form.lang}`,
    `slug: ${form.slug.trim()}`,
    `date: ${form.date.trim()}`,
    `updated: ${form.updated.trim()}`,
    `tags: [${tags.map(listItem).join(", ")}]`,
    form.service ? `service: ${form.service}` : null,
    form.service && form.service_label.trim() ? `service_label: ${scalar(form.service_label.trim())}` : null,
    form.cover.trim() ? `cover: ${form.cover.trim()}` : null,
    form.cover.trim() && form.cover_alt.trim() ? `cover_alt: ${scalar(form.cover_alt.trim())}` : null,
    pairs.length === 1 ? `pair: ${pairs[0]}` : pairs.length > 1 ? `pair: [${pairs.join(", ")}]` : null,
  ].filter(Boolean);
  return `---\n${lines.join("\n")}\n---\n${form.body.replace(/^\n+/, "").replace(/\s+$/, "")}\n`;
}
function formOf(data, body) {
  return {
    ...EMPTY,
    title: data.title || "", description: data.description || "", lang: data.lang || "hu", slug: data.slug || "",
    date: data.date || "", updated: data.updated || "", tags: (data.tags || []).join(", "),
    service: data.service || "", service_label: data.service_label || "", cover: data.cover || "", cover_alt: data.cover_alt || "",
    pair: [data.pair].flat().filter(Boolean).join(", "), draft: data.draft === true, body: body || "",
  };
}

function CharCount({ value, min, max }) {
  const length = value.trim().length;
  const ok = length >= min && length <= max;
  return <Badge variant={ok ? "success" : "warning"} label={`${length} / ${min === max ? max : `${min}–${max}`}`} />;
}

export function ArticleEditor({ file }) {
  const isNew = !file;
  const showToast = useToast();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [ahead, setAhead] = useState(false);
  const [canPublish, setCanPublish] = useState(true);
  const [check, setCheck] = useState({ state: "idle" });
  const [tab, setTab] = useState("seo");
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const slugTouched = useRef(!isNew);
  const fileInput = useRef(null);

  useEffect(() => {
    api("/overview").then((overview) => setCanPublish(overview.setup.publishing), () => {});
    if (isNew) {
      const stamp = nowStamp();
      setForm({ ...EMPTY, date: stamp, updated: stamp });
      return;
    }
    api(`/articles/source?file=${encodeURIComponent(file)}`).then((found) => { setForm(formOf(found.data, found.body)); setAhead(found.ahead); }, setLoadError);
  }, [file]);

  const source = useMemo(() => (form ? serialise(form) : ""), [form]);

  // Live check against the real build rules, shortly after typing stops.
  useEffect(() => {
    if (!form) return undefined;
    const timer = setTimeout(() => {
      setCheck((previous) => ({ ...previous, state: "checking" }));
      api("/articles/validate", { method: "POST", body: { source, previousFile: file || undefined, cover: cover ? { name: cover.name, base64: cover.base64 } : undefined } })
        .then((result) => setCheck({ state: "ok", result }), (error) => setCheck({ state: "error", message: error.data?.error && error.status === 422 ? error.data.error : messageOf(error) }));
    }, 700);
    return () => clearTimeout(timer);
  }, [source, cover]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (loadError) return <LoadError error={loadError} />;
  if (!form) return <Loading />;

  const set = (key) => (value) => {
    setDirty(true);
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      if (key === "title" && !slugTouched.current) next.slug = slugify(value);
      if (key === "service") next.service_label = (SERVICES[next.lang].find(([path]) => path === value) || [])[1] || "";
      if (key === "lang") { next.service = ""; next.service_label = ""; }
      return next;
    });
  };

  const pickCover = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (picked.type !== "image/jpeg" || picked.size > 600 * 1024) {
      showToast({ type: "error", body: "A borítókép legfeljebb 600 KB-os, 1200×630 képpontos JPEG legyen." });
      return;
    }
    const bytes = new Uint8Array(await picked.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    const name = `${form.slug || "borito"}.jpg`;
    setCover({ name, base64: btoa(binary), url: URL.createObjectURL(picked) });
    setDirty(true);
    setForm((previous) => ({ ...previous, cover: `/assets/images/og/writing/${name}` }));
  };

  const publish = async (asDraft) => {
    setBusy(true);
    try {
      const payload = serialise({ ...form, draft: asDraft });
      await api("/articles/publish", { method: "POST", body: { source: payload, previousFile: file || undefined, cover: cover ? { name: cover.name, base64: cover.base64 } : undefined } });
      setDirty(false);
      showToast({ body: asDraft ? "Piszkozat elmentve. Néhány perc, mire az ellenőrzés lefut." : "Közzététel elindítva. Az ellenőrzés után pár percen belül élesben lesz." });
      go("/kozzetetel");
    } catch (error) {
      showToast({ type: "error", body: error.status === 422 ? error.data.error : messageOf(error) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api("/articles/delete", { method: "POST", body: { file } });
      setDirty(false);
      showToast({ body: "A törlés elindítva." });
      go("/kozzetetel");
    } catch (error) {
      showToast({ type: "error", body: error.status === 422 ? error.data.error : messageOf(error) });
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const analysis = check.result?.analysis;
  const valid = check.state === "ok";
  const coverUrl = cover?.url || (form.cover ? form.cover : "");

  return (
    <VStack gap={5}>
      <PageHeader
        title={isNew ? "Új cikk" : "Cikk szerkesztése"}
        subtitle={form.slug ? `${SECTION[form.lang]}/${form.slug}` : "A cím, a leírás és a fő kulcsszó adja a keresési megjelenést."}
        actions={
          <>
            <Button label="Vissza" variant="ghost" href="#/cikkek" />
            {!isNew ? <Button label="Megnyitás az oldalon" variant="secondary" href={`${SECTION[form.lang]}/${form.slug}`} target="_blank" rel="noopener" /> : null}
            <Button label="Mentés piszkozatként" variant="secondary" isDisabled={!valid || !canPublish || busy} onClick={() => publish(true)} />
            <Button label={form.draft ? "Közzététel" : "Módosítás közzététele"} variant="primary" isDisabled={!valid || !canPublish} isLoading={busy} onClick={() => publish(false)} />
          </>
        }
      />
      {!canPublish ? <Banner status="info" title="Előnézet mód" description="A mentéshez GitHub hozzáférés kell (ADMIN_GITHUB_TOKEN). Az ellenőrzés és az előnézet addig is működik." /> : null}
      {ahead ? <Banner status="info" title="Ez a legfrissebb, még élesítés alatt álló változat" description="A cikk forrása újabb, mint ami most az élő oldalon látszik." /> : null}

      <div className="editor-grid">
        <VStack gap={4}>
          <Card padding={4}>
            <VStack gap={4}>
              <Heading level={2}>Keresési megjelenés</Heading>
              <TextInput label="Cím" value={form.title} onChange={set("title")} isRequired description="Legfeljebb 60 karakter, benne a fő kulcsszó." labelTooltip="Ez lesz az oldal H1 címsora és a találati listában megjelenő cím." />
              <HStack hAlign="end"><CharCount value={form.title} min={30} max={60} /></HStack>
              <TextArea label="Meta leírás" value={form.description} onChange={set("description")} rows={3} isRequired description="105–135 karakter, benne a fő kulcsszó." />
              <HStack hAlign="end"><CharCount value={form.description} min={105} max={135} /></HStack>
              <TextInput label="Kulcsszavak (címkék)" value={form.tags} onChange={set("tags")} isRequired description="Vesszővel elválasztva, 3–8 darab. Az első a fő kulcsszó, erre optimalizál a cikk." />
              <Grid columns={{ minWidth: 220 }} gap={4}>
                <Selector label="Nyelv" value={form.lang} onChange={set("lang")} options={[{ value: "hu", label: "Magyar" }, { value: "en", label: "Angol" }, { value: "de", label: "Német" }]} isDisabled={!isNew} />
                <TextInput label="Slug (URL-rész)" value={form.slug} onChange={(value) => { slugTouched.current = true; set("slug")(value); }} isRequired description="Kisbetű, szám, kötőjel." />
              </Grid>
            </VStack>
          </Card>

          <Card padding={4}>
            <VStack gap={3}>
              <Heading level={2}>Tartalom</Heading>
              <Text type="supporting" color="secondary">Markdown: ## és ### alcímek, listák, táblázat, **félkövér**, *dőlt*, [link](/utvonal). Az első bekezdés a közvetlen válasz; a „Gyakori kérdések” rész ### kérdéseiből FAQ schema lesz.</Text>
              <div className="markdown-input">
                <TextArea label="Cikk szövege" isLabelHidden value={form.body} onChange={set("body")} rows={28} />
              </div>
            </VStack>
          </Card>

          <Card padding={4}>
            <VStack gap={4}>
              <Heading level={2}>Kapcsolatok és megjelenés</Heading>
              <Selector label="Kapcsolódó szolgáltatásoldal" value={form.service || "none"} onChange={(value) => set("service")(value === "none" ? "" : value)} options={[{ value: "none", label: "Nincs" }, ...SERVICES[form.lang].map(([value, label]) => ({ value, label }))]} description="A cikk végi felhívás erre az oldalra vezet." />
              <TextInput label="Fordítások (pair)" value={form.pair} onChange={set("pair")} description="A cikk más nyelvű változatai, pl. de/was-kostet-eine-website. Több is megadható vesszővel; a párnak vissza kell hivatkoznia." isOptional />
              <Grid columns={{ minWidth: 220 }} gap={4}>
                <TextInput label="Megjelenés dátuma" value={form.date} onChange={set("date")} isRequired description="Pl. 2026-11-12T09:00:00+01:00" />
                <TextInput label="Utolsó frissítés" value={form.updated} onChange={set("updated")} isRequired endContent={<Button label="Most" size="sm" variant="ghost" onClick={() => set("updated")(nowStamp())} />} />
              </Grid>
              <VStack gap={2}>
                <Text weight="medium">Borítókép</Text>
                {coverUrl ? <img className="cover-thumb" src={coverUrl} alt="" /> : <Text color="secondary">Nincs saját borítókép; az alapértelmezett kép jelenik meg megosztáskor.</Text>}
                <HStack gap={2}>
                  <input ref={fileInput} type="file" accept="image/jpeg" hidden onChange={pickCover} />
                  <Button label={coverUrl ? "Kép cseréje" : "Kép feltöltése"} variant="secondary" size="sm" onClick={() => fileInput.current?.click()} />
                  {form.cover ? <Button label="Kép eltávolítása" variant="ghost" size="sm" onClick={() => { setCover(null); setDirty(true); setForm((previous) => ({ ...previous, cover: "", cover_alt: "" })); }} /> : null}
                </HStack>
                <Text type="supporting" color="secondary">1200×630 képpontos JPEG, legfeljebb 600 KB.</Text>
                {form.cover ? <TextInput label="Borítókép leírása (alt)" value={form.cover_alt} onChange={set("cover_alt")} isRequired description="Írd le, mi látszik a képen, és szerepeljen benne a fő kulcsszó." /> : null}
              </VStack>
              <Switch label="Piszkozat" description="A piszkozat nem jelenik meg az oldalon, a sitemapben és a hírcsatornában." value={form.draft} onChange={set("draft")} />
            </VStack>
          </Card>

          {!isNew ? (
            <Card padding={4}>
              <HStack justify="between" vAlign="center" gap={3} wrap="wrap">
                <VStack gap={0.5}><Text weight="medium">Cikk törlése</Text><Text type="supporting" color="secondary">A cikk lekerül az oldalról. A korábbi változat a verziótörténetben megmarad.</Text></VStack>
                <Button label="Törlés" variant="destructive" isDisabled={!canPublish || busy} onClick={() => setConfirmDelete(true)} />
              </HStack>
            </Card>
          ) : null}
        </VStack>

        <div className="editor-side">
          <Card padding={4}>
            <VStack gap={3}>
              <HStack justify="between" vAlign="center">
                <Heading level={2}>Ellenőrzés</Heading>
                {check.state === "checking" ? <Badge variant="neutral" label="Ellenőrzés…" /> : valid ? <Badge variant="success" label="Közzétehető" /> : check.state === "error" ? <Badge variant="error" label="Javítandó" /> : null}
              </HStack>
              {check.state === "error" ? <Banner status="error" title="Így még nem tehető közzé" description={check.message} /> : null}
              {analysis ? (
                <>
                  <HStack gap={2} wrap="wrap"><Score value={analysis.scores.seo} label="SEO" /><Score value={analysis.scores.aeo} label="AEO" /><Score value={analysis.scores.geo} label="GEO" /></HStack>
                  <Text type="supporting" color="secondary">Erre optimalizál: <strong>{analysis.optimisedFor.primaryKeyword}</strong> · {analysis.optimisedFor.intent.label.hu} · {analysis.facts.words} szó · {analysis.facts.readingMinutes} perc</Text>
                  <TabList value={tab} onChange={setTab} size="sm">
                    <Tab value="seo" label="SEO" />
                    <Tab value="aeo" label="AEO" />
                    <Tab value="geo" label="GEO" />
                    <Tab value="preview" label="Előnézet" />
                  </TabList>
                  {tab === "preview"
                    ? <div className="preview"><h2 style={{ marginTop: 0 }}>{check.result.article.title}</h2><div dangerouslySetInnerHTML={{ __html: check.result.html }} /></div>
                    : <CheckList checks={analysis.checks[tab]} />}
                </>
              ) : check.state !== "error" ? <Loading label="Ellenőrzés" /> : null}
            </VStack>
          </Card>
        </div>
      </div>

      <AlertDialog isOpen={confirmDelete} onOpenChange={setConfirmDelete} title="Törlöd a cikket?" description={`„${form.title}” lekerül az élő oldalról, a sitemapből és a hírcsatornából.`} actionLabel="Törlés" cancelLabel="Mégse" actionVariant="destructive" isActionLoading={busy} onAction={remove} />
    </VStack>
  );
}
