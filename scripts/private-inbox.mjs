// The destination inbox lives only in the server's CONTACT_TO variable. The
// repository is public, so guards compare a digest instead of spelling the
// address: any email-shaped string whose SHA-256 matches is a leak.
import { createHash } from "node:crypto";

const INBOX_DIGEST = "5488aaee1004e7f10feb99fd6dc5b1ab941fa53036aac45b58e24249e6a2a196";
const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function exposesInbox(text) {
  for (const [candidate] of String(text).matchAll(EMAIL_SHAPE)) {
    if (createHash("sha256").update(candidate.toLowerCase()).digest("hex") === INBOX_DIGEST) return true;
  }
  return false;
}
