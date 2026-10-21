import {
  PlayerRegistrationInput,
  ValidatedPlayerDemoRecord,
  sanitizeIndianPhoneNumber,
} from "./validation";

export interface DemoSubmissionResponse {
  success: boolean;
  message: string;
  data?: ValidatedPlayerDemoRecord;
  error?: string;
}

/**
 * Isolated registration submission handler.
 *
 * NOTE: Currently runs in frontend demo mode.
 * Does NOT persist to database, Cloudinary, or remote API.
 * When backend endpoints are ready, replace the mock delay below with `fetch('/api/register', ...)`.
 */
export async function handlePlayerRegistration(
  formData: PlayerRegistrationInput,
  previewUrl: string
): Promise<DemoSubmissionResponse> {
  // Simulate network roundtrip latency for realistic feedback
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!formData.photo) {
    return {
      success: false,
      message: "Validation failed: Photo is missing.",
      error: "Photo is required",
    };
  }

  const cleanedPhone = sanitizeIndianPhoneNumber(formData.phone);
  const formattedSize = (formData.photo.size / (1024 * 1024)).toFixed(2) + " MB";

  const demoRecord: ValidatedPlayerDemoRecord = {
    name: formData.name.trim(),
    village: formData.village.trim(),
    role: formData.role,
    phone: `+91 ${cleanedPhone.slice(0, 5)} ${cleanedPhone.slice(5)}`,
    photoName: formData.photo.name,
    photoSizeFormatted: formattedSize,
    previewUrl,
    validatedAt: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  return {
    success: true,
    message: "Frontend demo validation successful.",
    data: demoRecord,
  };
}
