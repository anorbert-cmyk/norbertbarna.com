import React, { useMemo, useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Card } from "@astryxdesign/core/Card";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { api } from "../api.js";
import { BarList, CheckList, LANG_LABEL, LoadError, Loading, PageHeader, Panel, Score, StatTile, nf, useLoad } from "../ui.jsx";

const position = (value) => (value === null || value === undefined ? "–" : String(value).replace(".", ","));

function ArticleDetail({ article, search, onClose }) {
  const [tab, setTab] = useState("seo");
  const queries = (search?.queryPages || []).filter((row) => row.path === article.path).slice(0, 15);
  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open) onClose(); }} width={760}>
      <DialogHeader title={article.title} subtitle={article.path} onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={4} padding={4}>
        <VStack gap={1}>
          <Text weight="medium">Mire van optimalizálva</Text>
          <HStack gap={2} wrap="wrap">
            <Badge variant="info" label={`Fő kulcsszó: ${article.optimisedFor.primaryKeyword}`} />
            <Badge variant="neutral" label={`Szándék: ${article.optimisedFor.intent.label.hu}`} />
            <Badge variant="neutral" label={LANG_LABEL[article.lang]} />
            {article.market?.monthlySearches !== null && article.market?.monthlySearches !== undefined ? <Badge variant="neutral" label={`${nf.format(article.market.monthlySearches)} keresés / hó (${article.market.market || "piac"})`} /> : null}
            {article.market?.googleRank ? <Badge variant="success" label={`Google helyezés: ${article.market.googleRank}.`} /> : null}
            {article.market?.aiOverviewCitation ? <Badge variant="success" label="AI Overview idézi" /> : null}
          </HStack>
          <Text type="supporting" color="secondary">További kulcsszavak: {article.optimisedFor.secondaryKeywords.join(", ") || "nincs"}</Text>
          <Text type="supporting" color="secondary">Szolgáltatásoldal: {article.optimisedFor.service || "nincs megadva"} · Fordítások: {article.translations.filter((item) => item.slug).map((item) => LANG_LABEL[item.lang]).join(", ") || "nincs"}</Text>
        </VStack>
        <HStack gap={2}><Score value={article.scores.seo} label="SEO" /><Score value={article.scores.aeo} label="AEO" /><Score value={article.scores.geo} label="GEO" /></HStack>
        <TabList value={tab} onChange={setTab} size="sm" hasDivider>
          <Tab value="seo" label="SEO (keresők)" />
          <Tab value="aeo" label="AEO (válaszmotorok)" />
          <Tab value="geo" label="GEO (AI-keresők)" />
          <Tab value="queries" label="Keresések" />
        </TabList>
        {tab === "queries" ? (
          queries.length ? <BarList rows={queries} labelKey="query" valueKey="impressions" limit={15} renderLabel={(row) => `${row.query} · ${position(row.position)}. hely · ${row.clicks} kattintás`} /> : <Text color="secondary">{search?.configured === false ? "A Search Console adatokhoz PostHog kulcs kell." : "Erre a cikkre még nincs keresési megjelenés az időszakban."}</Text>
        ) : <CheckList checks={article.checks[tab]} />}
        <HStack hAlign="end" gap={2}>
          <Button label="Megnyitás az oldalon" variant="secondary" href={article.path} target="_blank" rel="noopener" />
          <Button label="Szerkesztés" variant="primary" href={`#/cikkek/szerkesztes/${article.file.replace("content/", "")}`} />
        </HStack>
      </VStack>
    </Dialog>
  );
}

