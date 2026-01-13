"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type PromptItem = { name: string; prompt: string };
type ImageResult = { name: string; src: string; seedUsed?: number; filename?: string };

const Lightbox = ({ images, index, onClose, onPrev, onNext }: { images: ImageResult[], index: number, onClose: () => void, onPrev: (e: React.MouseEvent) => void, onNext: (e: React.MouseEvent) => void }) => {
  if (!images || images.length === 0) return null;

  const image = images[index];

  return (
    <div style={lightboxStyles.overlay} onClick={onClose}>
      <button style={{ ...lightboxStyles.button, ...lightboxStyles.closeButton }} onClick={onClose}>
        &times;
      </button>
      <button style={{ ...lightboxStyles.button, ...lightboxStyles.prevButton }} onClick={onPrev}>
        &#10094;
      </button>
      <button style={{ ...lightboxStyles.button, ...lightboxStyles.nextButton }} onClick={onNext}>
        &#10095;
      </button>
      <div style={lightboxStyles.content} onClick={(e) => e.stopPropagation()}>
        <img src={image.src} alt={image.name} style={lightboxStyles.image} />
        <p style={lightboxStyles.caption}>{image.name}</p>
      </div>
    </div>
  );
};

const lightboxStyles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    position: 'relative',
    background: '#fff',
    padding: 20,
    borderRadius: 8,
    textAlign: 'center',
    maxWidth: '90%',
  },
  image: {
    maxWidth: 'calc(100vw - 100px)',
    maxHeight: 'calc(100vh - 150px)',
    objectFit: 'contain',
  },
  caption: {
    marginTop: 10,
    color: '#333',
    fontSize: 16,
  },
  button: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    border: 'none',
    fontSize: 32,
    padding: '10px 15px',
    cursor: 'pointer',
    borderRadius: 8,
    userSelect: 'none',
  },
  closeButton: {
    top: 20,
    right: 20,
    transform: 'none',
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
};

