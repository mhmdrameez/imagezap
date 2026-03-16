"use client";

import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";

type FitMode = "contain" | "cover" | "stretch";
type OutputFormat = "original" | "image/jpeg" | "image/webp" | "image/png";

type SourceItem = {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  srcUrl: string;
  width?: number;
  height?: number;
  crop?: CropRect;
};

type CropRect = { x: number; y: number; w: number; h: number };

type OutputItem = {
  id: string;
  blob: Blob;
  url: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
};

const SUPPORT_URL = "https://www.buymeacoffee.com/mhmdrameez";
const GITHUB_URL = "https://github.com/mhmdrameez/imagezap";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  const decimals = u === 0 ? 0 : u === 1 ? 1 : 2;
  return `${n.toFixed(decimals)} ${units[u]}`;
}

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "img";
}

function stripExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return filename;
  return filename.slice(0, idx);
}

async function loadImageBitmap(file: File): Promise<{ bmp: ImageBitmap; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  return { bmp, width: bmp.width, height: bmp.height };
}

function computeTargetSize(opts: {
  srcW: number;
  srcH: number;
  width?: number;
  height?: number;
  keepAspect: boolean;
}): { targetW: number; targetH: number } {
  const { srcW, srcH, width, height, keepAspect } = opts;

  const w = width && width > 0 ? Math.round(width) : undefined;
  const h = height && height > 0 ? Math.round(height) : undefined;

  if (!w && !h) return { targetW: srcW, targetH: srcH };
  if (!keepAspect) return { targetW: w ?? srcW, targetH: h ?? srcH };

  if (w && !h) return { targetW: w, targetH: Math.max(1, Math.round((srcH * w) / srcW)) };
  if (!w && h) return { targetW: Math.max(1, Math.round((srcW * h) / srcH)), targetH: h };

  return { targetW: w!, targetH: h! };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("Failed to export image"));
        else resolve(b);
      },
      type,
      quality,
    );
  });
}

