"use client";

import React, { useRef, useState, useCallback } from "react";
import { Camera, UploadCloud, X, RefreshCw, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation";

interface PhotoUploadProps {
  value: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
  error?: string;
}

// Client-side helper to scale/compress large mobile camera photos
async function compressImageForUpload(file: File): Promise<File> {
  // If file is already small (under 1.5MB) and has standard image type, return as-is
  if (
    file.size <= 1.5 * 1024 * 1024 &&
    (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1800;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, { type: "image/jpeg" });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.88
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({
  value,
  previewUrl,
  onChange,
  error,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Validate file client-side (with mobile camera compression)
  const validateAndSelectFile = useCallback(
    async (file: File) => {
      setInternalError(null);

      // Handle compression for mobile devices / large camera images
      let fileToUse = file;
      try {
        fileToUse = await compressImageForUpload(file);
      } catch {
        fileToUse = file;
      }

      if (fileToUse.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (fileToUse.size / (1024 * 1024)).toFixed(1);
        setInternalError(`File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`);
        return;
      }

      onChange(fileToUse);
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
    // reset input so the user can re-select the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setInternalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Helper to load sample player portrait for immediate demo testing
  const handleUseDemoPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Deep forest sports gradient background
        const grad = ctx.createLinearGradient(0, 0, 300, 300);
        grad.addColorStop(0, "#072416");
        grad.addColorStop(1, "#145936");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 300, 300);

        // Sports player silhouette
        ctx.fillStyle = "#dcfce7";
        ctx.beginPath();
        ctx.arc(150, 105, 46, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(150, 260, 90, 0, Math.PI, true);
        ctx.fill();

        // Text emblem
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VFN PLAYER", 150, 195);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const demoFile = new File([blob], "demo-player-photo.png", {
            type: "image/png",
          });
          validateAndSelectFile(demoFile);
        }
      }, "image/png");
    } catch {
      // Fallback if canvas is restricted
    }
  };

  const displayError = internalError || error;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="player-photo-input"
          className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-200 flex items-center gap-1.5"
        >
          <span>Player Photo</span>
          <span className="text-amber-400 font-black" aria-hidden="true">
            *
          </span>
        </label>
        <span className="text-[11px] font-medium text-neutral-400">
          Max 5 MB (JPG, PNG, WebP)
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="player-photo-input"
        type="file"
        accept="image/*,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        aria-describedby={displayError ? "photo-error" : undefined}
      />

      {/* Active Preview State */}
      {previewUrl ? (
        <div className="relative rounded-2xl border border-amber-500/30 bg-[#080b0f] p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4 transition-all">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-neutral-900 border border-amber-500/40 shadow-md flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Player photo preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 w-full space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white truncate">
                {value?.name || "Player Photo Selected"}
              </p>
              <p className="text-xs text-neutral-400">
                {value ? `${(value.size / (1024 * 1024)).toFixed(2)} MB` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={handleTriggerUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121820] border border-amber-500/30 text-amber-300 hover:bg-[#1a232f] hover:border-amber-400 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/40 transition-colors shadow-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          role="button"
          tabIndex={0}
          onClick={handleTriggerUpload}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTriggerUpload();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative rounded-2xl border-2 border-dashed p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
              : displayError
              ? "border-rose-500/60 bg-rose-950/20 hover:border-rose-400"
              : "border-neutral-700/80 bg-[#080b0f] hover:border-amber-500/60 hover:bg-amber-500/[0.02]"
          }`}
        >
          {/* Sports Icon Container */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:border-amber-400 transition-all shadow-inner">
            <Camera className="w-7 h-7 text-amber-400" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-white">
              <span className="text-amber-400 underline underline-offset-2">
                Click to upload
              </span>{" "}
              or drag & drop
            </p>
            <p className="text-xs text-neutral-400">
              Clear passport-style or action portrait photo
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
            <UploadCloud className="w-3.5 h-3.5 text-amber-400/70" />
            <span>JPEG, PNG, WebP up to 5 MB</span>
          </div>

          {/* Quick Demo Photo Trigger */}
          <div className="mt-3 pt-3 border-t border-neutral-800 w-full flex justify-center">
            <button
              type="button"
              onClick={handleUseDemoPhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-semibold text-amber-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Use Demo Photo for Quick Test</span>
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {displayError && (
        <p
          id="photo-error"
          className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mt-1"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
}
