import React, { useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { api } from "../api.js";
import { LoadError, Loading, PageHeader, Panel, dateTime, useLoad } from "../ui.jsx";

const ACTIONS = {
  "login.link_sent": "Belépő link elküldve", "login.success": "Sikeres belépés", "login.failed": "Sikertelen belépési kísérlet", logout: "Kilépés",
  "sessions.revoked_all": "Minden eszköz kiléptetve", "article.publish": "Cikk közzététele", "article.delete": "Cikk törlése",
  "comment.update": "Hozzászólás módosítva", "comment.reply": "Válasz hozzászólásra", "comment.delete": "Hozzászólás törölve", "comments.settings": "Hozzászólás beállítás",
};
const detailText = (detail) => Object.entries(detail || {}).filter(([, value]) => value !== null && value !== undefined && value !== "").map(([key, value]) => `${key}: ${value}`).join(" · ");

export function Activity({ onSignedOut }) {
  const { loading, data, error, reload } = useLoad(() => api("/activity"));
  const [confirm, setConfirm] = useState(false);
  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  const revokeAll = async () => {
    await api("/sessions/revoke-all", { method: "POST", body: {} }).catch(() => {});
    onSignedOut();
  };
  const logColumns = [
    { key: "at", header: "Időpont", width: pixel(190), renderCell: (row) => dateTime(row.at) },
    { key: "action", header: "Esemény", width: proportional(2), renderCell: (row) => (row.action === "login.failed" ? <Badge variant="warning" label={ACTIONS[row.action]} /> : ACTIONS[row.action] || row.action) },
    { key: "detail", header: "Részletek", width: proportional(3), renderCell: (row) => <span className="mono">{detailText(row.detail)}</span> },
  ];
  const sessionColumns = [
    { key: "userAgent", header: "Böngésző", width: proportional(3), renderCell: (row) => <HStack gap={2} vAlign="center"><span>{row.userAgent || "ismeretlen"}</span>{row.current ? <Badge variant="info" label="Ez az eszköz" /> : null}</HStack> },
    { key: "lastSeenAt", header: "Utoljára aktív", width: pixel(190), renderCell: (row) => dateTime(row.lastSeenAt) },
    { key: "expiresAt", header: "Lejár", width: pixel(190), renderCell: (row) => dateTime(row.expiresAt) },
  ];
  return (
    <VStack gap={5}>
      <PageHeader title="Napló és biztonság" subtitle="Ki mikor lépett be, és mi történt az adminban." />
      <Panel title="Bejelentkezett eszközök" description="A belépés 12 óráig érvényes. Ha ismeretlen eszközt látsz, léptess ki mindent." actions={<Button label="Minden eszköz kiléptetése" variant="destructive" size="sm" onClick={() => setConfirm(true)} />}>
        <div className="scroll-x"><Table data={data.sessions.map((session, index) => ({ ...session, id: String(index) }))} columns={sessionColumns} idKey="id" density="compact" dividers="rows" /></div>
      </Panel>
      <Card padding={0}>
        <div className="scroll-x"><Table data={data.log.map((entry) => ({ ...entry, id: String(entry.id) }))} columns={logColumns} idKey="id" density="compact" dividers="rows" emptyState={<EmptyState title="Még nincs bejegyzés" isCompact />} /></div>
      </Card>
      <Text type="supporting" color="secondary">A belépés jelszó nélkül, egyszer használható e-mailes linkkel történik, amely csak az admin címére megy ki.</Text>
      <AlertDialog isOpen={confirm} onOpenChange={setConfirm} title="Minden eszközt kiléptetsz?" description="Ezen az eszközön is újra be kell majd lépned." actionLabel="Kiléptetés" cancelLabel="Mégse" actionVariant="destructive" onAction={revokeAll} />
    </VStack>
  );
}
