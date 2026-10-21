"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import {
  playerRegistrationSchema,
  PlayerRegistrationFormValues,
  PlayerRegistrationInput,
  ValidatedPlayerDemoRecord,
} from "@/lib/validation";
import { handlePlayerRegistration } from "@/lib/submitHandler";
import { PhotoUpload } from "./PhotoUpload";
import { FormField } from "./FormField";
import { RoleSelect } from "./RoleSelect";
import { SubmissionFeedback } from "./SubmissionFeedback";
import { VolleyballIcon } from "./VolleyballIcon";

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ValidatedPlayerDemoRecord | null>(null);
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

  // Cleanup photo preview URL when component unmounts
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

      // Call isolated submission function
      const response = await handlePlayerRegistration(validatedInput, photoPreviewUrl || "");

      if (response.success && response.data) {
        setSubmissionResult(response.data);
      } else {
        setFormError(response.error || "An unexpected validation error occurred.");
      }
    } catch {
      setFormError("Could not process registration. Please check your inputs.");
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

  const handleEditDetails = () => {
    // Return to form with current inputs intact
    setSubmissionResult(null);
  };

  return (
    <div className="w-full max-w-[640px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* If demo submission has completed, show validated feedback card */}
      {submissionResult ? (
        <SubmissionFeedback
          record={submissionResult}
          onReset={handleResetForm}
          onEdit={handleEditDetails}
        />
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <section className="text-center space-y-3">
            {/* Subtle Volleyball Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#0a2e1b] border border-emerald-300 text-xs font-bold uppercase tracking-wider shadow-xs">
              <VolleyballIcon size={16} strokeColor="#0a2e1b" />
              <span>Official Tournament Entry</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-900 tracking-tight">
              Ready to Play?
            </h2>

            <p className="text-sm sm:text-base text-neutral-600 max-w-md mx-auto leading-relaxed">
              Register now and be part of Volleyball Friends Nalthur. Complete your details below.
            </p>
          </section>

          {/* Registration Form Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-md shadow-emerald-950/5 p-5 sm:p-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-6"
            >
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
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
                    onChange={field.onChange}
                    error={errors.photo?.message}
                    onPreviewChange={(url) => setPhotoPreviewUrl(url)}
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
                  <span className="text-neutral-600 text-xs sm:text-sm font-semibold select-none">
                    +91
                  </span>
                }
              />

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[52px] rounded-xl bg-[#0a2e1b] hover:bg-[#072416] active:scale-[0.99] text-white text-sm sm:text-base font-extrabold tracking-wider uppercase transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#0a2e1b] focus:ring-offset-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validating Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Register Player</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Tournament Privacy / Policy note */}
              <p className="text-center text-[11px] text-neutral-400">
                Tournament entry managed by Volleyball Friends Nalthur Organizers.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
