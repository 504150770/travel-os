import app from '../dist/server/index.js';
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

export default async function handler(request, response) {
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
