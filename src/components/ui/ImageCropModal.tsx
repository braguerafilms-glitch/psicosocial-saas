"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Button } from "@/components/ui/Button";

async function getCroppedBlob(imageSrc: string, cropArea: Area, circular: boolean): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  const ctx = canvas.getContext("2d")!;
  if (!circular) {
    // preserve transparency for logo (PNG)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (circular) {
    ctx.beginPath();
    ctx.arc(cropArea.width / 2, cropArea.height / 2, cropArea.width / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, cropArea.width, cropArea.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas empty"))), circular ? "image/jpeg" : "image/png")
  );
}

type Props = {
  src: string;
  aspect: number;
  circular?: boolean;
  onDone: (blob: Blob) => void;
  onCancel: () => void;
};

export function ImageCropModal({ src, aspect, circular = false, onDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    const blob = await getCroppedBlob(src, croppedArea, circular);
    onDone(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Recortar imagem</p>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={circular ? "round" : "rect"}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="button" onClick={() => void handleConfirm()}>Usar esta área</Button>
        </div>
      </div>
    </div>
  );
}
