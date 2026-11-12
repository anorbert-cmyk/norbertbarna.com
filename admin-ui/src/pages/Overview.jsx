import React from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { api } from "../api.js";
import { DailyChart, LANG_LABEL, LoadError, Loading, PageHeader, Panel, Score, StatTile, nf, useLoad } from "../ui.jsx";

export function Overview() {
  const { loading, data, error, reload } = useLoad(() => api("/overview"));
  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  const { articles, comments, traffic, setup } = data;
  return (
    <VStack gap={5}>
      <PageHeader title="Áttekintés" subtitle="Az oldal állapota egy helyen: tartalom, látogatottság, hozzászólások." actions={<Button label="Új cikk" variant="primary" href="#/cikkek/uj" />} />
      {setup.storage !== "postgres" ? <Banner status="warning" title="Nincs tartós adattár bekötve" description="Adatbázis nélkül a látogatószámok és a hozzászólások egy újraindításnál elvesznek (DATABASE_URL)." /> : null}
      {!setup.publishing ? <Banner status="info" title="A cikkek szerkesztése előnézet módban működik" description="A közzétételhez egy GitHub hozzáférési kulcs kell (ADMIN_GITHUB_TOKEN). Addig mindent megnézhetsz és ellenőrizhetsz, de menteni nem lehet." /> : null}
      <Grid columns={{ minWidth: 220 }} gap={4}>
        <StatTile label="Látogatók, 30 nap" value={nf.format(traffic.visitors)} hint="Egyedi látogató naponta számolva, sütik nélkül" />
        <StatTile label="Oldalmegtekintés, 30 nap" value={nf.format(traffic.views)} />
        <StatTile label="AI-robotok letöltései, 30 nap" value={nf.format(traffic.aiHits)} hint="GPTBot, ClaudeBot, PerplexityBot és társaik" />
        <StatTile label="Jóváhagyásra váró hozzászólás" value={nf.format(comments.pending)} hint={`${nf.format(comments.approved)} megjelent`} />
      </Grid>
      <Panel title="Látogatottság az elmúlt 30 napban" actions={<Button label="Részletek" variant="secondary" size="sm" href="#/analitika" />}>
        <DailyChart data={traffic.days} />
      </Panel>
      <Grid columns={{ minWidth: 340 }} gap={4}>
        <Panel title="Cikkek" description={`${articles.total} cikk, ebből ${articles.drafts} piszkozat`} actions={<Button label="Összes cikk" variant="secondary" size="sm" href="#/cikkek" />}>
          <HStack gap={2} wrap="wrap">
            {Object.entries(articles.byLang).map(([lang, count]) => <Badge key={lang} variant="neutral" label={`${LANG_LABEL[lang]}: ${count}`} />)}
            {articles.missingTranslations ? <Badge variant="warning" label={`${articles.missingTranslations} témából hiányzik fordítás`} /> : null}
          </HStack>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Text color="secondary">Átlagos pontszám:</Text>
            <Score value={articles.scores.seo} label="SEO" />
            <Score value={articles.scores.aeo} label="AEO" />
            <Score value={articles.scores.geo} label="GEO" />
          </HStack>
        </Panel>
        <Panel title="Ezeken érdemes javítani" description="A leggyengébb összpontszámú cikkek" actions={<Button label="SEO nézet" variant="secondary" size="sm" href="#/seo" />}>
          <VStack gap={2}>
            {articles.weakest.map((article) => (
              <HStack key={article.file} justify="between" gap={3} vAlign="center">
                <a className="link-plain" href={`#/cikkek/szerkesztes/${article.file.replace("content/", "")}`}>{article.title}</a>
                <Score value={article.scores.overall} />
              </HStack>
            ))}
          </VStack>
        </Panel>
      </Grid>
    </VStack>
  );
}
