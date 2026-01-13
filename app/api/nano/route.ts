// app/api/nano/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { PROMPTS } from "../../prompts/m3c1";

export const runtime = "nodejs";

// Tenta primeiro o nano banana (rápido), depois o Nano Banana Pro preview
const MODEL_CANDIDATES = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
];

function jerr(msg: string, status = 400, extra: any = {}) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

export async function GET() {
  try {
    if (!Array.isArray(PROMPTS)) {
      return jerr("PROMPTS não é um array válido", 500);
    }
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
  ai: GoogleGenAI,
  modelName: string,
  prompt: string,
  imageParts: any[],
  { temperature, seed }: GenOpts
) {
  const config: Record<string, any> = {
    temperature,
    // se quiser, dá pra ativar depois: imageConfig: { imageSize: "4K" },
  };

  if (typeof seed === "number" && Number.isFinite(seed)) {
    config.seed = seed;
  }

  const parts = [{ text: prompt }, ...imageParts];

  const res = await ai.models.generateContent({
    model: modelName,
    contents: parts,
    config,
  });

  return res;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return jerr("Missing GEMINI_API_KEY", 500);

    const url = new URL(req.url);
    const temperature = Math.max(
      0,
      Math.min(2, parseFloat(url.searchParams.get("temp") || "1"))
    );

    const seedMode = (url.searchParams.get("seedMode") || "perPrompt").toLowerCase();
    const seedFromQuery = url.searchParams.get("seed");
    const baseSeed = Number.isFinite(Number(seedFromQuery))
      ? parseInt(seedFromQuery as string, 10)
      : rand32();

    const jpegQ = Math.max(
      1,
      Math.min(100, parseInt(url.searchParams.get("jpeg") || "85", 10))
    );
    const modelOverride = url.searchParams.get("model")?.trim();
    const includePrompt =
      (url.searchParams.get("includePrompt") || "false").toLowerCase() === "true";
    const modelCandidates = modelOverride ? [modelOverride] : MODEL_CANDIDATES;

    const form = await req.formData();

    // prompts selecionados
    let ACTIVE_PROMPTS: {name: string, prompt: string}[] = [];

    const promptsField = form.get("prompts");
    if (typeof promptsField === "string" && promptsField.trim()) {
        try {
            ACTIVE_PROMPTS = JSON.parse(promptsField);
            if (!Array.isArray(ACTIVE_PROMPTS) || ACTIVE_PROMPTS.some(p => typeof p.name !== 'string' || typeof p.prompt !== 'string')) {
                return jerr("Campo 'prompts' inválido (esperado JSON array de {name: string, prompt: string}).", 400);
            }
        } catch {
            return jerr("Campo 'prompts' inválido (esperado JSON).", 400);
        }
    } else {
        // Fallback to old logic
        let selectedNames: string[] = [];
        const namesField = form.get("names");
        if (typeof namesField === "string" && namesField.trim()) {
            try {
                selectedNames = JSON.parse(namesField);
            } catch {
                return jerr("Campo 'names' inválido (esperado JSON array de strings).", 400);
            }
        }

        ACTIVE_PROMPTS =
          selectedNames.length > 0
            ? PROMPTS.filter((p) => selectedNames.includes(p.name))
            : PROMPTS;
    }

    if (!ACTIVE_PROMPTS.length) {
      return jerr("Nenhum prompt selecionado/encontrado.", 400);
    }

    // imagens
    const files = form
      .getAll("images")
      .filter((v) => v instanceof File) as File[];
    if (!files.length) return jerr("Please upload at least one image.");

    // compacta para JPEG + base64 (padrão da doc JS)
    const imageParts = await Promise.all(
      files.map(async (f) => {
        const buf = Buffer.from(await (f as File).arrayBuffer());
        const compressed = await sharp(buf).jpeg({ quality: jpegQ }).toBuffer();
        const base64Image = compressed.toString("base64");
        return {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        };
      })
    );

    const ai = new GoogleGenAI({ apiKey });

    let lastErr: any = null;

    for (const MODEL of modelCandidates) {
      try {
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
          const seedForThis =
            seedMode === "one"
              ? (globalSeed as number)
              : Math.floor(Math.random() * 0x7fffffff);

          const plans: GenOpts[] = [
            { temperature, seed: seedForThis, modalities: ["TEXT", "IMAGE"] },
            { temperature, seed: seedForThis, modalities: ["IMAGE"] },
            { temperature, seed: null, modalities: ["TEXT", "IMAGE"] },
          ];

          let imgPart: any = null;
          let mime = "image/png";
          let attemptError: any = null;
          let lastTextFromModel: string | undefined;

          for (const plan of plans) {
            try {
              const res = await callModelOnce(
                ai,
                MODEL,
                prompt,
                imageParts,
                plan
              );

              // tenta extrair candidates/parts
              const candidates = (res as any).candidates ?? [];
              const parts = candidates[0]?.content?.parts ?? [];

              // guarda qualquer texto que o modelo tenha retornado
              const textChunks = parts
                .map((p: any) => p?.text)
                .filter((t: any) => typeof t === "string" && t.trim());
              if (textChunks.length) {
                lastTextFromModel = textChunks.join(" | ");
              }

              imgPart = parts.find((p: any) => p?.inlineData?.data);
              if (imgPart) {
                const data = imgPart.inlineData.data;
                const base64 =
                  data instanceof Uint8Array || Buffer.isBuffer(data)
                    ? Buffer.from(data).toString("base64")
                    : typeof data === "string"
                    ? data
                    : null;

                if (!base64) {
                  attemptError = new Error("inlineData sem formato suportado");
                  imgPart = null;
                  continue;
                }

                imgPart.inlineData.data = base64;
                mime = imgPart.inlineData.mimeType || "image/png";
                break;
              } else {
                attemptError = new Error(
                  lastTextFromModel
                    ? `no image in parts – model said: ${lastTextFromModel}`
                    : "no image in parts"
                );
              }
            } catch (e: any) {
              attemptError = e;
            }
            await new Promise((r) => setTimeout(r, 120));
          }

          const ext = (mime.split("/")[1] || "png").toLowerCase();

          if (!imgPart || !imgPart.inlineData?.data) {
            results.push({
              name,
              b64: null,
              mime,
              seed: seedForThis,
              filename: `${name}_seed_${seedForThis}.${ext}`,
              ...(includePrompt ? { prompt } : {}),
              error: attemptError
                ? String(attemptError?.message || attemptError)
                : "no image",
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

        // monta um resumo dos erros dos prompts
        const summary = results
          .map((r) => `${r.name}: ${r.error ?? "no image"}`)
          .join(" || ");

        return NextResponse.json(
          {
            ok: false,
            error: `Model returned no images [${MODEL}] – ${summary}`,
            modelUsed: MODEL,
            temp: temperature,
            seedMode,
            baseSeed,
            results,
          },
          { status: 502 }
        );
      } catch (e: any) {
        lastErr = e;
      }
    }

    return jerr("No model generated an image", 500, {
      detail: lastErr?.message || String(lastErr),
      tried: modelCandidates,
    });
  } catch (e: any) {
    return jerr(e?.message || "Internal error", 500, {
      stack: e?.stack,
      name: e?.name,
    });
  }
}
