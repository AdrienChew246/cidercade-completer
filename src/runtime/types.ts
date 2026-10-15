export type HttpRequest = {
  method?: "GET" | "POST" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
};

export type HttpResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

export type StateStore = {
  load(): Promise<string | undefined>;
  save(value: string): Promise<void>;
};
