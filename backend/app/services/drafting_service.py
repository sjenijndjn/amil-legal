"""Indian Legal Drafting Studio service and DOCX / PDF / Markdown exporters."""

from __future__ import annotations

import io
import zipfile
from datetime import date
from typing import Any, Dict, List
from xml.sax.saxutils import escape as xml_escape

try:
    import docx as python_docx
except Exception:  # pragma: no cover
    python_docx = None  # type: ignore

try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover
    fitz = None  # type: ignore


DRAFT_DISCLAIMER_BANNER = (
    "[DRAFT — FOR LEGAL REVIEW ONLY | PREPARED VIA AMIL DRAFTING STUDIO | "
    "DOES NOT CONSTITUTE FORMAL LEGAL REPRESENTATION]"
)


def _fact_or_placeholder(facts: Dict[str, Any], key: str, label: str) -> str:
    val = facts.get(key)
    if val is not None and str(val).strip():
        return str(val).strip()
    return f"[TO BE INSERTED BY COUNSEL: {label}]"


def generate_indian_legal_draft_markdown(
    *,
    title: str,
    draft_type: str,
    user_facts: Dict[str, Any],
    cited_references: List[str],
) -> str:
    """Generate a structured Indian legal instrument strictly from user-supplied facts without inventing parties."""
    today_str = _fact_or_placeholder(user_facts, "date", f"Date (e.g., {date.today().isoformat()})")
    sender = _fact_or_placeholder(user_facts, "sender_name", "Full Name & Address of Sender / Applicant / First Party")
    recipient = _fact_or_placeholder(user_facts, "recipient_name", "Full Name & Address of Addressee / Respondent / Second Party")
    forum = _fact_or_placeholder(user_facts, "forum_or_court", "Competent Court / Authority / Jurisdiction")
    subject = _fact_or_placeholder(user_facts, "subject", title)
    facts_narrative = _fact_or_placeholder(
        user_facts,
        "facts_summary",
        "Chronological statement of material facts provided by client",
    )
    relief_or_demand = _fact_or_placeholder(
        user_facts,
        "relief_sought",
        "Specific demand, relief, or prayer sought",
    )
    notice_period = _fact_or_placeholder(user_facts, "notice_period_days", "15 (Fifteen) days")
    governing_law = _fact_or_placeholder(user_facts, "governing_law", "Laws of India")

    refs_block = (
        "\n".join(f"- {ref}" for ref in cited_references)
        if cited_references
        else "- [Insert verified statutory provisions / precedents as applicable]"
    )

    if draft_type == "LEGAL_NOTICE":
        body = f"""# {DRAFT_DISCLAIMER_BANNER}

## REGISTERED A.D. / SPEED POST / EMAIL
**WITHOUT PREJUDICE**

**Date:** {today_str}

**To,**  
{recipient}

**From / Under Instructions Of:**  
{sender}

### SUBJECT: LEGAL NOTICE — {subject.upper()}

Sir / Madam,

Under instructions from and on behalf of my client, **{sender}**, I hereby serve upon you the following Legal Notice under applicable provisions of Indian law:

1. **Statement of Material Facts:**  
   {facts_narrative}

2. **Statutory & Contractual Basis:**  
{refs_block}

3. **Demand & Requisition:**  
   You are hereby called upon to comply with the following demand: **{relief_or_demand}** within **{notice_period}** from the receipt of this Legal Notice, failing which my client shall be constrained to initiate appropriate civil and/or criminal proceedings before **{forum}** entirely at your risk as to costs and consequences.

**Place:** {_fact_or_placeholder(user_facts, "place", "Place of Issuance")}  
**Signature Block:** `[SIGNATURE OF ADVOCATE / AUTHORISED SIGNATORY TO BE AFFIXED]`
"""

    elif draft_type in ("APPLICATION", "COMPLAINT"):
        body = f"""# {DRAFT_DISCLAIMER_BANNER}

## IN THE COURT OF / BEFORE: {forum.upper()}

**IN THE MATTER OF:**  
**{sender}** ... *Applicant / Complainant*  
**VERSUS**  
**{recipient}** ... *Respondent / Opposite Party*

### {draft_type}: {title.upper()}

**MOST RESPECTFULLY SHOWETH:**

1. **Particulars of the Parties & Jurisdiction:**  
   The Applicant/Complainant is **{sender}** and the Respondent/Opposite Party is **{recipient}**, falling within the territorial and pecuniary jurisdiction of **{forum}**.

2. **Brief Facts of the Case:**  
   {facts_narrative}

3. **Grounds & Applicable Legal Provisions:**  
{refs_block}

4. **Prayer / Relief Sought:**  
   It is, therefore, most respectfully prayed that this Hon'ble Forum may graciously be pleased to:  
   - {relief_or_demand}
   - Pass such other and further order(s) as deemed fit in the interest of justice, equity, and good conscience.

**Place:** {_fact_or_placeholder(user_facts, "place", "Place")}  
**Date:** {today_str}  
**Verification:** Verified that the contents of paragraphs 1 to 3 are true to my knowledge and legal advice received.  
**Deponent / Counsel:** `[SIGNATURE TO BE AFFIXED]`
"""

    elif draft_type == "AFFIDAVIT":
        body = f"""# {DRAFT_DISCLAIMER_BANNER}

## BEFORE: {forum.upper()}

### AFFIDAVIT — {title.upper()}

I, **{sender}**, do hereby solemnly affirm and declare as under:

1. That I am the deponent herein and am well conversant with the facts and circumstances of the matter, and hence competent to swear this Affidavit.
2. That the material facts are strictly as follows:  
   {facts_narrative}
3. That the accompanying statement/document is governed by:  
{refs_block}

**DEPONENT**  
`[SIGNATURE OF DEPONENT TO BE AFFIXED]`

### VERIFICATION
Verified at **{_fact_or_placeholder(user_facts, "place", "Place")}** on this **{today_str}** that the contents of the above Affidavit are true and correct to the best of my knowledge and belief, and nothing material has been concealed therefrom.

**DEPONENT**  
`[SIGNATURE OF DEPONENT & NOTARY / OATH COMMISSIONER ATTESTATION]`
"""

    elif draft_type == "AGREEMENT":
        body = f"""# {DRAFT_DISCLAIMER_BANNER}

## {title.upper()}

This Agreement is made and executed on **{today_str}** by and between:

1. **FIRST PARTY:** {sender} (hereinafter referred to as the "First Party"); AND  
2. **SECOND PARTY:** {recipient} (hereinafter referred to as the "Second Party").

### 1. PURPOSE & SCOPE
{facts_narrative}

### 2. OBLIGATIONS & COMMERCIAL TERMS
{relief_or_demand}

### 3. APPLICABLE INDIAN STATUTORY FRAMEWORK
{refs_block}

### 4. GOVERNING LAW, DISPUTE RESOLUTION & JURISDICTION
This Agreement shall be governed by and construed in accordance with **{governing_law}** (including the Indian Contract Act, 1872). Subject to arbitration, the courts at **{forum}** shall have exclusive jurisdiction.

**IN WITNESS WHEREOF**, the Parties have set their hands on the date first above written:

- **For First Party:** `[SIGNATURE TO BE AFFIXED]`  
- **For Second Party:** `[SIGNATURE TO BE AFFIXED]`  
- **Witnesses:** `[WITNESS DETAILS TO BE INSERTED]`
"""

    else:
        # REPRESENTATION, MEMORANDUM, CORRESPONDENCE
        body = f"""# {DRAFT_DISCLAIMER_BANNER}

## {draft_type}: {title.upper()}

**Date:** {today_str}  
**To:** {recipient}  
**From:** {sender}  
**Subject:** {subject}

---

### 1. Executive Context & Factual Matrix
{facts_narrative}

### 2. Legal Position & Verified Authorities
{refs_block}

### 3. Submissions / Action Requested
{relief_or_demand}

---
**Prepared by:** `{sender}`  
**Verification Note:** `{DRAFT_DISCLAIMER_BANNER}`
"""

    return body.strip()


