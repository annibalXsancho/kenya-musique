import { b64decode, b64encode } from '../lib/base64';

/** Faux serveur « contents » de GitHub (en mémoire) : sha, ETag, 304, 404, 409 sur conflit, 401 sur mauvais jeton. */
export function createFakeGithub(opts: { repo?: string; token?: string } = {}) {
  const repo = opts.repo ?? 'moi/outil-data';
  const token = opts.token ?? 'jeton-test';
  const files = new Map<string, { sha: string; etag: string; bytes: Uint8Array }>();
  let n = 0;
  const stats = { gets: 0, puts: 0, notModified: 0 };
  const hooks: { online: boolean; beforePut?: () => void | Promise<void> } = { online: true };

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });

  const handler = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!hooks.online) throw new TypeError('Failed to fetch');
    const h = (init.headers ?? {}) as Record<string, string>;
    if (h.Authorization !== `Bearer ${token}`) return json(401, { message: 'Bad credentials' });
    const prefix = `/repos/${repo}/contents/`;
    const url = new URL(String(input));
    if (!url.pathname.startsWith(prefix)) return json(404, { message: 'Not Found' });
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const existing = files.get(path);

    if ((init.method ?? 'GET') === 'GET') {
      stats.gets++;
      if (!existing) return json(404, { message: 'Not Found' });
      if (h['If-None-Match'] === existing.etag) {
        stats.notModified++;
        return new Response(null, { status: 304, headers: { etag: existing.etag } });
      }
      if (h.Accept === 'application/vnd.github.raw+json')
        return new Response(existing.bytes as BlobPart, {
          status: 200,
          headers: { etag: existing.etag },
        });
      const big = existing.bytes.length > 1_000_000;
      return json(
        200,
        {
          sha: existing.sha,
          size: existing.bytes.length,
          encoding: big ? 'none' : 'base64',
          content: big ? '' : b64encode(existing.bytes),
        },
        { etag: existing.etag },
      );
    }

    await hooks.beforePut?.();
    stats.puts++;
    const body = JSON.parse(String(init.body)) as { content: string; sha?: string };
    const current = files.get(path);
    if (current && body.sha !== current.sha)
      return json(body.sha ? 409 : 422, { message: 'sha mismatch' });
    if (!current && body.sha) return json(422, { message: 'sha supplied for a new file' });
    n++;
    files.set(path, { sha: `sha${n}`, etag: `W/"etag${n}"`, bytes: b64decode(body.content) });
    return json(current ? 200 : 201, { content: { sha: `sha${n}` } });
  }) as typeof fetch;

  return {
    repo,
    token,
    files,
    stats,
    hooks,
    fetch: handler,
    read: (path: string) =>
      files.has(path) ? new TextDecoder().decode(files.get(path)!.bytes) : null,
  };
}
