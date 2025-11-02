// app/api/nano/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import { PROMPTS } from "../../prompts/m3c1";

export const runtime = "nodejs";

const MODEL_CANDIDATES = ["gemini-2.5-flash-image", "gemini-2.5-flash"];

function jerr(msg: string, status = 400, extra: any = {}) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

export async function GET() {
  try {
    if (!Array.isArray(PROMPTS)) return jerr("PROMPTS não é um array válido", 500);
    return NextResponse.json({ ok: true, prompts: PROMPTS });
  } catch (e: any) {
    return jerr(e?.message || "Erro interno ao carregar prompts", 500);
  }
}

function rand32() {
  return Math.floor(Math.random() * 0x7fffffff);
}

type GenOpts = {
  temperature: number;
  seed?: number | null;
  modalities: ("TEXT" | "IMAGE")[];
};

async function callModelOnce(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string,
  imageParts: any[],
  { temperature, seed, modalities }: GenOpts
) {
  // Monta generationConfig dinamicamente para evitar chaves inválidas
  const generationConfig: Record<string, any> = { temperature, responseModalities: modalities };
  if (typeof seed === "number" && Number.isFinite(seed)) {
    // alguns SDKs aceitam 'seed', outros 'randomSeed'; tentamos os dois
    generationConfig.seed = seed;
    generationConfig.randomSeed = seed;
  }

  return await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
    // @ts-ignore
    generationConfig,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return jerr("Missing GEMINI_API_KEY", 500);

    const url = new URL(req.url);
    const temperature = Math.max(0, Math.min(2, parseFloat(url.searchParams.get("temp") || "1")));

    const seedMode = (url.searchParams.get("seedMode") || "perPrompt").toLowerCase(); // 'one' | 'perPrompt'
    const seedFromQuery = url.searchParams.get("seed");
    const baseSeed = Number.isFinite(Number(seedFromQuery))
      ? parseInt(seedFromQuery as string, 10)
      : rand32();

    const jpegQ = Math.max(1, Math.min(100, parseInt(url.searchParams.get("jpeg") || "85", 10)));
    const modelOverride = url.searchParams.get("model")?.trim();
    const includePrompt = (url.searchParams.get("includePrompt") || "false").toLowerCase() === "true";
    const modelCandidates = modelOverride ? [modelOverride] : MODEL_CANDIDATES;

    const form = await req.formData();

    // prompts selecionados
    let selectedNames: string[] = [];
    const namesField = form.get("names");
    if (typeof namesField === "string" && namesField.trim()) {
      try {
        selectedNames = JSON.parse(namesField);
      } catch {
        return jerr("Campo 'names' inválido (esperado JSON array de strings).", 400);
      }
    }
    const ACTIVE_PROMPTS =
      selectedNames.length > 0 ? PROMPTS.filter((p) => selectedNames.includes(p.name)) : PROMPTS;
    if (!ACTIVE_PROMPTS.length) return jerr("Nenhum prompt selecionado/encontrado.", 400);

    // imagens
    const files = form.getAll("images").filter((v) => v instanceof File) as File[];
    if (!files.length) return jerr("Please upload at least one image.");

    // compacta para JPEG
    const imageParts = await Promise.all(
      files.map(async (f) => {
        const buf = Buffer.from(await (f as File).arrayBuffer());
        const compressed = await sharp(buf).jpeg({ quality: jpegQ }).toBuffer();
        return { inlineData: { data: compressed.toString("base64"), mimeType: "image/jpeg" } };
      })
    );

    const ai = new GoogleGenerativeAI(apiKey);
    let lastErr: any = null;

    for (const MODEL of modelCandidates) {
      try {
        const model = ai.getGenerativeModel({ model: MODEL });

        const results: Array<{
          name: string;
          b64: string | null;
          mime?: string;
          seed?: number;
          filename?: string;
          prompt?: string;
          error?: string;
        }> = [];

        const globalSeed = seedMode === "one" ? baseSeed : undefined;

        for (let i = 0; i < ACTIVE_PROMPTS.length; i++) {
          const { name, prompt } = ACTIVE_PROMPTS[i];
          const seedForThis = seedMode === "one" ? (globalSeed as number) : Math.floor(Math.random() * 0x7fffffff);

          const tryPlans: GenOpts[] = [
            { temperature, seed: seedForThis, modalities: ["TEXT", "IMAGE"] }, // plano A
            { temperature, seed: seedForThis, modalities: ["IMAGE"] },         // plano B
            { temperature, seed: null, modalities: ["TEXT", "IMAGE"] },        // sem seed
          ];

          let imgPart: any = null;
          let mime = "image/png";
          let attemptError: any = null;

          for (const plan of tryPlans) {
            try {
              const res = await callModelOnce(model, prompt, imageParts, plan);
              // @ts-ignore
              const fb = res.response?.promptFeedback;
              if (fb?.blockReason) {
                attemptError = new Error(`blocked: ${fb.blockReason}`);
                continue;
              }
              // @ts-ignore
              const parts = res.response?.candidates?.[0]?.content?.parts ?? [];
              imgPart = parts.find((p: any) => p?.inlineData?.data);
              if (imgPart) {
                mime = imgPart.inlineData.mimeType || "image/png";
                break;
              } else {
                attemptError = new Error("no image in parts");
              }
            } catch (e: any) {
              attemptError = e;
              // tenta o próximo plano
            }
            // intervalinho p/ rate limit
            await new Promise((r) => setTimeout(r, 120));
          }

          const ext = (mime.split("/")[1] || "png").toLowerCase();

          if (!imgPart) {
            results.push({
              name,
              b64: null,
              mime,
              seed: seedForThis,
              filename: `${name}_seed_${seedForThis}.${ext}`,
              ...(includePrompt ? { prompt } : {}),
              error: attemptError ? String(attemptError?.message || attemptError) : "no image",
            });
          } else {
            results.push({
              name,
              b64: imgPart.inlineData.data,
              mime,
              seed: seedForThis,
              filename: `${name}_seed_${seedForThis}.${ext}`,
              ...(includePrompt ? { prompt } : {}),
            });
          }

          await new Promise((r) => setTimeout(r, 150));
        }

        // Se pelo menos uma imagem veio, consideramos sucesso e retornamos
        const anyOk = results.some((r) => !!r.b64);
        if (anyOk) {
          return NextResponse.json({
            ok: true,
            modelUsed: MODEL,
            temp: temperature,
            seedMode,
            baseSeed,
            results,
          });
        }

        // Nenhuma imagem — mas devolvemos os erros coletados para debug
        return NextResponse.json({
          ok: false,
          error: "Model returned no images",
          modelUsed: MODEL,
          temp: temperature,
          seedMode,
          baseSeed,
          results, // contém os errors por prompt
        }, { status: 502 });
      } catch (e: any) {
        lastErr = e;
      }
    }

    return jerr("No model generated an image", 500, {
      detail: lastErr?.message || String(lastErr),
      tried: modelCandidates,
    });
  } catch (e: any) {
    // Expõe mais detalhes de erro para depuração no front
    return jerr(e?.message || "Internal error", 500, {
      stack: e?.stack,
      name: e?.name,
    });
  }
}
