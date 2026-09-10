import app from '../dist/server/index.js';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

export const config = {
  runtime: 'nodejs',
};

function toFetchRequest(request) {
  const host =
    request.headers.host ??
    request.headers['x-forwarded-host'] ??
    'localhost';
  const url = `https://${host}${request.url}`;

  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : request.body,
    redirect: 'follow',
  });
}

const assetRoot = resolve(process.cwd(), 'dist', 'client', '_next');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveNextAsset(request, response) {
  const requestPath = new URL(request.url, 'https://localhost').pathname;
  if (!requestPath.startsWith('/_next/')) return false;

  const relativePath = decodeURIComponent(requestPath.slice('/_next/'.length));
  const filePath = resolve(assetRoot, relativePath);
  if (!filePath.startsWith(`${assetRoot}${sep}`)) {
    response.statusCode = 400;
    response.end('Bad request');
    return true;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');
    response.statusCode = 200;
    response.setHeader('Content-Type', contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
    response.setHeader('Content-Length', fileStat.size);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
  return true;
}

export default async function handler(request, response) {
  if (await serveNextAsset(request, response)) return;

  const fetchRequest = toFetchRequest(request);
  const fetchResponse = await app.fetch(fetchRequest);

  response.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  if (!fetchResponse.body) {
    response.end();
    return;
  }

  Readable.fromWeb(fetchResponse.body).pipe(response);
}
