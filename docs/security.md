# AMIL Legal Intelligence Platform — Security & Privacy Architecture

## 1. Authentication & Credential Security
- **Password Hashing:** `Argon2id` (`argon2-cffi` / `passlib[argon2]`) with memory-hard parameters resistant to GPU/ASIC cracking, plus PBKDF2-SHA256 fallback in restricted runtimes.
- **Token Architecture:**
  - **Access Token:** Short-lived JWT (`15 minutes` default TTL) signed with `HS256` using a high-entropy `JWT_SECRET`, carrying `sub` (User UUID), `role`, `jti`, and `exp`.
  - **Refresh Token:** Long-lived token (`7 days` TTL) with cryptographic hash stored in `users.refresh_token_hash`. Every call to `POST /api/v1/auth/refresh` rotates the refresh token and invalidates the prior token hash.
  - **Revocation:** `POST /api/v1/auth/logout` clears `refresh_token_hash` and logs an `AUTH_LOGOUT` audit event.

## 2. Authorization & Multi-Tenant User Isolation
- Every query against user-owned tables (`profiles`, `conversations`, `messages`, `documents`, `document_chunks`, `notes`, `bookmarks`, `folders`, `drafts`, `tasks`, `audit_logs`, `ai_usage`) is scoped by `WHERE user_id = :current_user_id`.
- Attempting to access or mutate another user's resource returns `404 Not Found` (preventing resource existence leakage) and records an entry in `audit_logs`.

## 3. File Upload Validation & Private Object Storage
- **Strict Format & Size Enforcement:**
  - Allowed extensions & MIME types: `.pdf` (`application/pdf`), `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), `.txt` (`text/plain`).
  - Magic-byte signature inspection (`%PDF-` for PDF, `PK\x03\x04` for DOCX, valid UTF-8 for TXT) rejects spoofed executables.
  - Maximum upload size: `25 MB` per document (`413 Payload Too Large` on violation).
  - Password-protected or corrupted PDFs/DOCX files return clear, actionable `400 Bad Request` messages without stack-trace leakage.
- **Private Storage Isolation:**
  - Uploaded file bytes are never stored in PostgreSQL rows or public static directories.
  - Files are stored in S3-compatible private object storage (or encrypted-path local private vault outside web root in development) keyed by `users/{user_id}/{uuid}_{sha256}`.

## 4. Indian Digital Personal Data Protection Act, 2023 (DPDP Act) Alignment
1. **Explicit Informed Consent for External AI Processing:**
   - Uploading a document or analyzing it with external LLM APIs requires `ai_consent_granted = true` (stored per document and in `profiles.ai_document_consent`).
   - Users can analyze documents using deterministic local extraction/comparison even when external AI consent is disabled.
   - Private legal documents are never used to train foundation models.
2. **Right to Erasure & Data Portability:**
   - `DELETE /api/v1/documents/{id}` purges both database chunks/embeddings and underlying storage objects.
   - `DELETE /api/v1/profile/data` executes a complete user data purge across all personal tables and storage objects.
3. **Confidentiality in Telemetry & Logs:**
   - Application logs redact raw document contents, JWT tokens, passwords, and API keys.
   - `audit_logs` records metadata (actor UUID, action code, resource type/ID, IP, timestamp) without logging confidential client text.

## 5. HTTP & API Hardening
- **Rate Limiting:** Sliding-window rate limiter on authentication (`/api/v1/auth/*`), AI chat (`/api/v1/chat`), and upload endpoints (`429 Too Many Requests`).
- **CORS:** Restricted to configured `FRONTEND_URL` origins with explicit methods and headers.
- **Security Headers Middleware:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (in production)
