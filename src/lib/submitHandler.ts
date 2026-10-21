import { PlayerRegistrationInput } from "./validation";

export interface RegisteredPlayerData {
  id: string;
  serialNumber: number;
  formattedSerial: string;
  name: string;
  village: string;
  role: string;
  phone: string;
  photoUrl: string;
  posterStatus: string;
  registeredAt: string;
}

export interface RegistrationSubmissionResponse {
  success: boolean;
  message: string;
  data?: RegisteredPlayerData;
  error?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Submits player registration to the real FastAPI backend.
 * Uses multipart/form-data for image and player fields.
 */
export async function handlePlayerRegistration(
  formData: PlayerRegistrationInput
): Promise<RegistrationSubmissionResponse> {
  if (!formData.photo) {
    return {
      success: false,
      message: "Validation failed: Player photo is required.",
      error: "Player photo is required.",
    };
  }

  const body = new FormData();
  body.append("player_name", formData.name.trim());
  body.append("village", formData.village.trim());
  body.append("playing_role", formData.role);
  body.append("phone_number", formData.phone.trim());
  body.append("photo", formData.photo);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/players/register`, {
      method: "POST",
      body,
    });

    if (!res.ok) {
      let errorMsg = "Registration failed. Please check inputs and try again.";
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMsg = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMsg = errorData.detail.map((d: { msg?: string }) => d.msg || "").join(", ");
          }
        }
      } catch {
        // Fallback to HTTP status text
        errorMsg = `Server error (${res.status}: ${res.statusText})`;
      }
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }

    const data = await res.json();
    const photoUrl = data.photo_url.startsWith("http")
      ? data.photo_url
      : `${API_BASE_URL}${data.photo_url}`;

    const registeredPlayer: RegisteredPlayerData = {
      id: data.id,
      serialNumber: data.serial_number,
      formattedSerial: data.formatted_serial || `${data.serial_number < 10 ? "0" : ""}${data.serial_number}`,
      name: data.player_name,
      village: data.village,
      role: data.playing_role,
      phone: `+91 ${data.phone_number.slice(0, 5)} ${data.phone_number.slice(5)}`,
      photoUrl,
      posterStatus: data.poster_status || "pending",
      registeredAt: new Date(data.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    return {
      success: true,
      message: `Player #${registeredPlayer.formattedSerial} registered successfully!`,
      data: registeredPlayer,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not connect to registration server. Please verify backend is running.";
    return {
      success: false,
      message,
      error: message,
    };
  }
}
