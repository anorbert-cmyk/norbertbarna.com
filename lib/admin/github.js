// Publishing from the admin: content changes are committed to a short-lived
// cms/<id> branch through the GitHub Git Data API. The "CMS publish" workflow
// (.github/workflows/cms-publish.yml) rebuilds the generated pages, runs the
// site checks and only then fast-forwards main, which Railway deploys.
// The admin never writes to main directly, so a change that would break a
// site invariant stops in CI instead of reaching the live site.
//
// Environment:
//   ADMIN_GITHUB_TOKEN  fine-grained token for this one repository with
//                       Contents: read and write, Actions: read
//   ADMIN_GITHUB_REPO   owner/name (default anorbert-cmyk/norbertbarna.com)
const crypto = require("crypto");

const API = "https://api.github.com";
const WORKFLOW = "cms-publish.yml";

function repo() {
  const value = String(process.env.ADMIN_GITHUB_REPO || "anorbert-cmyk/norbertbarna.com");
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) ? value : "anorbert-cmyk/norbertbarna.com";
}
function token() {
  return String(process.env.ADMIN_GITHUB_TOKEN || "").trim();
}
const githubConfigured = () => Boolean(token());

async function gh(path, { method = "GET", body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API}/repos/${repo()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "site-admin",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = new Error(`GitHub ${method} ${path.split("?")[0]} answered ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

// The latest committed version of one file on main, or null when absent.
async function readFile(path, options) {
  try {
    const data = await gh(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=main`, options);
    return { sha: data.sha, text: Buffer.from(data.content || "", "base64").toString("utf8") };
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Commits a set of changes on top of main to a new cms/ branch.
 * @param {{ message: string, files: { path: string, content?: string, base64?: string, delete?: boolean }[] }} change
 * @returns {Promise<{ branch: string, commit: string }>}
 */
async function proposeChange({ message, files }, options) {
  const head = await gh("/git/ref/heads/main", options);
  const parent = head.object.sha;
  const parentCommit = await gh(`/git/commits/${parent}`, options);
  const tree = [];
  for (const file of files) {
    if (file.delete) {
      tree.push({ path: file.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const blob = await gh("/git/blobs", {
      ...options,
      method: "POST",
      body: file.base64 ? { content: file.base64, encoding: "base64" } : { content: file.content, encoding: "utf-8" },
    });
    tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const created = await gh("/git/trees", { ...options, method: "POST", body: { base_tree: parentCommit.tree.sha, tree } });
  const commit = await gh("/git/commits", { ...options, method: "POST", body: { message, tree: created.sha, parents: [parent] } });
  const branch = `cms/${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${crypto.randomBytes(3).toString("hex")}`;
  await gh("/git/refs", { ...options, method: "POST", body: { ref: `refs/heads/${branch}`, sha: commit.sha } });
  return { branch, commit: commit.sha };
}

// Recent publish runs, newest first, for the admin's publishing history.
async function listPublishes(limit = 15, options) {
  const data = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=${Math.min(50, limit)}`, options);
  return (data.workflow_runs || []).map((run) => ({
    id: run.id,
    branch: run.head_branch,
    title: run.display_title,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    url: run.html_url,
  }));
}

async function mainHead(options) {
  const head = await gh("/git/ref/heads/main", options);
  return head.object.sha;
}

module.exports = { githubConfigured, readFile, proposeChange, listPublishes, mainHead, repo };
