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
const publicRoot = resolve(process.cwd(), 'public');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

async function serveFile(request, response, root, relativePath) {
  const filePath = resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${sep}`)) {
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

async function serveStaticAsset(request, response) {
  const requestPath = new URL(request.url, 'https://localhost').pathname;

  try {
    if (requestPath.startsWith('/_next/')) {
      return serveFile(
        request,
        response,
        assetRoot,
        decodeURIComponent(requestPath.slice('/_next/'.length)),
      );
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const relativePath = decodeURIComponent(requestPath.slice(1));
      const filePath = resolve(publicRoot, relativePath);
      if (filePath.startsWith(`${publicRoot}${sep}`)) {
        try {
          const fileStat = await stat(filePath);
          if (fileStat.isFile()) return serveFile(request, response, publicRoot, relativePath);
        } catch {
          // Continue to the app for routes that are not public files.
        }
      }
    }
  } catch {
    response.statusCode = 400;
    response.end('Bad request');
    return true;
  }

  return false;
}

export default async function handler(request, response) {
  if (await serveStaticAsset(request, response)) return;

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
