export type ResponseMode = "short" | "standard" | "detailed" | "research";

export type PrecedentStatus =
  | "BINDING"
  | "PERSUASIVE"
  | "DISTINGUISHED"
  | "OVERRULED"
  | "REVERSED"
  | "STAYED"
  | "PENDING_VERIFICATION";

export type LegislationStatus = "CURRENT" | "HISTORICAL";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskType = "RESEARCH" | "FILING_DEADLINE" | "CASE_REMINDER" | "DRAFT_REVIEW";

export type DraftType =
  | "Legal Notice"
  | "Application"
  | "Complaint"
  | "Representation"
  | "Agreement"
  | "Affidavit Draft"
  | "Legal Research Memorandum"
  | "General Legal Correspondence";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: "owner" | "user" | "admin";
  display_name: string;
  avatar_url?: string | null;
  preferred_theme: "dark" | "light";
  preferred_language: string;
  ai_response_style: ResponseMode;
  saved_legal_topics: string[];
  ai_document_consent: boolean;
  research_preferences: {
    default_jurisdiction: string;
    include_historical_comparison: boolean;
    citation_format: string;
  };
  workspace_settings: {
    compact_density?: boolean;
    auto_save_drafts?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserProfile;
}

export interface CitedSource {
  id: string;
  source_type: "STATUTE" | "JUDGMENT" | "DOCUMENT" | "REPOSITORY";
  title: string;
  citation: string;
  repository: string;
  section_or_para?: string;
  effective_date?: string;
  precedent_status?: PrecedentStatus;
  excerpt: string;
  official_url: string;
  is_verified: boolean;
}

