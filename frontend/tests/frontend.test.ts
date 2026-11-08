import { describe, it, expect } from "vitest";
import { BRAND } from "../lib/brand";
import {
  SEED_JUDGMENTS,
  SEED_LEGAL_ACTS,
  SEED_LEGAL_SECTIONS,
  SEED_USER_PROFILE
} from "../lib/seed-data";
import { api } from "../lib/api";

describe("AMIL Frontend Brand, Corpus & API Layer Verification", () => {
  it("configures Amil Bhatt as owner and Juris as legal assistant without fabricated credentials", () => {
    expect(BRAND.ownerName).toBe("Amil Bhatt");
    expect(BRAND.ownerFirstName).toBe("Amil");
    expect(BRAND.assistantTitle).toBe("Juris — Legal Intelligence");
    expect(SEED_USER_PROFILE.display_name).toBe("Amil");
  });

  it("separates Current Enacted Legislation (BNS/BNSS/BSA 2023) from Historical Legislation (IPC/CrPC/IEA)", async () => {
    const currentActs = await api.getActs("CURRENT");
    const historicalActs = await api.getActs("HISTORICAL");

    expect(currentActs.some((a) => a.short_title === "BNS 2023")).toBe(true);
    expect(currentActs.some((a) => a.short_title === "BNSS 2023")).toBe(true);
    expect(currentActs.some((a) => a.short_title === "BSA 2023")).toBe(true);
    expect(currentActs.some((a) => a.short_title === "DPDP Act 2023")).toBe(true);

    expect(historicalActs.some((a) => a.short_title === "IPC 1860")).toBe(true);
    expect(historicalActs.some((a) => a.short_title === "CrPC 1973")).toBe(true);
    expect(historicalActs.some((a) => a.short_title === "IEA 1872")).toBe(true);
  });

  it("provides side-by-side historical comparison mapping for BNS, BNSS, and BSA sections", () => {
    const bns318 = SEED_LEGAL_SECTIONS.find((s) => s.id === "sec-bns-318");
    expect(bns318).toBeDefined();
    expect(bns318?.historical_comparison?.legacy_act).toContain("Indian Penal Code");
    expect(bns318?.historical_comparison?.key_changes.length).toBeGreaterThan(0);
  });

  it("enforces precedent status badges and flags overruled decisions in Case Laws", async () => {
    const binding = await api.getJudgments({ precedent_status: "BINDING" });
    const overruled = await api.getJudgments({ precedent_status: "OVERRULED" });

    expect(binding.length).toBeGreaterThanOrEqual(4);
    expect(overruled.some((j) => j.case_title.includes("Shafhi Mohammad"))).toBe(true);
  });

  it("returns 7-part structured legal answers with verified citations from Ask Juris", async () => {
    const { assistantMessage } = await api.sendJurisMessage({
      message: "What is the requirement for electronic evidence under Section 63 BSA 2023?",
      response_mode: "detailed"
    });

    expect(assistantMessage.structured_sections).toBeDefined();
    const s = assistantMessage.structured_sections!;
    expect(s.direct_answer.length).toBeGreaterThan(20);
    expect(s.applicable_provisions.length).toBeGreaterThan(0);
    expect(s.relevant_judgments.length).toBeGreaterThan(0);
    expect(s.legal_reasoning.length).toBeGreaterThan(20);
    expect(s.source_references.every((ref) => ref.is_verified)).toBe(true);
    expect(s.important_limitations.length).toBeGreaterThan(10);
    expect(s.verification_date).toContain("Verified");
  });

  it("generates Dashboard summary greeting 'Welcome back, Amil.'", async () => {
    const summary = await api.getDashboardSummary();
    expect(summary.greeting).toBe("Welcome back, Amil.");
    expect(summary.counts.total_acts_indexed).toBe(SEED_LEGAL_ACTS.length);
    expect(summary.counts.total_judgments_indexed).toBe(SEED_JUDGMENTS.length);
  });
});