async function processOne(opts: {
  file: File;
  crop?: CropRect;
  width?: number;
  height?: number;
  keepAspect: boolean;
  fitMode: FitMode;
  outputFormat: OutputFormat;
  quality: number;
  background: "transparent" | "white";
}): Promise<{ blob: Blob; width: number; height: number; type: string }> {
  const { file, fitMode, keepAspect, outputFormat, quality, background } = opts;
  const { bmp, width: srcW, height: srcH } = await loadImageBitmap(file);

  const crop = opts.crop;
  const baseRect = crop
    ? {
        sx: Math.max(0, Math.min(srcW - 1, Math.round(crop.x))),
        sy: Math.max(0, Math.min(srcH - 1, Math.round(crop.y))),
        sw: Math.max(1, Math.min(srcW, Math.round(crop.w))),
        sh: Math.max(1, Math.min(srcH, Math.round(crop.h))),
      }
    : { sx: 0, sy: 0, sw: srcW, sh: srcH };
  baseRect.sw = Math.max(1, Math.min(srcW - baseRect.sx, baseRect.sw));
  baseRect.sh = Math.max(1, Math.min(srcH - baseRect.sy, baseRect.sh));

  const outType = outputFormat === "original" ? (file.type || "image/png") : outputFormat;
  const { targetW, targetH } = computeTargetSize({
    srcW: baseRect.sw,
    srcH: baseRect.sh,
    width: opts.width,
    height: opts.height,
    keepAspect,
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, targetW);
  canvas.height = Math.max(1, targetH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const needsOpaqueBg = outType === "image/jpeg";
  if (needsOpaqueBg || background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (!keepAspect || fitMode === "stretch") {
    ctx.drawImage(bmp, baseRect.sx, baseRect.sy, baseRect.sw, baseRect.sh, 0, 0, canvas.width, canvas.height);
  } else if (fitMode === "contain") {
    const scale = Math.min(canvas.width / baseRect.sw, canvas.height / baseRect.sh);
    const dw = Math.max(1, Math.round(baseRect.sw * scale));
    const dh = Math.max(1, Math.round(baseRect.sh * scale));
    const dx = Math.round((canvas.width - dw) / 2);
    const dy = Math.round((canvas.height - dh) / 2);
    ctx.drawImage(bmp, baseRect.sx, baseRect.sy, baseRect.sw, baseRect.sh, dx, dy, dw, dh);
  } else {
    const scale = Math.max(canvas.width / baseRect.sw, canvas.height / baseRect.sh);
    const dw = Math.max(1, Math.round(baseRect.sw * scale));
    const dh = Math.max(1, Math.round(baseRect.sh * scale));
    const dx = Math.round((canvas.width - dw) / 2);
    const dy = Math.round((canvas.height - dh) / 2);
    ctx.drawImage(bmp, baseRect.sx, baseRect.sy, baseRect.sw, baseRect.sh, dx, dy, dw, dh);
  }

  bmp.close();

  const q = outType === "image/jpeg" || outType === "image/webp" ? quality : undefined;
  const blob = await canvasToBlob(canvas, outType, q);
  return { blob, width: canvas.width, height: canvas.height, type: outType };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function BulkImageTool() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);

  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [keepAspect, setKeepAspect] = useState(true);
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(0.82);
  const [background, setBackground] = useState<"transparent" | "white">("transparent");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cropFor, setCropFor] = useState<SourceItem | null>(null);

  const sizeBefore = useMemo(() => sources.reduce((sum, s) => sum + s.size, 0), [sources]);
  const sizeAfter = useMemo(() => outputs.reduce((sum, o) => sum + o.size, 0), [outputs]);

  useEffect(() => {
    return () => {
      for (const s of sources) URL.revokeObjectURL(s.srcUrl);
      for (const o of outputs) URL.revokeObjectURL(o.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAll() {
    setError(null);
    setProgress(null);
    setIsProcessing(false);
    setSources((prev) => {
      for (const s of prev) URL.revokeObjectURL(s.srcUrl);
      return [];
    });
    setOutputs((prev) => {
      for (const o of prev) URL.revokeObjectURL(o.url);
      return [];
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setProgress(null);

    const next: SourceItem[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const srcUrl = URL.createObjectURL(f);
      next.push({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        type: f.type,
        size: f.size,
        srcUrl,
      });
    }

    for (const item of next) {
      try {
        const { width: w, height: h, bmp } = await (async () => {
          const bmp = await createImageBitmap(item.file);
          return { width: bmp.width, height: bmp.height, bmp };
        })();
        bmp.close();
        item.width = w;
        item.height = h;
      } catch {
        // ignore dimension probe errors; processing step will surface errors if needed
      }
    }

    setSources(next);
    setOutputs((prev) => {
      for (const o of prev) URL.revokeObjectURL(o.url);
      return [];
    });
  }

  async function runProcessing() {
    if (sources.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setProgress({ done: 0, total: sources.length });

    const wNum = width.trim() ? Number(width) : undefined;
    const hNum = height.trim() ? Number(height) : undefined;

    const nextOutputs: OutputItem[] = [];
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      try {
        const res = await processOne({
          file: src.file,
          crop: src.crop,
          width: wNum,
          height: hNum,
          keepAspect,
          fitMode,
          outputFormat,
          quality,
          background,
        });

        const base = stripExt(src.name);
        const ext = extForMime(res.type);
        const outName = `${base}.${ext}`;
        const outUrl = URL.createObjectURL(res.blob);
        nextOutputs.push({
          id: src.id,
          blob: res.blob,
          url: outUrl,
          name: outName,
          type: res.type,
          size: res.blob.size,
          width: res.width,
          height: res.height,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to process image";
        setError(`"${src.name}": ${msg}`);
      } finally {
        setProgress({ done: i + 1, total: sources.length });
      }
    }

    setOutputs((prev) => {
      for (const o of prev) URL.revokeObjectURL(o.url);
      return nextOutputs;
    });
    setIsProcessing(false);
  }

  async function downloadAllZip() {
    if (outputs.length === 0) return;
    setError(null);
    try {
      const zip = new JSZip();
      for (const o of outputs) zip.file(o.name, o.blob);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "images.zip");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create ZIP";
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Bulk Image Resizer & Compressor
            </h1>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2">
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
              >
                Buy me a coffee
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10 sm:w-auto"
              >
                GitHub
              </a>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-pretty text-zinc-600 dark:text-zinc-400">
            Resize, compress, and convert multiple images right in your browser. Everything runs locally using the Canvas
            API — your files are never uploaded.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-5 lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                Clear
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Upload images</label>
                <div className="mt-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void onPickFiles(e.target.files)}
                    className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Tip: choose multiple files at once.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Width (px)</label>
                  <input
                    inputMode="numeric"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="(keep)"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Height (px)</label>
                  <input
                    inputMode="numeric"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="(keep)"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Keep aspect ratio</label>
                <input
                  type="checkbox"
                  checked={keepAspect}
                  onChange={(e) => setKeepAspect(e.target.checked)}
                  className="h-4 w-4 accent-zinc-900 dark:accent-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Fit mode</label>
                  <select
                    value={fitMode}
                    onChange={(e) => setFitMode(e.target.value as FitMode)}
                    disabled={!keepAspect}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950"
                  >
                    <option value="contain">Contain</option>
                    <option value="cover">Cover (crop)</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Output format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
                  >
                    <option value="original">Original</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/webp">WebP</option>
                    <option value="image/png">PNG</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Quality</label>
                  <span className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Used for JPEG/WebP only.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Background (for JPEG/contain)</label>
                <select
                  value={background}
                  onChange={(e) => setBackground(e.target.value as "transparent" | "white")}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
                >
                  <option value="transparent">Transparent</option>
                  <option value="white">White</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => void runProcessing()}
                disabled={sources.length === 0 || isProcessing}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {isProcessing ? "Processing…" : `Process ${sources.length || ""}`.trim()}
              </button>

              {progress && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {progress.done}/{progress.total} done
                </p>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Total before</span>
                  <span className="font-medium tabular-nums">{formatBytes(sizeBefore)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Total after</span>
                  <span className="font-medium tabular-nums">{outputs.length ? formatBytes(sizeAfter) : "—"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void downloadAllZip()}
                disabled={outputs.length === 0}
                className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
              >
                Download all (ZIP)
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Images</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {sources.length} selected · {outputs.length} processed
              </p>
            </div>

            {sources.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                Upload images to get started.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sources.map((s) => {
                  const out = outputs.find((o) => o.id === s.id);
                  return (
                    <div
                      key={s.id}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950"
                    >
                      <div className="aspect-[4/3] bg-zinc-100 dark:bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={out?.url ?? s.srcUrl}
                          alt={s.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="space-y-1.5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{s.name}</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              {s.width && s.height ? `${s.width}×${s.height}` : "—"} · {formatBytes(s.size)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCropFor(s)}
                              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
                            >
                              {s.crop ? "Crop (set)" : "Crop"}
                            </button>
                            {out && (
                              <button
                                type="button"
                                onClick={() => downloadBlob(out.blob, out.name)}
                                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                              >
                                Download
                              </button>
                            )}
                          </div>
                        </div>

                        {out && (
                          <div className="rounded-xl bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-600 dark:text-zinc-400">Output</span>
                              <span className="font-medium tabular-nums">{formatBytes(out.size)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-zinc-600 dark:text-zinc-400">Dimensions</span>
                              <span className="font-medium tabular-nums">
                                {out.width}×{out.height}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-zinc-600 dark:text-zinc-400">Type</span>
                              <span className="font-medium">{out.type}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {cropFor && (
          <CropModal
            item={cropFor}
            onClose={() => setCropFor(null)}
            onSave={(rect) => {
              setSources((prev) => prev.map((p) => (p.id === cropFor.id ? { ...p, crop: rect } : p)));
              setCropFor(null);
            }}
            onClear={() => {
              setSources((prev) => prev.map((p) => (p.id === cropFor.id ? { ...p, crop: undefined } : p)));
              setCropFor(null);
            }}
          />
        )}

        <footer className="mt-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Privacy-friendly: images stay on your device.
        </footer>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function CropModal(props: {
  item: SourceItem;
  onClose: () => void;
  onSave: (rect: CropRect) => void;
  onClear: () => void;
}) {
  const { item, onClose, onSave, onClear } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);
  const CANVAS_W = 1000;
  const CANVAS_H = 560;
  const dragRef = useRef<
    | null
    | {
        mode: "move" | "nw" | "ne" | "sw" | "se";
        startX: number;
        startY: number;
        startRect: CropRect;
      }
  >(null);

  useEffect(() => {
    const i = new Image();
    i.decoding = "async";
    i.src = item.srcUrl;
    i.onload = () => {
      setImg(i);
      setImgSize({ w: i.naturalWidth, h: i.naturalHeight });
      const initial = item.crop
        ? item.crop
        : {
            x: Math.round(i.naturalWidth * 0.1),
            y: Math.round(i.naturalHeight * 0.1),
            w: Math.round(i.naturalWidth * 0.8),
            h: Math.round(i.naturalHeight * 0.8),
          };
      setRect(initial);
    };
    return () => {
      // allow GC
    };
  }, [item]);

  const view = useMemo(() => {
    if (!imgSize) return null;
    const cw = CANVAS_W;
    const ch = CANVAS_H;
    const scale = Math.min(cw / imgSize.w, ch / imgSize.h);
    const dw = imgSize.w * scale;
    const dh = imgSize.h * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    return { scale, dx, dy, dw, dh };
  }, [imgSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const r = rect;
    if (!canvas || !img || !imgSize || !view || !r) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, view.dx, view.dy, view.dw, view.dh);

    const rx = view.dx + r.x * view.scale;
    const ry = view.dy + r.y * view.scale;
    const rw = r.w * view.scale;
    const rh = r.h * view.scale;

    // dim outside
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(view.dx, view.dy, view.dw, view.dh);
    ctx.clearRect(rx, ry, rw, rh);
    ctx.restore();

    // crop border
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);
    // handles
    const hs = 10;
    const handles = [
      { x: rx, y: ry },
      { x: rx + rw, y: ry },
      { x: rx, y: ry + rh },
      { x: rx + rw, y: ry + rh },
    ];
    ctx.fillStyle = "white";
    for (const h of handles) {
      ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
    }
    ctx.restore();
  }, [img, imgSize, rect, view]);

  function hitTestHandle(px: number, py: number, r: CropRect) {
    if (!view) return null;
    const rx = view.dx + r.x * view.scale;
    const ry = view.dy + r.y * view.scale;
    const rw = r.w * view.scale;
    const rh = r.h * view.scale;
    const hs = 12;
    const spots: Array<{ mode: "nw" | "ne" | "sw" | "se"; x: number; y: number }> = [
      { mode: "nw", x: rx, y: ry },
      { mode: "ne", x: rx + rw, y: ry },
      { mode: "sw", x: rx, y: ry + rh },
      { mode: "se", x: rx + rw, y: ry + rh },
    ];
    for (const s of spots) {
      if (Math.abs(px - s.x) <= hs && Math.abs(py - s.y) <= hs) return s.mode;
    }
    // inside rect => move
    if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) return "move";
    return null;
  }

  function onPointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas || !rect || !imgSize) return;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / bounds.width;
    const scaleY = CANVAS_H / bounds.height;
    const px = (e.clientX - bounds.left) * scaleX;
    const py = (e.clientY - bounds.top) * scaleY;
    const mode = hitTestHandle(px, py, rect);
    if (!mode) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: px, startY: py, startRect: rect };
  }

  function onPointerMove(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag || !rect || !imgSize || !view) return;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / bounds.width;
    const scaleY = CANVAS_H / bounds.height;
    const px = (e.clientX - bounds.left) * scaleX;
    const py = (e.clientY - bounds.top) * scaleY;

    const dxi = (px - drag.startX) / view.scale;
    const dyi = (py - drag.startY) / view.scale;

    const minSize = 20;
    const next = { ...drag.startRect };

    if (drag.mode === "move") {
      next.x = drag.startRect.x + dxi;
      next.y = drag.startRect.y + dyi;
    } else {
      if (drag.mode.includes("w")) {
        const newX = drag.startRect.x + dxi;
        const maxX = drag.startRect.x + drag.startRect.w - minSize;
        next.x = Math.min(newX, maxX);
        next.w = drag.startRect.w + (drag.startRect.x - next.x);
      }
      if (drag.mode.includes("e")) {
        next.w = Math.max(minSize, drag.startRect.w + dxi);
      }
      if (drag.mode.includes("n")) {
        const newY = drag.startRect.y + dyi;
        const maxY = drag.startRect.y + drag.startRect.h - minSize;
        next.y = Math.min(newY, maxY);
        next.h = drag.startRect.h + (drag.startRect.y - next.y);
      }
      if (drag.mode.includes("s")) {
        next.h = Math.max(minSize, drag.startRect.h + dyi);
      }
    }

    next.x = clamp(next.x, 0, imgSize.w - 1);
    next.y = clamp(next.y, 0, imgSize.h - 1);
    next.w = clamp(next.w, minSize, imgSize.w - next.x);
    next.h = clamp(next.h, minSize, imgSize.h - next.y);

    setRect({
      x: Math.round(next.x),
      y: Math.round(next.y),
      w: Math.round(next.w),
      h: Math.round(next.h),
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Crop</p>
            <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-2xl bg-zinc-100 p-2 dark:bg-white/5">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="h-auto w-full touch-none rounded-xl bg-black"
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Drag inside to move. Drag corners to resize.
              {rect && imgSize && (
                <span className="ml-2 tabular-nums">
                  {rect.w}×{rect.h}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-2">
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
              >
                Clear crop
              </button>
              <button
                type="button"
                disabled={!rect}
                onClick={() => rect && onSave(rect)}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Save crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

