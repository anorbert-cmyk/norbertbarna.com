import React, { useMemo, useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { api } from "../api.js";
import { LANG_LABEL, LoadError, Loading, PageHeader, Score, dateOnly, useLoad } from "../ui.jsx";

export function Articles() {
  const { loading, data, error, reload } = useLoad(() => api("/articles"));
  const [lang, setLang] = useState("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.articles
      .filter((article) => lang === "all" || article.lang === lang)
      .filter((article) => !needle || `${article.title} ${article.slug} ${article.tags.join(" ")}`.toLowerCase().includes(needle))
      .map((article) => ({ ...article, id: article.file }));
  }, [data, lang, query]);
  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  const columns = [
    {
      key: "title", header: "Cikk", width: proportional(4),
      renderCell: (row) => (
        <VStack gap={0.5}>
          <a className="link-plain" href={`#/cikkek/szerkesztes/${row.file.replace("content/", "")}`}><strong>{row.title}</strong></a>
          <Text type="supporting" color="secondary">{row.path}</Text>
        </VStack>
      ),
    },
    { key: "lang", header: "Nyelv", width: pixel(90), renderCell: (row) => <Badge variant="neutral" label={LANG_LABEL[row.lang]} /> },
    { key: "keyword", header: "Fő kulcsszó", width: proportional(2), renderCell: (row) => row.optimisedFor.primaryKeyword },
    { key: "status", header: "Állapot", width: pixel(110), renderCell: (row) => (row.draft ? <Badge variant="warning" label="Piszkozat" /> : <Badge variant="success" label="Megjelent" />) },
    { key: "scores", header: "SEO / AEO / GEO", width: pixel(170), renderCell: (row) => <HStack gap={1}><Score value={row.scores.seo} /><Score value={row.scores.aeo} /><Score value={row.scores.geo} /></HStack> },
    { key: "updated", header: "Frissítve", width: pixel(130), renderCell: (row) => <span className="nowrap">{dateOnly(row.updated)}</span> },
  ];

  return (
    <VStack gap={5}>
      <PageHeader title="Cikkek" subtitle={`${data.articles.length} cikk három nyelven`} actions={<Button label="Új cikk" variant="primary" href="#/cikkek/uj" />} />
      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Nyelv" value={lang} onChange={setLang}>
          <SegmentedControlItem value="all" label="Mind" />
          <SegmentedControlItem value="hu" label="Magyar" />
          <SegmentedControlItem value="en" label="Angol" />
          <SegmentedControlItem value="de" label="Német" />
        </SegmentedControl>
        <TextInput label="Keresés" isLabelHidden type="search" placeholder="Keresés cím, slug vagy kulcsszó szerint" value={query} onChange={setQuery} hasClear width={340} />
      </HStack>
      <Card padding={0}>
        <div className="scroll-x">
          <Table data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover emptyState={<EmptyState title="Nincs találat" description="Módosítsd a szűrőt vagy a keresést." />} />
        </div>
      </Card>
    </VStack>
  );
}