export function Seo() {
  const articles = useLoad(() => api("/articles"));
  const search = useLoad(() => api("/search?days=90"));
  const [lang, setLang] = useState("all");
  const [open, setOpen] = useState(null);
  const gsc = useMemo(() => new Map((search.data?.pages || []).map((row) => [row.path, row])), [search.data]);
  const rows = useMemo(() => (articles.data?.articles || []).filter((article) => !article.draft && (lang === "all" || article.lang === lang)).map((article) => ({ ...article, id: article.file, gsc: gsc.get(article.path) || null })).sort((a, b) => a.scores.overall - b.scores.overall), [articles.data, lang, gsc]);
  if (articles.loading && !articles.data) return <Loading />;
  if (articles.error) return <LoadError error={articles.error} onRetry={articles.reload} />;

  const published = articles.data.articles.filter((article) => !article.draft);
  const average = (key, list = published) => (list.length ? Math.round(list.reduce((sum, article) => sum + article.scores[key], 0) / list.length) : 0);
  const columns = [
    { key: "title", header: "Cikk", width: proportional(4), renderCell: (row) => <VStack gap={0.5}><button type="button" className="link-plain" style={{ background: "none", border: 0, padding: 0, font: "inherit", textAlign: "left", cursor: "pointer", color: "inherit" }} onClick={() => setOpen(row)}><strong>{row.title}</strong></button><Text type="supporting" color="secondary">{LANG_LABEL[row.lang]} · {row.optimisedFor.intent.label.hu}</Text></VStack> },
    { key: "keyword", header: "Erre optimalizál", width: proportional(2), renderCell: (row) => <VStack gap={0.5}><span>{row.optimisedFor.primaryKeyword}</span>{row.market?.monthlySearches !== null && row.market?.monthlySearches !== undefined ? <Text type="supporting" color="secondary">{nf.format(row.market.monthlySearches)} keresés / hó</Text> : null}</VStack> },
    { key: "seo", header: "SEO", width: pixel(70), renderCell: (row) => <Score value={row.scores.seo} /> },
    { key: "aeo", header: "AEO", width: pixel(70), renderCell: (row) => <Score value={row.scores.aeo} /> },
    { key: "geo", header: "GEO", width: pixel(70), renderCell: (row) => <Score value={row.scores.geo} /> },
    { key: "impressions", header: "Megjelenés", width: pixel(110), align: "end", renderCell: (row) => (row.gsc ? nf.format(row.gsc.impressions) : "–") },
    { key: "clicks", header: "Kattintás", width: pixel(100), align: "end", renderCell: (row) => (row.gsc ? nf.format(row.gsc.clicks) : "–") },
    { key: "position", header: "Átl. hely", width: pixel(90), align: "end", renderCell: (row) => position(row.gsc?.position) },
    { key: "todo", header: "Teendő", width: pixel(100), align: "end", renderCell: (row) => { const failed = [...row.checks.seo, ...row.checks.aeo, ...row.checks.geo].filter((item) => !item.pass).length; return failed ? <Badge variant="warning" label={`${failed} javítás`} /> : <Badge variant="success" label="Rendben" />; } },
  ];
  const coverageColumns = [
    { key: "title", header: "Téma", width: proportional(3), renderCell: (row) => row.title },
    ...["hu", "en", "de"].map((code) => ({ key: code, header: LANG_LABEL[code], width: pixel(110), renderCell: (row) => (row[code] ? <Badge variant="success" label="Van" /> : <Badge variant="warning" label="Hiányzik" />) })),
  ];

  return (
    <VStack gap={5}>
      <PageHeader
        title="SEO, AEO, GEO"
        subtitle="Cikkenként: mire optimalizál, hogyan teljesít a keresőkben, a válaszmotorokban és az AI-keresőkben."
        actions={
          <SegmentedControl label="Nyelv" value={lang} onChange={setLang}>
            <SegmentedControlItem value="all" label="Mind" />
            <SegmentedControlItem value="hu" label="Magyar" />
            <SegmentedControlItem value="en" label="Angol" />
            <SegmentedControlItem value="de" label="Német" />
          </SegmentedControl>
        }
      />
      <Grid columns={{ minWidth: 200 }} gap={4}>
        <StatTile label="SEO átlag" value={average("seo", rows)} hint="Klasszikus keresőoptimalizálás" />
        <StatTile label="AEO átlag" value={average("aeo", rows)} hint="Közvetlen válasz, GYIK, kiemelt találat" />
        <StatTile label="GEO átlag" value={average("geo", rows)} hint="Idézhetőség AI-keresőkben" />
        <StatTile label="Google megjelenés, 90 nap" value={search.data?.configured ? nf.format(search.data.totals.impressions) : "–"} hint={search.data?.configured ? `${nf.format(search.data.totals.clicks)} kattintás` : "PostHog kulcs kell hozzá"} />
      </Grid>
      {search.data && search.data.configured === false ? <Banner status="info" title="A Search Console adatok még nincsenek bekötve" description="A megjelenések, kattintások és helyezések a PostHogon keresztül érkeznek (POSTHOG_PERSONAL_API_KEY). A pontszámok enélkül is élnek." /> : null}
      {search.error ? <LoadError error={search.error} onRetry={search.reload} /> : null}
      <Card padding={0}>
        <div className="scroll-x">
          <Table data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover emptyState={<EmptyState title="Nincs cikk ezen a nyelven" />} />
        </div>
      </Card>
      <Text type="supporting" color="secondary">A pontszámok a közzétett szövegből számolódnak, ugyanabból a forrásból, amiből az oldal épül. {articles.data.measured ? `A keresési volumen és a helyezés mérése: ${articles.data.measured}.` : ""}</Text>
      <Grid columns={{ minWidth: 380 }} gap={4}>
        <Panel title="Fordítási lefedettség" description="Melyik téma melyik nyelven érhető el">
          <div className="scroll-x">
            <Table data={articles.data.coverage.map((group, index) => ({ ...group, id: String(index) }))} columns={coverageColumns} idKey="id" density="compact" dividers="rows" />
          </div>
        </Panel>
        <Panel title="Erre keresnek rá és találnak meg" description="Google Search Console, 90 nap, megjelenések szerint">
          {search.data?.configured ? <BarList rows={search.data.queries} labelKey="query" valueKey="impressions" limit={15} renderLabel={(row) => `${row.query} · ${position(row.position)}. hely`} /> : <Text color="secondary">Nincs bekötve.</Text>}
        </Panel>
      </Grid>
      {open ? <ArticleDetail article={open} search={search.data} onClose={() => setOpen(null)} /> : null}
    </VStack>
  );
}