def export_draft_to_docx_bytes(title: str, content_markdown: str) -> bytes:
    """Export draft content to a valid OpenXML .docx binary stream."""
    if python_docx is not None:
        try:
            doc = python_docx.Document()
            doc.add_heading(title, level=1)
            for line in content_markdown.splitlines():
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith("# "):
                    doc.add_heading(stripped[2:], level=1)
                elif stripped.startswith("## "):
                    doc.add_heading(stripped[3:], level=2)
                elif stripped.startswith("### "):
                    doc.add_heading(stripped[4:], level=3)
                else:
                    doc.add_paragraph(stripped)
            buf = io.BytesIO()
            doc.save(buf)
            return buf.getvalue()
        except Exception:
            pass

    # Pure-Python OpenXML .docx builder fallback
    paragraphs_xml = []
    for line in [title, ""] + content_markdown.splitlines():
        escaped = xml_escape(line)
        paragraphs_xml.append(
            f"<w:p><w:r><w:t xml:space=\"preserve\">{escaped}</w:t></w:r></w:p>"
        )
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{''.join(paragraphs_xml)}</w:body></w:document>"
    )
    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/>'
        "</Relationships>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", rels_xml)
        zf.writestr("word/document.xml", document_xml)
    return buf.getvalue()


def export_draft_to_pdf_bytes(title: str, content_markdown: str) -> bytes:
    """Export draft content to a valid PDF binary stream."""
    if fitz is not None:
        try:
            doc = fitz.open()
            lines = [title, ""] + content_markdown.splitlines()
            lines_per_page = 42
            for i in range(0, max(1, len(lines)), lines_per_page):
                page = doc.new_page(width=595, height=842)
                page_text = "\n".join(lines[i : i + lines_per_page])
                rect = fitz.Rect(50, 50, 545, 792)
                page.insert_textbox(rect, page_text, fontsize=10, fontname="helv")
            pdf_bytes = doc.tobytes()
            doc.close()
            return bytes(pdf_bytes)
        except Exception:
            pass

    # Pure-Python minimal standards-compliant PDF 1.4 generator
    safe_lines = []
    for raw_ln in ([title, ""] + content_markdown.splitlines())[:55]:
        cleaned = (
            raw_ln.encode("ascii", errors="replace")
            .decode("ascii")
            .replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )
        safe_lines.append(f"({cleaned[:95]}) Tj 0 -13 Td")
    stream_content = "BT /F1 10 Tf 50 780 Td 13 TL " + " ".join(safe_lines) + " ET"
    stream_bytes = stream_content.encode("ascii")

    objs = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
        f"4 0 obj << /Length {len(stream_bytes)} >> stream\n".encode("ascii")
        + stream_bytes
        + b"\nendstream endobj\n",
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for obj in objs:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return bytes(out)
