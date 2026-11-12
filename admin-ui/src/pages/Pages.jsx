import React, { useMemo, useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { api } from "../api.js";
import { LANG_LABEL, LoadError, Loading, PageHeader, nf, useLoad } from "../ui.jsx";

const lengthBadge = (length, min, max) => <Badge variant={length >= min && length <= max ? "success" : "warning"} label={String(length)} />;

export function Pages() {
  const { loading, data, error, reload } = useLoad(() => api("/pages"));
  const [lang, setLang] = useState("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.pages || [])
      .filter((page) => lang === "all" || page.lang === lang)
      .filter((page) => !needle || `${page.title} ${page.path} ${page.description}`.toLowerCase().includes(needle))
      .map((page) => ({ ...page, id: page.file }));
  }, [data, lang, query]);
  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  const columns = [
    { key: "title", header: "Oldal", width: proportional(4), renderCell: (row) => <VStack gap={0.5}><a className="link-plain" href={row.path} target="_blank" rel="noopener"><strong>{row.title || row.file}</strong></a><Text type="supporting" color="secondary">{row.path}</Text><Text type="supporting" color="secondary">{row.description}</Text></VStack> },
    { key: "kind", header: "Típus", width: pixel(130), renderCell: (row) => row.kind },
    { key: "lang", header: "Nyelv", width: pixel(90), renderCell: (row) => LANG_LABEL[row.lang] || row.lang },
    { key: "titleLength", header: "Cím", width: pixel(70), renderCell: (row) => lengthBadge(row.titleLength, 20, 62) },
    { key: "descriptionLength", header: "Leírás", width: pixel(80), renderCell: (row) => lengthBadge(row.descriptionLength, 70, 160) },
    { key: "words", header: "Szó", width: pixel(80), align: "end", renderCell: (row) => nf.format(row.words) },
    { key: "hreflang", header: "Nyelvi párok", width: pixel(150), renderCell: (row) => row.hreflang.filter((code) => code !== "x-default").join(", ") || "–" },
    { key: "indexable", header: "Index", width: pixel(90), renderCell: (row) => (row.indexable ? <Badge variant="success" label="Igen" /> : <Badge variant="neutral" label="Nem" />) },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="Oldalak" subtitle={`${data.pages.length} oldal: főoldalak, szolgáltatások, esettanulmányok, cikkek. A keresőknek szóló adataikkal.`} />
      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Nyelv" value={lang} onChange={setLang}>
          <SegmentedControlItem value="all" label="Mind" />
          <SegmentedControlItem value="hu" label="Magyar" />
          <SegmentedControlItem value="en" label="Angol" />
          <SegmentedControlItem value="de" label="Német" />
        </SegmentedControl>
        <TextInput label="Keresés" isLabelHidden type="search" placeholder="Keresés cím vagy útvonal szerint" value={query} onChange={setQuery} hasClear width={340} />
      </HStack>
      <Card padding={0}>
        <div className="scroll-x">
          <Table data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover emptyState={<EmptyState title="Nincs találat" />} />
        </div>
      </Card>
      <Text type="supporting" color="secondary">A cikkeket a Cikkek menüben szerkesztheted. A kézzel épített oldalak (főoldal, szolgáltatások, esettanulmányok) szövege a kódban él; ezekhez itt az ellenőrző adatokat látod.</Text>
    </VStack>
  );
}
