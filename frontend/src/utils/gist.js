const TOKEN_KEY = 'bookmarks_github_token';
const SHA_KEY = 'bookmarks_github_sha';
const REPO = 'ilaybar110/MyBooksApp';
const FILE_PATH = 'data/bookmarks.json';

export function getGithubToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function saveGithubToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token.trim());
  else localStorage.removeItem(TOKEN_KEY);
}

async function githubFetch(path, options = {}) {
  const token = getGithubToken();
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

async function getFileSha() {
  const res = await githubFetch(`/repos/${REPO}/contents/${FILE_PATH}`);
  localStorage.setItem(SHA_KEY, res.sha);
  return res.sha;
}

export async function fetchGistData() {
  const res = await githubFetch(`/repos/${REPO}/contents/${FILE_PATH}`);
  localStorage.setItem(SHA_KEY, res.sha);
  // GitHub returns base64 encoded content
  const json = decodeURIComponent(escape(atob(res.content.replace(/\n/g, ''))));
  return JSON.parse(json);
}

export async function pushGistData(data) {
  if (!getGithubToken()) return;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const sha = localStorage.getItem(SHA_KEY);

  try {
    const res = await githubFetch(`/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Update bookmarks data',
        content,
        ...(sha ? { sha } : {}),
      }),
    });
    // Cache the new SHA
    localStorage.setItem(SHA_KEY, res.content.sha);
  } catch (e) {
    if (e.message.includes('409') || e.message.toLowerCase().includes('sha')) {
      // SHA is stale — fetch fresh and retry once
      const freshSha = await getFileSha();
      const res = await githubFetch(`/repos/${REPO}/contents/${FILE_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Update bookmarks data',
          content,
          sha: freshSha,
        }),
      });
      localStorage.setItem(SHA_KEY, res.content.sha);
    } else {
      throw e;
    }
  }
}
