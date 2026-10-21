"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, UploadCloud, X, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation";

interface PhotoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  onPreviewChange?: (url: string | null) => void;
}

export function PhotoUpload({
  value,
  onChange,
  error,
  onPreviewChange,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Manage object URL lifecycle to prevent memory leaks
  useEffect(() => {
    if (!value) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        onPreviewChange?.(null);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);
    onPreviewChange?.(objectUrl);

    // Cleanup when value changes or component unmounts
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value, onPreviewChange]);

  // Validate file client-side
  const validateAndSelectFile = useCallback(
    (file: File) => {
      setInternalError(null);

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setInternalError("Invalid format. Please upload JPEG, PNG, or WebP.");
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setInternalError(`File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`);
        return;
      }

      onChange(file);
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

  const displayError = internalError || error;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="player-photo-input"
          className="text-xs sm:text-sm font-bold tracking-wide uppercase text-neutral-800 flex items-center gap-1.5"
        >
          <span>Player Photo</span>
          <span className="text-emerald-700" aria-hidden="true">
            *
          </span>
        </label>
        <span className="text-[11px] font-medium text-neutral-500">
          Max 5 MB (JPG, PNG, WebP)
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="player-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        aria-describedby={displayError ? "photo-error" : undefined}
      />

      {/* Active Preview State */}
      {previewUrl ? (
        <div className="relative rounded-2xl border-2 border-emerald-800/20 bg-emerald-50/30 p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4 transition-all">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-300 shadow-sm flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Player photo preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-emerald-700 text-white rounded-full p-0.5 shadow">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 w-full space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-neutral-800 truncate">
                {value?.name || "Player Photo Selected"}
              </p>
              <p className="text-xs text-neutral-500">
                {value ? `${(value.size / (1024 * 1024)).toFixed(2)} MB` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={handleTriggerUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-800" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors shadow-xs"
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
          className={`group relative rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-emerald-600 bg-emerald-50 scale-[1.01]"
              : displayError
              ? "border-rose-300 bg-rose-50/30 hover:border-rose-400"
              : "border-neutral-300 bg-white hover:border-emerald-700/60 hover:bg-emerald-50/20"
          }`}
        >
          {/* Sports Icon Container */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-900 border border-emerald-200/60 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-emerald-200/80 transition-all">
            <Camera className="w-7 h-7 text-[#0a2e1b]" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-800">
              <span className="text-[#0a2e1b] underline underline-offset-2">
                Click to upload
              </span>{" "}
              or drag & drop
            </p>
            <p className="text-xs text-neutral-500">
              Clear passport-style or action portrait photo
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>JPEG, PNG, WebP up to 5 MB</span>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {displayError && (
        <p
          id="photo-error"
          className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 mt-1"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
}
