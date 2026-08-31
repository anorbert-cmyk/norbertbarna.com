import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repository = 'anorbert-cmyk/norbertbarna.com';
const branch = 'codex/ship-editorial-autoplay';
const parent = process.env.SOURCE_SHA;
const root = process.env.GITHUB_WORKSPACE;
if (process.env.GITHUB_REPOSITORY !== repository || !/^[a-f0-9]{40}$/.test(parent || '')) throw new Error('Unexpected repository or source commit');
if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== parent) throw new Error('Checkout is not the requested immutable source');
const manifest = JSON.parse(readFileSync(join(process.env.RUNNER_TEMP, 'change-manifest.json'), 'utf8'));
const token = process.env.GH_TOKEN;
if (!token) throw new Error('Missing scoped GitHub token');
const api = async (path, data) => {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method: data ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  if (!response.ok) throw new Error(`Git object operation failed (${response.status} at ${path})`);
  return response.json();
};
const ref = await api(`git/refs/heads/${branch}`);
if (ref.object.sha !== parent) throw new Error('The review branch changed during tests; refusing to prepare an outdated release');
const current = await api(`git/commits/${parent}`);
const tree = [], digests = {};
for (const path of manifest.files) {
  if (!/^(?:assets\/(?:css|js)\/[\w.-]+|work\/[a-z]+\.html|scripts\/[\w.-]+|tests\/[\w.-]+|index\.html|works\.html|404\.html|server\.js|package\.json|playwright\.config\.mjs|\.github\/workflows\/ci\.yml)$/.test(path)) {
    throw new Error(`Path outside the reviewed change allowlist: ${path}`);
  }
  const content = readFileSync(join(root, path));
  const expected = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
  const blob = await api('git/blobs', { content: content.toString('base64'), encoding: 'base64' });
  if (blob.sha !== expected) throw new Error(`Uploaded content digest differs: ${path}`);
  tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  digests[path] = { git: blob.sha, sha256: createHash('sha256').update(content).digest('hex') };
}
// Remove only this PR's temporary transfer/prepare files. No pre-existing file
// is deleted, and the final CI retains its original read-only permissions.
for (const path of [
  '.github/refinement/apply.mjs',
  '.github/refinement/export-commit.mjs',
  '.github/refinement/lib/refinement.mjs',
  '.github/refinement/payload/assets/js/media.js',
  '.github/refinement/payload/scripts/check-editorial-media.mjs',
  '.github/refinement/payload/tests/editorial-media.spec.mjs',
  '.github/workflows/prepare-editorial.yml'
]) {
  tree.push({ path, mode: '100644', type: 'blob', sha: null });
}
const preparedTree = await api('git/trees', { base_tree: current.tree.sha, tree });
const commit = await api('git/commits', {
  message: 'Refine editorial notes and ship preference-aware video autoplay\n\nPreserve source qualifications and intrinsic media geometry, retain one accessible motion preference, verify social metadata and structured data, and cover the release with browser regressions.',
  tree: preparedTree.sha, parents: [parent]
});
const result = { repository, branch, parent, commit: commit.sha, tree: preparedTree.sha, versions: manifest.versions, digests, note: 'Prepared only after static and browser steps passed. No refs updated and no deployment triggered.' };
writeFileSync(join(process.env.RUNNER_TEMP, 'prepared-commit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ parent, preparedCommit: commit.sha, preparedTree: preparedTree.sha, files: manifest.files.length, refsUpdated: false }));
