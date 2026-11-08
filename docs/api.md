# AMIL Legal Intelligence Platform — OpenAPI & REST Endpoint Specification

Base URL: `/api/v1`  
Authentication: `Authorization: Bearer <access_token>` (JWT HS256/RS256 short-lived token; refresh token rotation via `/api/v1/auth/refresh`).

---

## 1. System & Health Endpoints

| Method | Path | Auth | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Root container & Railway liveness probe | `200 OK` |
| `GET` | `/api/v1/health` | Public | Detailed service, DB connectivity, and AI provider readiness check | `200 OK`, `503` |
| `GET` | `/api/v1/dashboard/summary` | Bearer | Aggregated live database counts and recent items for Dashboard (`Welcome back, Amil.`) | `200 OK`, `401` |

---

## 2. Authentication (`/api/v1/auth`)

| Method | Path | Auth | Request Body | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | `{ email, password, display_name }` | `AuthTokenResponse` (`access_token`, `refresh_token`, `user`) | `201 Created`, `400`, `409` |
| `POST` | `/api/v1/auth/login` | Public | `{ email, password }` | `AuthTokenResponse` | `200 OK`, `401`, `429` |
| `POST` | `/api/v1/auth/refresh` | Public | `{ refresh_token }` | `AuthTokenResponse` (rotated refresh token) | `200 OK`, `401` |
| `POST` | `/api/v1/auth/logout` | Bearer | `{}` | `{ detail: "Logged out and token revoked" }` | `200 OK`, `401` |
| `GET` | `/api/v1/auth/me` | Bearer | — | `UserWithProfileResponse` | `200 OK`, `401` |

---

## 3. Personalization & Profile (`/api/v1/profile`)

| Method | Path | Auth | Request Body | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/profile` | Bearer | — | `ProfileResponse` (`display_name`, `preferred_theme`, `ai_response_style`, `saved_legal_topics`, `ai_document_consent`, etc.) | `200 OK` |
| `PATCH` | `/api/v1/profile` | Bearer | `ProfileUpdateRequest` (partial fields) | `ProfileResponse` | `200 OK`, `422` |
| `DELETE` | `/api/v1/profile/data` | Bearer | `{ confirm_deletion: true }` | `{ detail: "All personal data and documents purged per DPDP rights" }` | `200 OK` |

---

## 4. Juris AI Assistant (`/api/v1/chat` & `/api/v1/conversations`)

| Method | Path | Auth | Request / Query Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/chat` | Bearer | `{ message, conversation_id?, response_mode: "short"\|"standard"\|"detailed"\|"research", document_ids?: [] }` | `ChatCompletionResponse` (with 7-part `structured_sections`, validated `cited_sources`, `confidence_score`, `verification_date`) | `200 OK`, `401`, `422` |
| `GET` | `/api/v1/conversations` | Bearer | `?q=&limit=50&offset=0` | `list[ConversationSummary]` | `200 OK` |
| `GET` | `/api/v1/conversations/{id}` | Bearer | — | `ConversationDetailResponse` (includes ordered `messages`) | `200 OK`, `404` |
| `PATCH` | `/api/v1/conversations/{id}` | Bearer | `{ title?, is_pinned?, response_mode? }` | `ConversationSummary` | `200 OK`, `404` |
| `DELETE` | `/api/v1/conversations/{id}` | Bearer | — | `204 No Content` | `204`, `404` |
| `GET` | `/api/v1/conversations/{id}/export` | Bearer | `?format=markdown\|json` | Export payload with citations and verification notice | `200 OK`, `404` |

---

## 5. Legal Research Engine (`/api/v1/research`)

| Method | Path | Auth | Query Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/research/search` | Bearer | `?q=&type=all\|act\|section\|judgment&court=&subject=&date_from=&date_to=&status=` | `UnifiedSearchResponse` (ranked statutory sections, acts, judgments, source metadata) | `200 OK` |
| `GET` | `/api/v1/research/sources` | Bearer | — | `list[LegalSourceResponse]` (India Code, SCI eSCR, High Courts, eCourts) | `200 OK` |
| `GET` | `/api/v1/research/sources/{id}` | Bearer | — | `LegalSourceDetailResponse` | `200 OK`, `404` |
| `GET` | `/api/v1/research/history` | Bearer | `?limit=50` | `list[AuditHistoryEntry]` | `200 OK` |

---

## 6. Bare Acts Library (`/api/v1/acts`)

| Method | Path | Auth | Query Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/acts` | Bearer | `?q=&status=CURRENT\|HISTORICAL&subject=` | `list[LegalActResponse]` | `200 OK` |
| `GET` | `/api/v1/acts/{id}` | Bearer | — | `LegalActDetailResponse` (metadata, dates, amendment history, chapters) | `200 OK`, `404` |
| `GET` | `/api/v1/acts/{id}/sections` | Bearer | `?q=&chapter=` | `list[LegalSectionResponse]` (with `corresponding_historical_section` & version comparison info) | `200 OK`, `404` |

---

## 7. Case Law Research (`/api/v1/judgments`)

