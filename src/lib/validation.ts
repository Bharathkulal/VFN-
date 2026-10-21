import { z } from "zod";

export const PLAYING_ROLES = [
  "Setter",
  "Spiker",
  "Middle Blocker",
  "Libero",
  "All-rounder",
  "Other",
] as const;

export type PlayingRole = (typeof PLAYING_ROLES)[number];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Helper to normalize and validate Indian mobile phone numbers
export function sanitizeIndianPhoneNumber(phone: string): string {
  // Strip spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Remove leading +91 or 91 if length is 12
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

export function isValidIndianPhoneNumber(phone: string): boolean {
  const cleaned = sanitizeIndianPhoneNumber(phone);
  // Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(cleaned);
}

// Client-side Zod Schema
export const playerRegistrationSchema = z.object({
  photo: z
    .any()
    .refine((file): file is File => typeof window !== "undefined" && file instanceof File, {
      message: "Player photo is required",
    })
    .refine(
      (file) => file && ACCEPTED_IMAGE_TYPES.includes(file.type),
      {
        message: "Photo must be JPEG, PNG, or WebP format",
      }
    )
    .refine(
      (file) => file && file.size <= MAX_FILE_SIZE_BYTES,
      {
        message: "Photo file size must not exceed 5 MB",
      }
    ),
  name: z
    .string()
    .trim()
    .min(1, { message: "Player name is required" })
    .min(2, { message: "Player name must be at least 2 characters" })
    .max(60, { message: "Player name cannot exceed 60 characters" }),
  village: z
    .string()
    .trim()
    .min(1, { message: "Village name is required" })
    .min(2, { message: "Village name must be at least 2 characters" })
    .max(60, { message: "Village name cannot exceed 60 characters" }),
  role: z.enum(PLAYING_ROLES, {
    message: "Please select a valid playing role",
  }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "Mobile number is required" })
    .refine((val) => isValidIndianPhoneNumber(val), {
      message:
        "Enter a valid 10-digit Indian mobile number (e.g., 9876543210)",
    }),
});

export interface PlayerRegistrationFormValues {
  photo: File | null;
  name: string;
  village: string;
  role?: PlayingRole;
  phone: string;
}

export type PlayerRegistrationInput = z.infer<typeof playerRegistrationSchema>;

export interface ValidatedPlayerDemoRecord {
  name: string;
  village: string;
  role: PlayingRole;
  phone: string;
  photoName: string;
  photoSizeFormatted: string;
  previewUrl: string;
  validatedAt: string;
}
