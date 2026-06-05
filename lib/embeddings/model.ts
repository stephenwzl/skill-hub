import { EMBEDDING_MODEL_ID } from "./constants";

type FeatureExtractionPipeline = (
  text: string,
  options?: { pooling?: "mean"; normalize?: boolean }
) => Promise<{ data: Float32Array | number[] }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

function configureTransformersCache(env: { cacheDir: string | null }): void {
  const cacheDir = process.env.TRANSFORMERS_CACHE_DIR?.trim();
  if (cacheDir) {
    env.cacheDir = cacheDir;
  }
}

async function loadPipeline(): Promise<FeatureExtractionPipeline> {
  const startedAt = Date.now();
  console.log("[embeddings] loading model (first run may download ONNX weights)", {
    model: EMBEDDING_MODEL_ID,
    cacheDir: process.env.TRANSFORMERS_CACHE_DIR ?? "(package default)",
  });
  const { env, pipeline } = await import("@huggingface/transformers");
  configureTransformersCache(env);
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
    dtype: "fp32",
  });
  console.log("[embeddings] model ready", {
    model: EMBEDDING_MODEL_ID,
    elapsedMs: Date.now() - startedAt,
  });
  return extractor as FeatureExtractionPipeline;
}

export async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = loadPipeline();
  }
  return pipelinePromise;
}

function toFloat32Array(data: Float32Array | number[]): Float32Array {
  return data instanceof Float32Array ? data : new Float32Array(data);
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(`query: ${text}`, { pooling: "mean", normalize: true });
  return toFloat32Array(output.data);
}

export async function embedPassage(text: string): Promise<Float32Array> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(`passage: ${text}`, { pooling: "mean", normalize: true });
  return toFloat32Array(output.data);
}
