"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import {
  playerRegistrationSchema,
  PlayerRegistrationFormValues,
  PlayerRegistrationInput,
} from "@/lib/validation";
import { handlePlayerRegistration, RegisteredPlayerData } from "@/lib/submitHandler";
import { PhotoUpload } from "./PhotoUpload";
import { FormField } from "./FormField";
import { RoleSelect } from "./RoleSelect";
import { SubmissionFeedback } from "./SubmissionFeedback";
import { VolleyballIcon } from "./VolleyballIcon";

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<RegisteredPlayerData | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PlayerRegistrationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(playerRegistrationSchema) as any,
    defaultValues: {
      photo: null,
      name: "",
      village: "",
      role: undefined,
      phone: "",
    },
    mode: "onTouched",
  });

  // Manage preview URL creation and cleanup
  const handlePhotoSelect = useCallback((file: File | null) => {
    setPhotoPreviewUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  // Cleanup photo preview URL when component unmounts entirely
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const onSubmit = async (data: PlayerRegistrationFormValues) => {
    try {
      setIsSubmitting(true);
      setFormError(null);

      // Cast to validated input as guaranteed by Zod resolver
      const validatedInput = data as PlayerRegistrationInput;

      // Call real backend submission handler
      const response = await handlePlayerRegistration(validatedInput);

      if (response.success && response.data) {
        setSubmissionResult(response.data);
      } else {
        setFormError(response.error || "An unexpected error occurred during registration.");
      }
    } catch {
      setFormError("Could not connect to registration server. Please verify backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    reset({
      photo: null,
      name: "",
      village: "",
      role: undefined,
      phone: "",
    });
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }
    setSubmissionResult(null);
    setFormError(null);
  };

  return (
    <div className="w-full max-w-[640px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* If submission has completed, show confirmed feedback card with assigned serial */}
      {submissionResult ? (
        <SubmissionFeedback
          record={submissionResult}
          onReset={handleResetForm}
        />
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <section className="text-center space-y-3">
            {/* Gold Volleyball Tournament Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider shadow-sm">
              <VolleyballIcon size={16} strokeColor="#f59e0b" />
              <span>Volleyball Friends Nalthur Trophy 2026</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Ready to Play?
            </h2>

            <p className="text-sm sm:text-base text-neutral-300 max-w-md mx-auto leading-relaxed">
              Register now and be part of Volleyball Friends Nalthur. Complete your details below.
            </p>
          </section>

          {/* Registration Form Card */}
          <div className="bg-[#0d1217] rounded-3xl border border-amber-500/25 shadow-2xl shadow-black/80 p-5 sm:p-8 backdrop-blur-md">
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-6"
            >
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Field 1: Player Photo */}
              <Controller
                control={control}
                name="photo"
                render={({ field }) => (
                  <PhotoUpload
                    value={field.value}
                    previewUrl={photoPreviewUrl}
                    onChange={(file) => {
                      field.onChange(file);
                      handlePhotoSelect(file);
                    }}
                    error={errors.photo?.message}
                  />
                )}
              />

              {/* Field 2: Player Name */}
              <FormField
                {...register("name")}
                id="player-name"
                label="Player Name"
                placeholder="Enter your full name"
                autoComplete="name"
                error={errors.name?.message}
                hint="Your official tournament display name"
              />

              {/* Field 3: Village */}
              <FormField
                {...register("village")}
                id="village-name"
                label="Village"
                placeholder="Enter your village name"
                autoComplete="address-level2"
                error={errors.village?.message}
                hint="Village or local club representing"
              />

              {/* Field 4: Playing Role */}
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <RoleSelect
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.role?.message}
                  />
                )}
              />

              {/* Field 5: Phone Number */}
              <FormField
                {...register("phone")}
                id="phone-number"
                label="Phone Number"
                type="tel"
                placeholder="Enter your mobile number"
                autoComplete="tel"
                error={errors.phone?.message}
                hint="10-digit Indian mobile number"
                prefixElement={
                  <span className="text-amber-400 text-xs sm:text-sm font-bold select-none">
                    +91
                  </span>
                }
              />

              {/* Submit Button (Championship Gold) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] text-slate-950 text-sm sm:text-base font-black tracking-wider uppercase transition-all duration-150 shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                      <span>Saving Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Register Player</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>
              </div>

              {/* Tournament Privacy / Policy note */}
              <p className="text-center text-[11px] text-neutral-500">
                Official tournament registration for Volleyball Friends Nalthur Trophy 2026.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
