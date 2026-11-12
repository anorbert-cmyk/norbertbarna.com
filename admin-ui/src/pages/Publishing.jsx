import React, { useEffect } from "react";
import { VStack } from "@astryxdesign/core/Stack";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { api } from "../api.js";
import { LoadError, Loading, PageHeader, dateTime, useLoad } from "../ui.jsx";

function statusBadge(run) {
  if (run.status !== "completed") return <Badge variant="info" label="Folyamatban" />;
  if (run.conclusion === "success") return <Badge variant="success" label="Közzétéve" />;
  if (run.conclusion === "cancelled") return <Badge variant="neutral" label="Megszakítva" />;
  return <Badge variant="error" label="Elakadt" />;
}

export function Publishing() {
  const { loading, data, error, reload } = useLoad(() => api("/publishes"));
  const running = data?.runs?.some((run) => run.status !== "completed") || (data && data.configured && !data.live);
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, [running, reload]);
  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  const columns = [
    { key: "title", header: "Változás", width: proportional(4), renderCell: (row) => row.title },
    { key: "status", header: "Állapot", width: pixel(140), renderCell: statusBadge },
    { key: "createdAt", header: "Indítva", width: pixel(190), renderCell: (row) => dateTime(row.createdAt) },
    { key: "url", header: "", width: pixel(120), renderCell: (row) => <a href={row.url} target="_blank" rel="noopener noreferrer">Részletek</a> },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="Közzététel" subtitle="Minden mentés automatikus ellenőrzésen megy át, és csak hibátlanul kerül az élő oldalra." actions={<Button label="Frissítés" variant="secondary" onClick={reload} />} />
      {!data.configured ? (
        <Banner status="info" title="A közzététel még nincs bekötve" description="GitHub hozzáférési kulcs kell hozzá (ADMIN_GITHUB_TOKEN)." />
      ) : data.live ? (
        <Banner status="success" title="Az élő oldal a legfrissebb változatot mutatja" />
      ) : (
        <Banner status="info" title="Élesítés folyamatban" description="A legutóbbi változás már bekerült, a szerver most frissül. Ez általában néhány perc." />
      )}
      <Card padding={0}>
        <div className="scroll-x">
          <Table data={data.runs.map((run) => ({ ...run, id: String(run.id) }))} columns={columns} idKey="id" density="balanced" dividers="rows" emptyState={<EmptyState title="Még nem volt közzététel az adminból" isCompact />} />
        </div>
      </Card>
      <Text type="supporting" color="secondary">Ha egy közzététel elakad, a cikk nem változik az élő oldalon. A részletek linkjén látszik, melyik ellenőrzés jelzett.</Text>
    </VStack>
  );
}
