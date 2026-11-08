/**
 * Minimal Express-like req/res so the route handlers ported from server.ts keep their original
 * bodies (`req.body`, `res.status(n).json(x)`, `res.setHeader`, `res.send`). The router turns the
 * collected result into a real fetch `Response`.
 */
export type LocalRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Headers;
  body: any;
};

export class LocalResponse {
  statusCode = 200;
  headers = new Headers();
  private payload: BodyInit | null = null;
  finished = false;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }

  set(name: string, value: string) {
    return this.setHeader(name, value);
  }

  json(data: unknown) {
    if (!this.headers.has('Content-Type')) this.headers.set('Content-Type', 'application/json; charset=utf-8');
    // Express res.json → JSON.stringify (undefined fields dropped, same as before).
    this.payload = JSON.stringify(data);
    this.finished = true;
    return this;
  }

  send(data: string) {
    if (!this.headers.has('Content-Type')) this.headers.set('Content-Type', 'text/html; charset=utf-8');
    this.payload = data;
    this.finished = true;
    return this;
  }

  toResponse(): Response {
    return new Response(this.payload, { status: this.statusCode, headers: this.headers });
  }
}

export type RouteHandler = (req: LocalRequest, res: LocalResponse) => unknown | Promise<unknown>;
