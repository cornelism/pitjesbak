"use client";

import { useState, type RefObject } from "react";
import type { DieCropBatch } from "./types";

export default function SaveDieCrops({ batchRef }: { batchRef: RefObject<DieCropBatch | null> }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    const batch = batchRef.current;
    if (!batch?.crops.length || Date.now() - Date.parse(batch.capturedAt) > 5000) {
      setMessage("Wait for dice to appear in the camera before saving crops.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const crops = batch.crops.map(({ image, ...crop }) => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.putImageData(image, 0, 0);
        return { ...crop, png: canvas.toDataURL("image/png") };
      });
      const response = await fetch("/api/dev/die-crops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...batch, crops }),
      });
      if (!response.ok) throw new Error("Save failed");
      const result: { path: string } = await response.json();
      setMessage(`Saved ${crops.length} die images to ${result.path}`);
    } catch {
      setMessage("Could not save die crops. Keep the local development server running and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 text-sm text-zinc-300">
      <button type="button" disabled={pending} onClick={() => { void save(); }}
        className="rounded-lg border border-white/20 px-5 py-3 font-medium hover:bg-white/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
        {pending ? "Saving die crops…" : "Save die crops to repo"}
      </button>
      <p>Development: saves separate die PNGs and reading details in docs/dice-crops/captures.</p>
      {message && <p role="status" className="break-all text-emerald-300">{message}</p>}
    </div>
  );
}