const EditPromptsModal = ({ prompts, onSave, onCancel, onPromptChange }: { prompts: PromptItem[], onSave: () => void, onCancel: () => void, onPromptChange: (index: number, value: string) => void }) => {
  return (
    <div style={lightboxStyles.overlay}>
      <div style={{...lightboxStyles.content, textAlign: 'left', maxWidth: '800px', width: '90%'}}>
        <h2 style={{marginTop: 0}}>Edit Prompts</h2>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '15px' }}>
          {prompts.map((p, index) => (
            <div key={p.name} style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{p.name}</label>
              <textarea
                value={p.prompt}
                onChange={(e) => onPromptChange(index, e.target.value)}
                style={{ width: '100%', minHeight: '80px', border: '1px solid #ccc', borderRadius: 4, padding: '8px', fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button onClick={onCancel} style={{
            background: "#666",
            color: "white",
            border: "none",
            padding: "10px 18px",
            marginRight: 10,
            cursor: "pointer",
            borderRadius: 6,
          }}>Cancel</button>
          <button onClick={onSave} style={{
            background: "#111",
            color: "white",
            border: "none",
            padding: "10px 18px",
            cursor: "pointer",
            borderRadius: 6,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
};


export function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [status, setStatus] = useState("Select a file and click Generate.");
  const [loading, setLoading] = useState(false);

  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = prompts.length > 0 && selected.length === prompts.length;

  const [isEditingPrompts, setIsEditingPrompts] = useState(false);
  const [editingPrompts, setEditingPrompts] = useState<PromptItem[]>([]);

  // Controles
  const [temperature, setTemperature] = useState<number>(1);
  const [seed, setSeed] = useState<number>(123456789);
  const [perPromptSeed, setPerPromptSeed] = useState<boolean>(false);

  // Debug/meta
  const [modelUsed, setModelUsed] = useState<string>("");
  const [seedBase, setSeedBase] = useState<number | null>(null);
  const [perPromptFlag, setPerPromptFlag] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState(false);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }

  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxImageIndex(prevIndex => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxImageIndex(prevIndex => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };


  useEffect(() => {
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setFilePreviews(newPreviews);

    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowLeft') {
        setLightboxImageIndex(prevIndex => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxImageIndex(prevIndex => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, images.length]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

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

  // ===== paste =====
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        addLog(`Pasted ${e.clipboardData.files.length} file(s).`);
        setFiles(prev => [...prev, ...Array.from(e.clipboardData.files)]);
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  function getPerPromptFlagFromResponse(data: any): boolean {
    if (typeof data?.seedMode === "string") {
      return data.seedMode.toLowerCase() === "perprompt";
    }
    return !!data?.perPrompt;
  }

  const promptsLoaded = useRef(false);
  // ===== carrega prompts =====
  useEffect(() => {
    if (promptsLoaded.current) return;
    promptsLoaded.current = true;
    addLog("Loading prompts...");
    (async () => {
      try {
        const res = await fetch("/api/nano");
        const data = await res.json();
        if (data?.ok && Array.isArray(data.prompts)) {
          setPrompts(data.prompts);
setSelected(data.prompts.map((p: PromptItem) => p.name));
          addLog(`Loaded ${data.prompts.length} prompts.`);
        } else {
          const errorMsg = "Failed to load prompts.";
          setStatus(errorMsg);
          addLog(`Error: ${errorMsg}`);
        }
      } catch (e: any) {
        const errorMsg = `Failed to load prompts: ${e.message}`;
        setStatus(errorMsg);
        addLog(`Error: ${errorMsg}`);
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

  // ===== prompt editing =====
  function handleEditPrompts() {
    setEditingPrompts(JSON.parse(JSON.stringify(prompts))); // Deep copy
    setIsEditingPrompts(true);
  }

  function handlePromptChange(index: number, newPrompt: string) {
    setEditingPrompts(current => {
      const newPrompts = [...current];
      newPrompts[index] = { ...newPrompts[index], prompt: newPrompt };
      return newPrompts;
    });
  }

  function handleSavePrompts() {
    setPrompts(editingPrompts);
    setIsEditingPrompts(false);
    addLog("Prompts updated for this session.");
  }

  function handleCancelEdit() {
    setIsEditingPrompts(false);
  }

  // ===== geração =====
  async function handleGenerate() {
    if (!files.length) {
      alert("Please select at least one image.");
      return;
    }
    setLoading(true);
    setStatus("Generating images...");
    setLogs([]);
    setImages([]);
    addLog("Starting image generation process...");
    
    const promptsToUse = prompts.filter(p => selected.includes(p.name));
    addLog(`Selected ${files.length} file(s) and ${promptsToUse.length} prompt(s).`);

    const allResults: ImageResult[] = [];

    for (let i = 0; i < promptsToUse.length; i++) {
      const prompt = promptsToUse[i];
      try {
        const form = new FormData();
        files.forEach((f) => form.append("images", f));
        form.append("prompts", JSON.stringify([prompt]));

        const qs = new URLSearchParams({
          temp: String(temperature),
          seed: String(seed),
          seedMode: perPromptSeed ? "perPrompt" : "one",
        });

        addLog(`(${i + 1}/${promptsToUse.length}) Sending request for prompt: "${prompt.name}"...`);
        setStatus(`Sending ${i + 1} of ${promptsToUse.length}...`);
        
        const res = await fetch(`/api/nano?${qs.toString()}`, {
          method: "POST",
          body: form,
        });

        addLog(`(${i + 1}/${promptsToUse.length}) Received response for prompt: "${prompt.name}".`);
        setStatus(`Received ${i + 1} of ${promptsToUse.length}...`);

        const data = await res.json();

        if (!data.ok) {
          throw new Error(data.error || `Unknown error from API for prompt "${prompt.name}"`);
        }
        
        addLog(`(${i + 1}/${promptsToUse.length}) API call successful for "${prompt.name}". Processing results...`);

        setModelUsed(data.modelUsed || "");
        setSeedBase(
          typeof data.baseSeed === "number"
            ? data.baseSeed
            : typeof data.seedBase === "number"
            ? data.seedBase
            : null
        );
        setPerPromptFlag(getPerPromptFlagFromResponse(data));

        const outs: ImageResult[] = (data.results || [])
            .filter((r: any) => r?.b64)
            .map((r: any) => {
              const s = normalizeSeed(r);
              const baseName: string = (r.name as string) || "image";

              const displayName =
                s !== undefined ? `${baseName} · seed ${s}` : baseName;

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
        
        allResults.push(...outs);
        setImages([...allResults]);

      } catch (err: any) {
        const errorMsg = `Error for prompt "${prompt.name}": ${err.message}`;
        setStatus(errorMsg);
        addLog(errorMsg);
      }
    }
    
    const finalStatusMsg = `Generated ${allResults.length} image(s) from ${promptsToUse.length} prompt(s).`;
    setStatus(finalStatusMsg);
    addLog(finalStatusMsg);
    addLog("Generation complete.");
    setLoading(false);
  }

  async function handleDownloadAll() {
    if (!images.length) {
      alert("No images generated yet.");
      return;
    }
    addLog(`Downloading ${images.length} images as a ZIP file.`);
    const zip = new JSZip();
    images.forEach((img) => {
      const base64Data = img.src.split(",")[1];
      if (img.filename) {
        zip.file(img.filename, base64Data, { base64: true });
        return;
      }
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
    addLog("ZIP file created and download started.");
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===== render =====
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', fontFamily: "Inter, sans-serif", padding: isMobile ? 15 : 30, background: "#f9f9f9", minHeight: "100vh", gap: 20 }}>
      {/* Left Panel */}
      <div style={{ width: isMobile ? '100%' : '50%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>
          M3C1 – Nano Banana Generator
        </h1>
        
        {/* Upload */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#111' : '#ccc'}`,
            borderRadius: 8,
            padding: 20,
            textAlign: 'center',
            backgroundColor: dragActive ? '#f0f0f0' : '#fff',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <p>Drag and drop your files here, or click to select files.</p>
            <p className="text-sm" style={{color: "#666"}}>You can also paste files from your clipboard.</p>
          </label>

          {/* File previews */}
          {filePreviews.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {filePreviews.map((preview, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={preview} alt={`preview ${i}`} style={{ height: 100, borderRadius: 8 }} />
                  <button onClick={() => handleRemoveFile(i)} style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0 8px 0 8px',
                    cursor: 'pointer',
                    width: 24,
                    height: 24,
                    fontSize: 16
                  }}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel de controles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
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
        </div>

        {/* Prompts */}
        <div
          style={{
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #eaeaea",
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
            <div>
              <button
                onClick={toggleAll}
                style={{
                  background: "#eaeaea",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: "pointer",
                  marginRight: 8,
                }}
              >
                {allSelected ? "Unselect All" : "Select All"}
              </button>
              <button
                onClick={handleEditPrompts}
                style={{
                  background: "#eaeaea",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Edit Prompts
              </button>
            </div>
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
        <div style={{ marginTop: 'auto' }}>
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
      </div>

      {/* Right Panel */}
      <div style={{ width: isMobile ? '100%' : '50%', maxHeight: isMobile ? 'none' : 'calc(100vh - 60px)', overflowY: 'auto', background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #eaeaea' }}>
        {/* Painel debug/meta */}
        {(modelUsed || seedBase !== null) && (
          <div
            style={{
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

        {/* Logger */}
        <div style={{ background: '#efefef', borderRadius: 8, padding: 12, marginTop: 16, height: 200, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>

        {/* Grid imagens */}
        {images.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`,
              gap: 16,
              marginTop: 20,
            }}
          >
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => openLightbox(i)}
                style={{
                  background: "white",
                  borderRadius: 8,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  padding: 10,
                  textAlign: "center",
                  cursor: 'pointer',
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
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          index={lightboxImageIndex}
          onClose={closeLightbox}
          onPrev={goToPrevImage}
          onNext={goToNextImage}
        />
      )}
      {isEditingPrompts && (
        <EditPromptsModal
          prompts={editingPrompts}
          onCancel={handleCancelEdit}
          onSave={handleSavePrompts}
          onPromptChange={handlePromptChange}
        />
      )}
    </div>
  );
}

// evitar hydration error
export default dynamic(() => Promise.resolve(Home), { ssr: false });
