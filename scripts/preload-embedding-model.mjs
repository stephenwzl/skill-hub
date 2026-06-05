/**
 * Pre-download ONNX weights for the embedding model (used in Docker build).
 * Requires network access to huggingface.co.
 */
import { env, pipeline } from "@huggingface/transformers";

const MODEL_ID = process.env.EMBEDDING_MODEL_ID ?? "Xenova/multilingual-e5-small";
const cacheDir = process.env.TRANSFORMERS_CACHE_DIR;

if (cacheDir) {
  env.cacheDir = cacheDir;
}

console.log("[embeddings] preloading model", { model: MODEL_ID, cacheDir: env.cacheDir });
const startedAt = Date.now();

await pipeline("feature-extraction", MODEL_ID, { dtype: "fp32" });

console.log("[embeddings] preload complete", {
  model: MODEL_ID,
  elapsedMs: Date.now() - startedAt,
});
