import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { messageOf } from "./api.js";

export const LANG_LABEL = { hu: "Magyar", en: "Angol", de: "Német" };
export const nf = new Intl.NumberFormat("hu-HU");
export const dateTime = (iso) => (iso ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "");
export const dateOnly = (iso) => (iso ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(new Date(iso)) : "");

// Loads data on mount and whenever deps change; exposes reload().
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const run = useCallback(() => {
    let live = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    loader().then((data) => live && setState({ loading: false, data, error: null }), (error) => live && setState({ loading: false, data: null, error }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}

export function Loading({ label = "Betöltés" }) {
  return <HStack gap={2} vAlign="center" padding={4}><Spinner size="sm" label={label} /><Text color="secondary">{label}…</Text></HStack>;
}

export function LoadError({ error, onRetry }) {
  return <Banner status="error" title="Nem sikerült betölteni" description={messageOf(error)} endContent={onRetry ? <Button label="Újra" size="sm" variant="secondary" onClick={onRetry} /> : undefined} />;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <HStack gap={4} vAlign="center" justify="between" wrap="wrap">
      <VStack gap={1}>
        <Heading level={1}>{title}</Heading>
        {subtitle ? <Text color="secondary">{subtitle}</Text> : null}
      </VStack>
      {actions ? <HStack gap={2} vAlign="center" wrap="wrap">{actions}</HStack> : null}
    </HStack>
  );
}

export function StatTile({ label, value, hint, delta }) {
  return (
    <Card padding={4}>
      <VStack gap={1}>
        <Text type="supporting" color="secondary">{label}</Text>
        <div className="stat-value">{value}</div>
        {delta !== undefined && delta !== null ? <Text type="supporting" color="secondary">{delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {Math.abs(delta)}% az előző időszakhoz képest</Text> : null}
        {hint ? <Text type="supporting" color="secondary">{hint}</Text> : null}
      </VStack>
    </Card>
  );
}

export const scoreClass = (value) => (value >= 85 ? "good" : value >= 65 ? "ok" : "bad");
export function Score({ value, label }) {
  return <span className={`score ${scoreClass(value)}`} title={label ? `${label}: ${value}/100` : `${value}/100`}>{label ? `${label} ` : ""}{value}</span>;
}

export function CheckList({ checks, onlyFailed = false }) {
  const rows = onlyFailed ? checks.filter((item) => !item.pass) : checks;
  if (!rows.length) return <Text color="secondary">Minden szempont rendben.</Text>;
  return (
    <div>
      {rows.map((item) => (
        <div key={item.id} className={`check ${item.pass ? "pass" : "fail"}`}>
          <span className="mark" aria-hidden="true">{item.pass ? "✓" : "✕"}</span>
          <div>
            <div>{item.label}{item.detail ? <span className="muted"> ({item.detail})</span> : null}</div>
            {!item.pass && item.fix ? <div className="fix">{item.fix}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// Daily columns: views (and optionally visitors) per day.
export function DailyChart({ data, a = "views", b = "visitors", labelA = "Oldalmegtekintés", labelB = "Egyedi látogató", height = 200 }) {
  if (!data.length) return <Text color="secondary">Ebben az időszakban még nincs adat.</Text>;
  const width = 800;
  const pad = { top: 8, right: 8, bottom: 22, left: 34 };
  const max = Math.max(1, ...data.map((row) => Math.max(row[a] || 0, row[b] || 0)));
  const step = (width - pad.left - pad.right) / data.length;
  const bar = Math.max(2, Math.min(18, step / 2 - 1));
  const y = (value) => pad.top + (height - pad.top - pad.bottom) * (1 - value / max);
  const ticks = [0, Math.round(max / 2), max].filter((value, index, list) => list.indexOf(value) === index);
  const every = Math.ceil(data.length / 8);
  return (
    <VStack gap={2}>
      <div className="legend"><span><i className="a" />{labelA}</span><span><i className="b" />{labelB}</span></div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${labelA} és ${labelB} naponta`}>
        {ticks.map((tick) => (
          <g key={tick}><line className="grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} /><text x={pad.left - 6} y={y(tick) + 4} textAnchor="end">{nf.format(tick)}</text></g>
        ))}
        {data.map((row, index) => {
          const x = pad.left + index * step + step / 2;
          return (
            <g key={row.day}>
              <title>{`${row.day}: ${row[a] || 0} ${labelA.toLowerCase()}, ${row[b] || 0} ${labelB.toLowerCase()}`}</title>
              <rect className="series-a" x={x - bar} width={bar} y={y(row[a] || 0)} height={height - pad.bottom - y(row[a] || 0)} rx="1.5" />
              <rect className="series-b" x={x + 1} width={bar} y={y(row[b] || 0)} height={height - pad.bottom - y(row[b] || 0)} rx="1.5" />
              {index % every === 0 ? <text x={x} y={height - 6} textAnchor="middle">{row.day.slice(5)}</text> : null}
            </g>
          );
        })}
      </svg>
    </VStack>
  );
}

export function BarList({ rows, labelKey, valueKey, limit = 10, renderLabel }) {
  const shown = rows.slice(0, limit);
  if (!shown.length) return <Text color="secondary">Nincs adat.</Text>;
  const max = Math.max(1, ...shown.map((row) => row[valueKey]));
  return (
    <div>
      {shown.map((row, index) => (
        <div className="bar-row" key={`${row[labelKey]}-${index}`}>
          <span className="label" title={String(row[labelKey])}>{renderLabel ? renderLabel(row) : row[labelKey] || "(ismeretlen)"}</span>
          <span className="track"><span className="fill" style={{ width: `${(row[valueKey] / max) * 100}%`, display: "block" }} /></span>
          <span className="value">{nf.format(row[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, description, children, actions }) {
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <HStack justify="between" vAlign="center" gap={3} wrap="wrap">
          <VStack gap={0.5}>
            <Heading level={2}>{title}</Heading>
            {description ? <Text type="supporting" color="secondary">{description}</Text> : null}
          </VStack>
          {actions}
        </HStack>
        {children}
      </VStack>
    </Card>
  );
}