| Method | Path | Auth | Query Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/judgments` | Bearer | `?q=&court=&judge=&precedent_status=&issue=&date_from=&date_to=` | `list[JudgmentSummaryResponse]` | `200 OK` |
| `GET` | `/api/v1/judgments/{id}` | Bearer | — | `JudgmentDetailResponse` (includes `ratio_decidendi`, `key_paragraphs`, `citations`, `precedent_status`, `verification_notes`) | `200 OK`, `404` |

---

## 8. Document Intelligence (`/api/v1/documents`)

| Method | Path | Auth | Request / Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/documents/upload` | Bearer | `multipart/form-data` (`file`, `title?`, `ai_consent_granted: bool`) | `DocumentResponse` | `201 Created`, `400`, `413`, `415` |
| `GET` | `/api/v1/documents` | Bearer | — | `list[DocumentResponse]` | `200 OK` |
| `GET` | `/api/v1/documents/{id}` | Bearer | — | `DocumentDetailResponse` (includes extracted chunks & analysis report) | `200 OK`, `404` |
| `POST` | `/api/v1/documents/{id}/analyze` | Bearer | `{ question?: string, ai_consent_granted?: bool }` | `DocumentAnalysisResponse` (summary, entities, clauses, obligations, deadlines, risks, and optional page-cited Q&A answer) | `200 OK`, `403`, `404` |
| `POST` | `/api/v1/documents/compare` | Bearer | `{ document_a_id, document_b_id }` | `DocumentComparisonResponse` (structural diff, added/removed clauses, obligation deltas) | `200 OK`, `404` |
| `DELETE` | `/api/v1/documents/{id}` | Bearer | — | `204 No Content` (deletes DB records + private storage object) | `204`, `404` |

---

## 9. My Legal Library (`/api/v1/library`)

| Method | Path | Auth | Request / Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/library` | Bearer | `?folder_id=&item_type=&tag=&q=&sort=recent\|title` | `LibraryOverviewResponse` (bookmarks, notes, folders, saved answers, counts) | `200 OK` |
| `POST` | `/api/v1/library/bookmarks` | Bearer | `{ item_type, target_id?, title, excerpt, folder_id?, tags: [] }` | `BookmarkResponse` | `201 Created` |
| `DELETE` | `/api/v1/library/bookmarks/{id}` | Bearer | — | `204 No Content` | `204`, `404` |
| `POST` | `/api/v1/library/notes` | Bearer | `{ title, content, folder_id?, linked_entity_type?, linked_entity_id?, tags: [], is_pinned?: bool }` | `NoteResponse` | `201 Created` |
| `PATCH` | `/api/v1/library/notes/{id}` | Bearer | `NoteUpdateRequest` | `NoteResponse` | `200 OK`, `404` |
| `DELETE` | `/api/v1/library/notes/{id}` | Bearer | — | `204 No Content` | `204`, `404` |
| `GET` | `/api/v1/library/folders` | Bearer | — | `list[FolderResponse]` | `200 OK` |
| `POST` | `/api/v1/library/folders` | Bearer | `{ name, color_hex?, description?, parent_id? }` | `FolderResponse` | `201 Created` |

---

## 10. Drafting Studio (`/api/v1/drafts`)

| Method | Path | Auth | Request Body | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/drafts` | Bearer | `{ title, draft_type, user_facts: {}, cited_references?: [], generate_with_ai?: bool }` | `DraftResponse` (with `[DRAFT — FOR LEGAL REVIEW ONLY]` banner & version 1) | `201 Created` |
| `GET` | `/api/v1/drafts` | Bearer | `?draft_type=` | `list[DraftResponse]` | `200 OK` |
| `GET` | `/api/v1/drafts/{id}` | Bearer | — | `DraftResponse` | `200 OK`, `404` |
| `PATCH` | `/api/v1/drafts/{id}` | Bearer | `{ title?, content_markdown?, user_facts?, cited_references?, status? }` | `DraftResponse` (increments `version` and appends to `version_history`) | `200 OK`, `404` |
| `DELETE` | `/api/v1/drafts/{id}` | Bearer | — | `204 No Content` | `204`, `404` |
| `POST` | `/api/v1/drafts/{id}/export` | Bearer | `{ format: "docx" \| "pdf" \| "markdown" }` | Binary stream (`.docx` / `.pdf`) or structured export payload | `200 OK`, `404` |

---

## 11. Productivity — Tasks & Reminders (`/api/v1/tasks`)

| Method | Path | Auth | Request / Params | Response Schema | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tasks` | Bearer | `?status=&priority=&month=` | `list[TaskResponse]` | `200 OK` |
| `POST` | `/api/v1/tasks` | Bearer | `{ title, description?, task_type, priority, due_at?, reminder_at?, linked_entity_type?, linked_entity_id? }` | `TaskResponse` | `201 Created` |
| `PATCH` | `/api/v1/tasks/{id}` | Bearer | `TaskUpdateRequest` | `TaskResponse` | `200 OK`, `404` |
| `DELETE` | `/api/v1/tasks/{id}` | Bearer | — | `204 No Content` | `204`, `404` |
