/**
 * Domain constants and helper utilities for the Indian Legal Research Engine.
 */

export const INDIAN_COURTS = [
  "All Courts",
  "Supreme Court of India",
  "Delhi High Court",
  "Bombay High Court",
  "Madras High Court",
  "Calcutta High Court",
  "Karnataka High Court",
] as const;

export const LEGAL_SUBJECT_DOMAINS = [
  "All Subjects",
  "Constitutional Law",
  "Criminal Law (BNS / BNSS / BSA)",
  "Electronic Evidence & Cyber Law",
  "Data Protection (DPDP Act, 2023)",
  "Commercial & Contract Law",
  "Corporate Governance (Companies Act)",
  "Consumer Protection",
] as const;

export const AUTHORIZED_LEGAL_REPOSITORIES = [
  { code: "ALL", label: "All Authorized Sources" },
  { code: "INDIA_CODE", label: "India Code (NIC Central & State Statutes)" },
  { code: "SCI_ESCR", label: "Supreme Court of India (Digital e-SCR)" },
  { code: "HIGH_COURT", label: "High Court Official Repositories" },
  { code: "ECOURTS", label: "eCourts Services" },
] as const;
