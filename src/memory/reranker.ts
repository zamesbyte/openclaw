import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("reranker");

export type RerankDocument = {
  id: string;
  text: string;
};

export type RerankResult = {
  id: string;
  relevanceScore: number;
};

export type RerankConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  topN: number;
};

/**
 * DashScope native rerank API response shape.
 *
 * Endpoint: POST https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank
 *
 * Request body:
 *   { model, input: { query, documents }, parameters: { top_n, return_documents } }
 *
 * Response body:
 *   { output: { results: [{ index, relevance_score, document?: { text } }] }, usage: { total_tokens } }
 */
type DashScopeRerankResponse = {
  output?: {
    results?: Array<{
      index: number;
      relevance_score: number;
      document?: { text: string };
    }>;
  };
  usage?: {
    total_tokens?: number;
  };
  code?: string;
  message?: string;
};

const RERANK_TIMEOUT_MS = 10_000;

/**
 * Rerank a set of documents against a query using a remote rerank API.
 *
 * Returns the top-N results sorted by relevance score in descending order.
 * Each result maps back to the original document via its `id`.
 */
export async function rerankDocuments(
  query: string,
  documents: RerankDocument[],
  config: RerankConfig,
): Promise<RerankResult[]> {
  if (documents.length === 0) {
    return [];
  }

  const { baseUrl, apiKey, model, topN } = config;

  if (!apiKey) {
    log.warn("rerank skipped: no API key configured");
    return documents.map((d) => ({ id: d.id, relevanceScore: 0 }));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const body = JSON.stringify({
    model,
    input: {
      query,
      documents: documents.map((d) => d.text),
    },
    parameters: {
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    },
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RERANK_TIMEOUT_MS);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      log.warn(`rerank API error: ${res.status} ${text}`);
      return documents.map((d) => ({ id: d.id, relevanceScore: 0 }));
    }

    const payload = (await res.json()) as DashScopeRerankResponse;

    if (payload.code) {
      log.warn(`rerank API returned error: ${payload.code} ${payload.message ?? ""}`);
      return documents.map((d) => ({ id: d.id, relevanceScore: 0 }));
    }

    const results = payload.output?.results;
    if (!results || results.length === 0) {
      log.warn("rerank API returned no results");
      return documents.map((d) => ({ id: d.id, relevanceScore: 0 }));
    }

    const tokens = payload.usage?.total_tokens ?? 0;
    log.info(`reranked ${documents.length} docs → ${results.length} results (${tokens} tokens)`);

    return results.map((r) => ({
      id: documents[r.index]?.id ?? "",
      relevanceScore: r.relevance_score,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      log.warn(`rerank timed out after ${RERANK_TIMEOUT_MS}ms`);
    } else {
      log.warn(`rerank failed: ${message}`);
    }
    return documents.map((d) => ({ id: d.id, relevanceScore: 0 }));
  }
}
