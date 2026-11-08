/**
 * Brand & Owner Configuration
 * Centralizes brand identity so NEXT_PUBLIC_APP_NAME can rename the platform
 * without touching business logic or UI components.
 */

export const BRAND = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "AMIL",
  fullTitle: `${process.env.NEXT_PUBLIC_APP_NAME || "AMIL"} — Legal Intelligence Platform`,
  assistantName: "Juris",
  assistantTitle: "Juris — Legal Intelligence",
  ownerName: "Amil Bhatt",
  ownerFirstName: "Amil",
  ownerEmail: "amil@amillegal.in",
  jurisdiction: "Republic of India",
  corePrinciple: "Every important legal answer must be traceable to a reliable legal source.",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "https://amil-api-production.up.railway.app"
} as const;
