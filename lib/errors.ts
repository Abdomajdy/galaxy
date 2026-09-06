import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest   = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg: string) => new HttpError(401, msg);
export const forbidden    = (msg: string) => new HttpError(403, msg);
export const notFound     = (msg: string) => new HttpError(404, msg);
export const conflict     = (msg: string) => new HttpError(409, msg);

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error('Unhandled error:', e);
  const isDev = process.env.NODE_ENV !== 'production';
  const detail = isDev && e instanceof Error ? e.message : null;
  return NextResponse.json(
    { error: detail ?? 'Something went wrong in the galaxy ✦' },
    { status: 500 }
  );
}
