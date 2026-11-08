# AMIL — Indian Legal Intelligence Platform (`Juris — Legal Intelligence`)

- **Product Owner:** Amil Bhatt
- **Working Brand:** `AMIL` (Configurable via `NEXT_PUBLIC_APP_NAME` & `APP_BRAND_NAME`)
- **AI Assistant:** `Juris — Legal Intelligence`
- **Primary Jurisdiction:** India
- **Core Product Principle:** *Every important legal answer must be traceable to a reliable legal source.*

---

## Architecture Overview

`amil-legal` is a full-stack Indian LegalTech SaaS monorepo featuring:
1. **`frontend/`**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui design primitives, Lucide icons, React Hook Form + Zod, and TanStack Query, styled in the **Midnight Navy + Gold** (`#0B1220` / `#111C2E` / `#162237` / `#D6B66D`) aesthetic.
2. **`backend/`**: Python FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL + `pgvector`, Argon2id authentication with rotating JWT refresh tokens, Google Gemini RAG pipeline with strict citation validation, and document intelligence (`PyMuPDF`, `python-docx`, `Tesseract OCR`).
3. **`docs/`**: Complete architectural, database ER, OpenAPI, security/DPDP, and Vercel/Railway deployment documentation.

---

## Core Modules
- **Dashboard (`/dashboard`)**: Personalized greeting (`"Welcome back, Amil."`), Juris quick search, real-time database statistics, recent research, saved judgments, statutory provisions, documents, drafts, and reminders.
- **Ask Juris (`/juris`)**: Conversational Indian legal AI enforcing the 7-part structured legal answer format with citation verification cards, response length modes (`Short`, `Standard`, `Detailed`, `Research Mode`), conversation export, and save-to-library.
- **Legal Research Engine (`/research`)**: Unified hybrid search across Indian legislation, statutory sections, and judgments with court, date, subject, and repository filters.
- **Bare Acts Library (`/bare-acts`)**: Structured statutory browser covering current statutes (*Bharatiya Nyaya Sanhita 2023*, *Bharatiya Nagarik Suraksha Sanhita 2023*, *Bharatiya Sakshya Adhiniyam 2023*, *Constitution of India*, *IT Act 2000*, *Consumer Protection Act 2019*, *Indian Contract Act 1872*, *Companies Act 2013*, *DPDP Act 2023*) and historical legislation (*IPC 1860*, *CrPC 1973*, *Indian Evidence Act 1872*) with effective dates and section-by-section comparison.
- **Case Law Research (`/case-laws`)**: Judgment search with explicit precedent status indicators (`BINDING`, `PERSUASIVE`, `DISTINGUISHED`, `OVERRULED`, `PENDING_VERIFICATION`), ratio decidendi, paragraph extraction, and private notes.
- **Document Analyzer (`/documents`)**: Secure upload (`PDF`, `DOCX`, `TXT`), OCR fallback, explicit DPDP AI consent controls, clause/obligation/deadline/risk extraction, page-cited Document Q&A, and side-by-side Document Comparison.
- **Drafting Studio (`/drafting`)**: Fact-driven legal drafting workspace for Legal Notices, Applications, Complaints, Representations, Agreements, Affidavits, Memoranda, and Correspondence with `.docx` and `.pdf` export.
- **My Legal Library (`/library`)**: Personal legal repository for saved Acts, sections, judgments, AI answers, documents, bookmarks, notes, custom folders, and tags.
- **Research History (`/history`)**: Audit trail of search queries and legal consultations.
- **Tasks & Reminders (`/tasks`)**: Legal productivity tracker with priorities, deadlines, completion workflow, and monthly calendar view.

---

## Quick Start

### 1. Backend (`backend/`)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (`frontend/`)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 3. Running Tests
```bash
# Backend Pytest Suite
cd backend && pytest -v

# Frontend Vitest & Playwright Suites
cd frontend && npm run test && npx playwright test
```
