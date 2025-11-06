"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type PromptItem = { name: string; prompt: string };
type ImageResult = { name: string; src: string; seedUsed?: number; filename?: string };

export function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = prompts.length > 0 && selected.length === prompts.length;

  // Controles
  const [temperature, setTemperature] = useState<number>(1);
  const [seed, setSeed] = useState<number>(123456789);
  const [perPromptSeed, setPerPromptSeed] = useState<boolean>(false);
  const [columns, setColumns] = useState<number>(4);

  // Debug/meta
  const [modelUsed, setModelUsed] = useState<string>("");
  const [seedBase, setSeedBase] = useState<number | null>(null);
  const [perPromptFlag, setPerPromptFlag] = useState<boolean>(false);

  // ===== utils =====
  function extractSeedFromName(name?: string): number | undefined {
    if (!name) return undefined;
    const m = name.match(/(?:_seed_?|(?:\s*[·-]?\s*seed\s*\(?))(\d{2,})\)?$/i);
    if (m?.[1]) return parseInt(m[1], 10);
    return undefined;
  }

  function normalizeSeed(r: any): number | undefined {
    if (typeof r?.seedUsed === "number") return r.seedUsed;
    const cand = r?.seedUsed ?? r?.randomSeed ?? r?.seed ?? r?.meta?.seed;
    if (cand === 0) return 0;
    if (typeof cand === "number") return cand;
    if (typeof cand === "string") {
      const onlyDigits = cand.match(/\d+/)?.[0];
      if (onlyDigits) return parseInt(onlyDigits, 10);
    }
    return extractSeedFromName(r?.name);
  }

  function getPerPromptFlagFromResponse(data: any): boolean {
    if (typeof data?.seedMode === "string") {
      return data.seedMode.toLowerCase() === "perprompt";
    }
    return !!data?.perPrompt;
  }

  // ===== carrega prompts =====
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/nano");
        const data = await res.json();
        if (data?.ok && Array.isArray(data.prompts)) {
          setPrompts(data.prompts);
          setSelected(data.prompts.map((p: PromptItem) => p.name));
        } else {
          setStatus("Failed to load prompts.");
        }
      } catch (e: any) {
        setStatus(`Failed to load prompts: ${e.message}`);
      }
    })();
  }, []);

  function togglePrompt(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function toggleAll() {
    if (allSelected) setSelected([]);
    else setSelected(prompts.map((p) => p.name));
  }

  // ===== geração =====
  async function handleGenerate() {
    if (!files.length) {
      alert("Please select at least one image.");
      return;
    }
    setLoading(true);
    setStatus("Generating images...");

    try {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      form.append("names", JSON.stringify(selected));

      const qs = new URLSearchParams({
        temp: String(temperature),
        seed: String(seed),
        seedMode: perPromptSeed ? "perPrompt" : "one",
      });

      const res = await fetch(`/api/nano?${qs.toString()}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Unknown error.");

      // Meta/debug
      setModelUsed(data.modelUsed || "");
      setSeedBase(
        typeof data.baseSeed === "number"
          ? data.baseSeed
          : typeof data.seedBase === "number"
          ? data.seedBase
          : null
      );
      setPerPromptFlag(getPerPromptFlagFromResponse(data));

      const outs: ImageResult[] =
        (data.results || [])
          .filter((r: any) => r?.b64)
          .map((r: any) => {
            const s = normalizeSeed(r);
            const baseName: string = (r.name as string) || "image";

            // Título do card: "nome · seed 123456"
            const displayName =
              s !== undefined ? `${baseName} · seed ${s}` : baseName;

            // Arquivo do ZIP: prioriza filename do backend; senão gera "nome_seed_123456.ext"
            const mime = r?.mime || "image/png";
            const ext = mime.split("/")[1] || "png";
            const fileNameForZip: string =
              (typeof r?.filename === "string" && r.filename) ||
              (s !== undefined
                ? `${baseName}_seed_${s}.${ext}`
                : `${baseName}.${ext}`);

            const src = `data:${mime};base64,${r.b64}`;
            return { name: displayName, src, seedUsed: s, filename: fileNameForZip };
          }) || [];

      setImages(outs);
      setStatus(
        `Generated ${outs.length} image(s). Temp: ${temperature.toFixed(
          2
        )} | Base Seed: ${seed} | Per-prompt: ${perPromptSeed ? "ON" : "OFF"}`
      );
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadAll() {
    if (!images.length) {
      alert("No images generated yet.");
      return;
    }
    const zip = new JSZip();
    images.forEach((img) => {
      const base64Data = img.src.split(",")[1];

      // Se já temos filename pronto, usa direto:
      if (img.filename) {
        zip.file(img.filename, base64Data, { base64: true });
        return;
      }

      // Fallback (não deve acontecer, mas deixo robusto):
      const seedForFile =
        img.seedUsed !== undefined ? img.seedUsed : extractSeedFromName(img.name);
      const cleanName = (img.name || "image")
        .replace(/\s*·\s*seed\s*\d+$/i, "")
        .replace(/_seed_?\d+$/i, "");
      const filename =
        seedForFile !== undefined
          ? `${cleanName}_seed_${seedForFile}.png`
          : `${cleanName}.png`;
      zip.file(filename, base64Data, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "m3c1_images.zip");
  }

  // ===== render =====
  return (
    <main
      style={{
        fontFamily: "Inter, sans-serif",
        padding: 30,
        background: "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
        M3C1 – Nano Banana Generator
      </h1>

     {/* Upload */}
<label
  htmlFor="file-upload"
  className="cursor-pointer bg-[#111] text-white px-4 py-2 rounded-lg hover:bg-[#222] transition-colors inline-block"
>
  Upload Files
</label>
<input
  id="file-upload"
  type="file"
  multiple
  onChange={(e) => setFiles(Array.from(e.target.files || []))}
  className="hidden"
/>


      {/* Painel de controles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Temperatura */}
        <div
          style={{
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #eaeaea",
          }}
        >
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            Temperature: {temperature.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <small>0 = faithful | 2 = creative</small>
        </div>

        {/* Seed + Per-prompt */}
        <div
          style={{
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #eaeaea",
          }}
        >
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            Seed configuration:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value || "0", 10))}
              style={{
                width: "130px",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
              style={{
                padding: "6px 10px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Randomize
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={perPromptSeed}
                onChange={(e) => setPerPromptSeed(e.target.checked)}
              />
              <span style={{ fontSize: 14 }}>Per-prompt seed</span>
            </label>
          </div>
          <small style={{ color: "#666" }}>
            When enabled, each prompt uses a unique seed
          </small>
        </div>

        {/* Colunas */}
        <div
          style={{
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #eaeaea",
          }}
        >
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            Grid columns:
          </label>
          <select
            value={columns}
            onChange={(e) => setColumns(parseInt(e.target.value, 10))}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "#fff",
            }}
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} columns
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompts */}
      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eaeaea",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 8,
            justifyContent: "space-between",
          }}
        >
          <strong>Prompts</strong>
          <button
            onClick={toggleAll}
            style={{
              background: "#eaeaea",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {allSelected ? "Unselect All" : "Select All"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 8,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {prompts.map((p) => (
            <label
              key={p.name}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={selected.includes(p.name)}
                onChange={() => togglePrompt(p.name)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            background: "#111",
            color: "white",
            border: "none",
            padding: "10px 18px",
            marginRight: 10,
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
        <button
          onClick={handleDownloadAll}
          style={{
            background: "#666",
            color: "white",
            border: "none",
            padding: "10px 18px",
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          Download All (ZIP)
        </button>
      </div>

      {/* Painel debug/meta */}
      {(modelUsed || seedBase !== null) && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eaeaea",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
            fontSize: 13,
            color: "#444",
          }}
        >
          <div><strong>Model:</strong> {modelUsed || "—"}</div>
          <div><strong>Temp:</strong> {temperature.toFixed(2)}</div>
          <div><strong>Base Seed:</strong> {seedBase ?? seed}</div>
          <div><strong>Per-prompt:</strong> {perPromptFlag ? "ON" : "OFF"}</div>
        </div>
      )}

      <p>{status}</p>

      {/* Grid imagens */}
      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
            marginTop: 20,
          }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                padding: 10,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, wordBreak: "break-word" }}>
                {img.name}
              </p>
              <img
                src={img.src}
                alt={img.name}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 6,
                  marginTop: 6,
                }}
              />
              {img.seedUsed !== undefined && (
                <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  Seed used: {img.seedUsed}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// evitar hydration error
export default dynamic(() => Promise.resolve(Home), { ssr: false });
