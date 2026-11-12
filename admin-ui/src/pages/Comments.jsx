import React, { useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Switch } from "@astryxdesign/core/Switch";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useToast } from "@astryxdesign/core/Toast";
import { api, messageOf } from "../api.js";
import { LoadError, Loading, PageHeader, dateTime, useLoad } from "../ui.jsx";

const TABS = [["pending", "Jóváhagyásra vár"], ["approved", "Megjelent"], ["spam", "Spam"], ["trash", "Kuka"]];
const STATUS_BADGE = { pending: ["warning", "Várakozik"], approved: ["success", "Megjelent"], spam: ["error", "Spam"], trash: ["neutral", "Kuka"] };

function CommentCard({ comment, onAction }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action, payload) => {
    setBusy(true);
    await onAction(comment, action, payload);
    setBusy(false);
    setMode(null);
  };
  const [variant, label] = STATUS_BADGE[comment.status];
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <HStack justify="between" gap={3} wrap="wrap" vAlign="center">
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text weight="semibold">{comment.authorName}</Text>
            {comment.isAuthor ? <Badge variant="info" label="Szerző" /> : null}
            {comment.parentId ? <Badge variant="neutral" label="Válasz" /> : null}
            <Badge variant={variant} label={label} />
          </HStack>
          <Text type="supporting" color="secondary">{dateTime(comment.createdAt)}</Text>
        </HStack>
        <Text type="supporting" color="secondary">Cikk: <a href={comment.page} target="_blank" rel="noopener">{comment.page}</a></Text>
        {mode === "edit"
          ? <TextArea label="Hozzászólás szövege" value={text} onChange={setText} rows={5} />
          : <div className="comment-body">{comment.body}</div>}
        {mode === "reply" ? <TextArea label="Válaszod" value={text} onChange={setText} rows={4} description="A válasz a neveddel, szerzőként jelölve azonnal megjelenik. Várakozó hozzászólásra válaszolva az is megjelenik." /> : null}
        <HStack gap={2} wrap="wrap">
          {mode === "edit" ? (
            <><Button label="Mentés" variant="primary" size="sm" isLoading={busy} isDisabled={!text.trim()} onClick={() => run("edit", text)} /><Button label="Mégse" variant="ghost" size="sm" onClick={() => setMode(null)} /></>
          ) : mode === "reply" ? (
            <><Button label="Válasz küldése" variant="primary" size="sm" isLoading={busy} isDisabled={!text.trim()} onClick={() => run("reply", text)} /><Button label="Mégse" variant="ghost" size="sm" onClick={() => setMode(null)} /></>
          ) : (
            <>
              {comment.status !== "approved" ? <Button label="Jóváhagyás" variant="primary" size="sm" isDisabled={busy} onClick={() => run("status", "approved")} /> : <Button label="Visszavonás" variant="secondary" size="sm" isDisabled={busy} onClick={() => run("status", "pending")} />}
              {comment.status !== "trash" && comment.status !== "spam" ? <Button label="Válasz" variant="secondary" size="sm" onClick={() => { setText(""); setMode("reply"); }} /> : null}
              <Button label="Szerkesztés" variant="ghost" size="sm" onClick={() => { setText(comment.body); setMode("edit"); }} />
              {comment.status !== "spam" ? <Button label="Spam" variant="ghost" size="sm" isDisabled={busy} onClick={() => run("status", "spam")} /> : null}
              {comment.status !== "trash" ? <Button label="Kukába" variant="ghost" size="sm" isDisabled={busy} onClick={() => run("status", "trash")} /> : <Button label="Végleges törlés" variant="destructive" size="sm" isDisabled={busy} onClick={() => run("delete")} />}
            </>
          )}
        </HStack>
      </VStack>
    </Card>
  );
}

export function Comments({ onChange }) {
  const [status, setStatus] = useState("pending");
  const showToast = useToast();
  const [toDelete, setToDelete] = useState(null);
  const { loading, data, error, reload } = useLoad(() => api(`/comments?status=${status}`).then((result) => { onChange?.(result.counts.pending); return result; }), [status]);

  const act = async (comment, action, payload) => {
    if (action === "delete") { setToDelete(comment); return; }
    try {
      if (action === "status") await api(`/comments/${comment.id}`, { method: "POST", body: { status: payload } });
      if (action === "edit") await api(`/comments/${comment.id}`, { method: "POST", body: { body: payload } });
      if (action === "reply") await api(`/comments/${comment.id}/reply`, { method: "POST", body: { body: payload } });
      reload();
    } catch (failure) {
      showToast({ type: "error", body: messageOf(failure) });
    }
  };
  const toggle = async (enabled) => {
    try { await api("/comments/settings", { method: "POST", body: { enabled } }); reload(); } catch (failure) { showToast({ type: "error", body: messageOf(failure) }); }
  };
  const removeForGood = async () => {
    try { await api(`/comments/${toDelete.id}`, { method: "DELETE" }); reload(); } catch (failure) { showToast({ type: "error", body: messageOf(failure) }); }
    setToDelete(null);
  };

  return (
    <VStack gap={5}>
      <PageHeader title="Hozzászólások" subtitle="Minden hozzászólás csak a jóváhagyásod után jelenik meg a cikk alatt." />
      {data && !data.durable ? <Banner status="warning" title="Nincs tartós adattár bekötve" description="Adatbázis nélkül a hozzászólások egy újraindításnál elvesznek, ezért az élő oldalon a hozzászólás ki van kapcsolva." /> : null}
      {data ? (
        <Card padding={4}>
          <Switch label="Hozzászólás engedélyezése a cikkeknél" description="Kikapcsolva a cikkek alatt nem jelenik meg az űrlap, és a meglévő hozzászólások sem látszanak." value={data.enabled} onChange={toggle} />
        </Card>
      ) : null}
      <TabList value={status} onChange={setStatus} hasDivider>
        {TABS.map(([value, label]) => <Tab key={value} value={value} label={data ? `${label} (${data.counts[value] || 0})` : label} />)}
      </TabList>
      {loading && !data ? <Loading /> : error ? <LoadError error={error} onRetry={reload} /> : data.comments.length ? (
        <VStack gap={3}>{data.comments.map((comment) => <CommentCard key={comment.id} comment={comment} onAction={act} />)}</VStack>
      ) : <EmptyState title={status === "pending" ? "Nincs jóváhagyásra váró hozzászólás" : "Ez a lista üres"} description={status === "pending" ? "Új hozzászólásról e-mailt is kapsz." : undefined} />}
      <AlertDialog isOpen={Boolean(toDelete)} onOpenChange={(open) => { if (!open) setToDelete(null); }} title="Véglegesen törlöd?" description="A hozzászólás és a rá adott válaszok véglegesen törlődnek. Ez nem vonható vissza." actionLabel="Végleges törlés" cancelLabel="Mégse" actionVariant="destructive" onAction={removeForGood} />
    </VStack>
  );
}