export interface StructuredLegalAnswer {
  direct_answer: string;
  applicable_provisions: {
    act_title: string;
    section: string;
    status: LegislationStatus;
    corresponding_historical?: string;
    summary: string;
  }[];
  relevant_judgments: {
    case_title: string;
    neutral_citation: string;
    court: string;
    decision_date: string;
    precedent_status: PrecedentStatus;
    holding: string;
  }[];
  legal_reasoning: string;
  source_references: CitedSource[];
  important_limitations: string;
  verification_date: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  response_mode?: ResponseMode;
  structured_sections?: StructuredLegalAnswer | null;
  cited_sources?: CitedSource[];
  confidence_score?: number;
  coverage_status?: "VERIFIED" | "PARTIAL_COVERAGE" | "ABSTAINED";
  follow_up_suggestions?: string[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  response_mode: ResponseMode;
  is_pinned: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface LegalSource {
  id: string;
  code: string;
  name: string;
  source_type: "STATUTORY" | "JUDICIAL" | "ECOURTS";
  jurisdiction: string;
  official_url: string;
  is_verified_repository: boolean;
  last_synced_at: string;
}

export interface LegalSection {
  id: string;
  act_id: string;
  act_short_title: string;
  part_number?: string;
  chapter_number: string;
  chapter_title: string;
  section_number: string;
  section_title: string;
  statutory_text: string;
  amendment_notes?: string;
  effective_date: string;
  corresponding_historical_section?: string | null;
  historical_comparison?: {
    legacy_act: string;
    legacy_section: string;
    legacy_title: string;
    legacy_text: string;
    key_changes: string[];
  } | null;
}

export interface LegalAct {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  short_title: string;
  act_number: string;
  enactment_year: number;
  enactment_date: string;
  commencement_date: string;
  effective_date: string;
  status: LegislationStatus;
  replaces_act_code?: string | null;
  replaced_by_act_code?: string | null;
  subject_category: string;
  preamble: string;
  amendment_history: { year: number; note: string }[];
  sections_count: number;
  official_url: string;
}

export interface Judgment {
  id: string;
  source_id: string;
  source_name: string;
  case_title: string;
  neutral_citation: string;
  equivalent_citations: string[];
  court: string;
  bench_type: string;
  judges: string[];
  decision_date: string;
  subject_matter: string;
  legal_issues: string[];
  headnote_summary: string;
  ratio_decidendi: string;
  key_paragraphs: { para_no: string; text: string }[];
  precedent_status: PrecedentStatus;
  verification_notes: string;
  official_source_url: string;
  cited_authorities: {
    citation_text: string;
    treatment_type: "FOLLOWED" | "DISTINGUISHED" | "OVERRULED" | "REFERRED";
    context_excerpt: string;
  }[];
}

export interface DocumentAnalysisResult {
  executive_summary: string;
  parties_and_dates: { label: string; value: string; page: number }[];
  key_clauses: { clause_ref: string; title: string; summary: string; page: number }[];
  obligations: { party: string; obligation: string; clause_ref: string; page: number }[];
  deadlines_and_notice: { event: string; timeline: string; clause_ref: string; page: number }[];
  risk_flags: {
    severity: "HIGH" | "MEDIUM" | "LOW";
    issue: string;
    recommendation: string;
    clause_ref: string;
    page: number;
  }[];
  qa_history?: {
    question: string;
    answer: string;
    citations: { page: number; section_heading: string; excerpt: string }[];
    asked_at: string;
  }[];
}

export interface LegalDocument {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  page_count: number;
  ocr_applied: boolean;
  ai_consent_granted: boolean;
  processing_status: "READY" | "PROCESSING" | "FAILED";
  extracted_text_preview: string;
  analysis_result: DocumentAnalysisResult;
  created_at: string;
}

export interface DocumentComparisonResult {
  document_a_title: string;
  document_b_title: string;
  summary_of_differences: string;
  structural_deltas: {
    clause_topic: string;
    doc_a_position: string;
    doc_b_position: string;
    change_type: "MODIFIED" | "ADDED_IN_B" | "REMOVED_IN_B" | "IDENTICAL";
    legal_impact: string;
  }[];
}

export interface DraftVersion {
  version: number;
  updated_at: string;
  summary_note: string;
  content_markdown: string;
}

export interface LegalDraft {
  id: string;
  title: string;
  draft_type: DraftType;
  user_facts: {
    client_or_sender_name: string;
    recipient_or_opposite_party: string;
    jurisdiction_or_forum: string;
    chronology_of_facts: string;
    relief_or_remedy_sought: string;
    notice_period_or_deadline?: string;
  };
  content_markdown: string;
  cited_references: {
    id: string;
    citation: string;
    title: string;
    type: "STATUTE" | "JUDGMENT";
  }[];
  version: number;
  version_history: DraftVersion[];
  status: "DRAFT" | "UNDER_REVIEW" | "FINALIZED";
  created_at: string;
  updated_at: string;
}

export interface LibraryFolder {
  id: string;
  name: string;
  color_hex: string;
  description: string;
  item_count: number;
  created_at: string;
}

export interface LibraryBookmark {
  id: string;
  folder_id?: string | null;
  item_type: "ACT" | "SECTION" | "JUDGMENT" | "AI_ANSWER" | "DOCUMENT";
  target_id?: string;
  title: string;
  citation?: string;
  excerpt: string;
  tags: string[];
  created_at: string;
}

export interface LibraryNote {
  id: string;
  folder_id?: string | null;
  title: string;
  content: string;
  linked_entity_type?: "ACT" | "SECTION" | "JUDGMENT" | "DOCUMENT" | "GENERAL";
  linked_entity_id?: string;
  linked_entity_label?: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditHistoryEntry {
  id: string;
  action: "SEARCH_QUERY" | "JURIS_CONSULTATION" | "VIEW_STATUTE" | "VIEW_JUDGMENT" | "ANALYZE_DOCUMENT" | "GENERATE_DRAFT";
  title: string;
  query_or_reference: string;
  module_path: string;
  metadata_label: string;
  created_at: string;
}

export interface LegalTask {
  id: string;
  title: string;
  description: string;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string;
  reminder_at?: string | null;
  linked_entity_type?: string | null;
  linked_entity_label?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface DashboardSummary {
  greeting: string;
  owner_display_name: string;
  counts: {
    conversations: number;
    saved_judgments: number;
    saved_provisions: number;
    uploaded_documents: number;
    active_drafts: number;
    pending_tasks: number;
    total_acts_indexed: number;
    total_judgments_indexed: number;
  };
  recent_conversations: Conversation[];
  recent_research: AuditHistoryEntry[];
  saved_judgments: LibraryBookmark[];
  saved_provisions: LibraryBookmark[];
  recent_documents: LegalDocument[];
  recent_drafts: LegalDraft[];
  upcoming_tasks: LegalTask[];
}

export interface BharatCourtAttribution {
  provider: string;
  dataset: string;
  license: string;
  license_url: string;
  sources: string[];
  freshness_policy: string;
  retrieval_date?: string;
  source_type?: string;
}

export interface BharatCourtJudgment {
  case_id: string;
  title: string;
  court: string;
  citation: string;
  decision_date: string | null;
  judges: string[];
  case_number: string;
  cnr: string;
  disposal_nature: string;
  source_type: "archive" | "live" | string;
  document_url: string | null;
  available: boolean;
  authority_status: PrecedentStatus;
  authority_notes?: string | null;
  bench_type?: string | null;
  petitioner?: string | null;
  respondent?: string | null;
  attribution?: BharatCourtAttribution;
}

export interface BharatCourtsSearchResponse {
  success: boolean;
  source: string;
  total: number;
  page: number;
  limit: number;
  results: BharatCourtJudgment[];
  warning?: string | null;
  error?: string | null;
}

