import React, { useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Banner } from "@astryxdesign/core/Banner";
import { Badge } from "@astryxdesign/core/Badge";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { api } from "../api.js";
import { BarList, DailyChart, LANG_LABEL, LoadError, Loading, PageHeader, Panel, StatTile, nf, useLoad } from "../ui.jsx";

const SOURCE_LABEL = { direct: "Közvetlen / ismeretlen", google: "Google keresés", bing: "Bing keresés", duckduckgo: "DuckDuckGo", chatgpt: "ChatGPT", perplexity: "Perplexity", claude: "Claude", gemini: "Gemini", copilot: "Copilot", linkedin: "LinkedIn", meta: "Facebook / Instagram", x: "X" };
const CTA_LOCATION = { footer: "Lábléc", navigation: "Menü", content: "Tartalom", unknown: "Ismeretlen" };
const delta = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

export function Analytics() {
  const [days, setDays] = useState("30");
  const traffic = useLoad(() => api(`/traffic?days=${days}`), [days]);
  const posthog = useLoad(() => api(`/analytics?days=${days}`), [days]);

  const pageColumns = [
    { key: "path", header: "Oldal", width: proportional(4), renderCell: (row) => <a className="link-plain" href={row.path} target="_blank" rel="noopener">{row.path}</a> },
    { key: "lang", header: "Nyelv", width: pixel(90), renderCell: (row) => LANG_LABEL[row.lang] },
    { key: "views", header: "Megtekintés", width: pixel(120), align: "end", renderCell: (row) => nf.format(row.views) },
    { key: "visitors", header: "Látogató", width: pixel(110), align: "end", renderCell: (row) => nf.format(row.visitors) },
  ];

  return (
    <VStack gap={5}>
      <PageHeader
        title="Analitika"
        subtitle="Hányan jártak az oldalon, honnan jöttek, mit néztek meg és hova kattintottak."
        actions={
          <SegmentedControl label="Időszak" value={days} onChange={setDays}>
            <SegmentedControlItem value="7" label="7 nap" />
            <SegmentedControlItem value="30" label="30 nap" />
            <SegmentedControlItem value="90" label="90 nap" />
          </SegmentedControl>
        }
      />

      {traffic.loading && !traffic.data ? <Loading /> : traffic.error ? <LoadError error={traffic.error} onRetry={traffic.reload} /> : (
        <>
          {!traffic.data.durable ? <Banner status="warning" title="A számláló most csak a memóriában gyűjt" description="Adatbázis bekötése után a számok megmaradnak az újraindítások között is." /> : null}
          <Grid columns={{ minWidth: 220 }} gap={4}>
            <StatTile label="Egyedi látogató" value={nf.format(traffic.data.totals.visitors)} hint="Naponta számolva, sütik és azonosító nélkül" />
            <StatTile label="Oldalmegtekintés" value={nf.format(traffic.data.totals.views)} />
            <StatTile label="Oldal / látogató" value={traffic.data.totals.visitors ? (traffic.data.totals.views / traffic.data.totals.visitors).toFixed(1).replace(".", ",") : "0"} />
            <StatTile label="AI-robotok letöltései" value={nf.format(traffic.data.bots.filter((bot) => bot.ai).reduce((sum, bot) => sum + bot.hits, 0))} hint="Ennyiszer olvasták be az oldalt AI-keresők" />
          </Grid>
          <Panel title="Látogatottság naponta" description="Saját, sütimentes mérés: minden emberi látogatót számol, hozzájárulástól függetlenül. A robotok külön szerepelnek.">
            <DailyChart data={traffic.data.daily} />
          </Panel>
          <Grid columns={{ minWidth: 340 }} gap={4}>
            <Panel title="Nyelvek szerint" description="Melyik nyelvű oldalakat hányan nézték">
              <BarList rows={traffic.data.languages} labelKey="lang" valueKey="visitors" renderLabel={(row) => `${LANG_LABEL[row.lang]} (${nf.format(row.views)} megtekintés)`} />
            </Panel>
            <Panel title="Honnan érkeztek" description="A látogatás első oldalának forrása">
              <BarList rows={traffic.data.sources} labelKey="source" valueKey="visits" renderLabel={(row) => SOURCE_LABEL[row.source] || row.source} />
            </Panel>
            <Panel title="Keresők és AI-robotok" description="Melyik robot hányszor töltött le oldalt">
              <BarList rows={traffic.data.bots.filter((bot) => bot.bot !== "other-bot")} labelKey="bot" valueKey="hits" limit={12} renderLabel={(row) => <>{row.bot} {row.ai ? <Badge variant="info" label="AI" /> : null}</>} />
            </Panel>
          </Grid>
          <Panel title="Legnézettebb oldalak">
            <div className="scroll-x">
              <Table data={traffic.data.pages.slice(0, 50).map((page) => ({ ...page, id: page.path }))} columns={pageColumns} idKey="id" density="compact" dividers="rows" hasHover emptyState={<EmptyState title="Még nincs adat" isCompact />} />
            </div>
          </Panel>
        </>
      )}

      <Panel title="Kattintások és megkeresések (PostHog)" description="A hozzájárulást adó látogatók eseményei: kapcsolatfelvételi gombok és elküldött űrlapok. Ez a látogatóknak csak egy része, ezért a számok alsó becslések.">
        {posthog.loading && !posthog.data ? <Loading /> : posthog.error ? <LoadError error={posthog.error} onRetry={posthog.reload} /> : !posthog.data.configured ? (
          <Banner status="info" title="A PostHog lekérdezés még nincs bekötve" description="Egy olvasási jogú PostHog kulcs kell hozzá (POSTHOG_PERSONAL_API_KEY). A fenti saját mérés enélkül is működik." />
        ) : (
          <VStack gap={4}>
            <Grid columns={{ minWidth: 200 }} gap={4}>
              <StatTile label="Hozzájáruló látogató" value={nf.format(posthog.data.totals.visitors)} delta={delta(posthog.data.totals.visitors, posthog.data.previous.visitors)} />
              <StatTile label="Megtekintés" value={nf.format(posthog.data.totals.pageviews)} delta={delta(posthog.data.totals.pageviews, posthog.data.previous.pageviews)} />
              <StatTile label="Kattintás kapcsolat gombra" value={nf.format(posthog.data.totals.contactClicks)} delta={delta(posthog.data.totals.contactClicks, posthog.data.previous.contactClicks)} />
              <StatTile label="Elküldött űrlap" value={nf.format(posthog.data.totals.contactForms)} delta={delta(posthog.data.totals.contactForms, posthog.data.previous.contactForms)} />
            </Grid>
            <Grid columns={{ minWidth: 340 }} gap={4}>
              <Card padding={4} variant="muted"><VStack gap={2}><Text weight="medium">Hol kattintottak a kapcsolat gombra</Text><BarList rows={posthog.data.clicks} labelKey="location" valueKey="count" renderLabel={(row) => `${CTA_LOCATION[row.location] || row.location}${row.cta ? ` · ${row.cta}` : ""}`} /></VStack></Card>
              <Card padding={4} variant="muted"><VStack gap={2}><Text weight="medium">Melyik oldalról kattintottak</Text><BarList rows={posthog.data.clickPages} labelKey="path" valueKey="count" /></VStack></Card>
              <Card padding={4} variant="muted"><VStack gap={2}><Text weight="medium">Forgalmi csatornák</Text><BarList rows={posthog.data.sources} labelKey="channel" valueKey="visitors" renderLabel={(row) => `${row.channel}${row.source ? ` · ${row.source}` : ""}`} /></VStack></Card>
              <Card padding={4} variant="muted"><VStack gap={2}><Text weight="medium">Eszközök</Text><BarList rows={posthog.data.devices} labelKey="device" valueKey="visitors" /></VStack></Card>
            </Grid>
            <HStack><Text type="supporting" color="secondary">Részletes tölcsérek és riportok: <a href="https://eu.posthog.com/project/265707" target="_blank" rel="noopener noreferrer">PostHog megnyitása</a></Text></HStack>
          </VStack>
        )}
      </Panel>
    </VStack>
  );
}
