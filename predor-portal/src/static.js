// Static file serving for the regular Node runtime (local dev, Docker, Railway service).
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
export const indexHtml = () => path.join(dir, 'index.html');
export function staticMiddleware() {
  return express.static(dir, {
    index: 'index.html',
    setHeaders(res, file) {
      if (file.endsWith('sw.js') || file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  });
}
export function sendIndex(res) { res.sendFile(indexHtml()); }
