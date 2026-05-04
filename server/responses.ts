import type { ServerResponse } from "node:http";

import type { ApiErrorBody, ApiFieldError } from "./types.js";

export function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

export function sendNoContent(response: ServerResponse): void {
  response.writeHead(204);
  response.end();
}

export function sendError(
  response: ServerResponse,
  statusCode: number,
  requestId: string,
  code: string,
  message: string,
  details?: ApiFieldError[],
): void {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      requestId,
      details,
    },
  };

  sendJson(response, statusCode, body);
}
