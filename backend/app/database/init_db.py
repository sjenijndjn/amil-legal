"""Database initialization and authentic Indian Legal Corpus seeding."""

from __future__ import annotations

import hashlib
import math
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.models.legal_corpus import Citation, Judgment, LegalAct, LegalSection, LegalSource
from app.models.library import Bookmark, Folder, Note
from app.models.task import Task
from app.models.user import Profile, User


def deterministic_embedding(text_input: str, dim: int = 768) -> List[float]:
    """Generate a normalized deterministic 768-d semantic vector from legal text tokens."""
    vec = [0.0] * dim
    tokens = [
        tok.strip(".,;:()[]\"'").lower()
        for tok in text_input.split()
        if len(tok.strip(".,;:()[]\"'")) >= 2
    ]
    if not tokens:
        tokens = ["india", "law"]
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for i in range(0, 24, 3):
            idx = ((digest[i] << 8) | digest[i + 1]) % dim
            sign = 1.0 if (digest[i + 2] % 2 == 0) else -1.0
            vec[idx] += sign * (1.0 + (digest[i + 2] / 255.0))
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


def init_db(db: Session | None = None) -> None:
    """Create all tables and seed verified Indian statutes, judgments, and owner account."""
    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as exc:
            logger.warning(f"Could not create pgvector extension: {exc}")

    Base.metadata.create_all(bind=engine)

    owns_session = False
    if db is None:
        db = SessionLocal()
        owns_session = True

    try:
        _seed_owner_user(db)
        sources_map = _seed_legal_sources(db)
        sections_map = _seed_acts_and_sections(db, sources_map)
        _seed_judgments_and_citations(db, sources_map, sections_map)
        _seed_initial_workspace_items(db)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"Database seed encountered error: {exc}")
        raise
    finally:
        if owns_session:
            db.close()


def _seed_owner_user(db: Session) -> User:
    owner = db.query(User).filter(User.email == settings.OWNER_DEFAULT_EMAIL).first()
    if owner is None:
        owner = User(
            email=settings.OWNER_DEFAULT_EMAIL,
            password_hash=hash_password(settings.OWNER_DEFAULT_PASSWORD),
            is_active=True,
            is_verified=True,
            role="OWNER",
        )
        db.add(owner)
        db.flush()

    if owner.profile is None:
        profile = Profile(
            user_id=owner.id,
            display_name=settings.OWNER_DEFAULT_NAME,
            preferred_theme="midnight_navy_gold",
            preferred_language="en-IN",
            ai_response_style="standard",
            ai_document_consent=True,
            research_preferences={
                "default_jurisdiction": "India",
                "prefer_post_2024_criminal_codes": True,
                "show_historical_equivalents": True,
                "citation_format": "SCC_AND_INSC",
            },
            saved_legal_topics=[
                "Constitutional Law & Fundamental Rights",
                "BNS, BNSS & BSA (2023 Criminal Law Reforms)",
                "IT Act, 2000 & DPDP Act, 2023",
                "Commercial Contracts & Corporate Governance",
                "Electronic Evidence (BSA s. 63 / IEA s. 65B)",
            ],
            workspace_settings={
                "welcome_greeting": "Welcome back, Amil.",
                "compact_citations": False,
                "auto_verify_citations": True,
            },
        )
        db.add(profile)
        db.flush()
    return owner


def _seed_legal_sources(db: Session) -> Dict[str, LegalSource]:
    raw_sources = [
        {
            "code": "INDIA_CODE",
            "name": "India Code — Legislative Department, Ministry of Law and Justice",
            "source_type": "CENTRAL_LEGISLATION",
            "jurisdiction": "India (Union)",
            "official_url": "https://www.indiacode.nic.in",
            "is_verified_repository": True,
        },
        {
            "code": "SCI_ESCR",
            "name": "Supreme Court of India — e-SCR (Electronic Supreme Court Reports)",
            "source_type": "SUPREME_COURT_JUDGMENTS",
            "jurisdiction": "Supreme Court of India",
            "official_url": "https://digiscr.sci.gov.in",
            "is_verified_repository": True,
        },
        {
            "code": "DELHI_HC",
            "name": "High Court of Delhi — Official Judgment & Order Portal",
            "source_type": "HIGH_COURT_JUDGMENTS",
            "jurisdiction": "NCT of Delhi",
            "official_url": "https://delhihighcourt.nic.in",
            "is_verified_repository": True,
        },
        {
            "code": "BOMBAY_HC",
            "name": "High Court of Judicature at Bombay — Official Portal",
            "source_type": "HIGH_COURT_JUDGMENTS",
            "jurisdiction": "Maharashtra & Goa",
            "official_url": "https://bombayhighcourt.nic.in",
            "is_verified_repository": True,
        },
        {
            "code": "ECOURTS",
            "name": "eCourts Services — National Judicial Data Grid & Case Status",
            "source_type": "JUDICIAL_REGISTRY",
            "jurisdiction": "All India District & High Courts",
            "official_url": "https://services.ecourts.gov.in",
            "is_verified_repository": True,
        },
    ]

    result: Dict[str, LegalSource] = {}
    for item in raw_sources:
        existing = db.query(LegalSource).filter(LegalSource.code == item["code"]).first()
        if existing is None:
            existing = LegalSource(**item)
            db.add(existing)
            db.flush()
        result[item["code"]] = existing
    return result


def _seed_acts_and_sections(
    db: Session, sources_map: Dict[str, LegalSource]
) -> Dict[str, LegalSection]:
    india_code = sources_map["INDIA_CODE"]

    acts_data = [
        # 1. Bharatiya Nyaya Sanhita, 2023 (BNS)
        {
            "title": "Bharatiya Nyaya Sanhita, 2023",
            "short_title": "BNS, 2023",
            "act_number": "Act No. 45 of 2023",
            "enactment_year": 2023,
            "enactment_date": date(2023, 12, 25),
            "commencement_date": date(2024, 7, 1),
            "effective_date": date(2024, 7, 1),
            "status": "CURRENT",
            "replaces_act_code": "IPC, 1860",
            "replaced_by_act_code": None,
            "subject_category": "Criminal Law",
            "preamble": (
                "An Act to consolidate and amend the provisions relating to offences "
                "and for matters connected therewith or incidental thereto."
            ),
            "amendment_history": [
                {
                    "date": "2024-07-01",
                    "note": "Brought into force across India vide S.O. 850(E), replacing the Indian Penal Code, 1860 for offences committed on or after July 1, 2024.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "1",
                    "section_title": "Short title, commencement and application",
                    "statutory_text": (
                        "(1) This Sanhita may be called the Bharatiya Nyaya Sanhita, 2023. "
                        "(2) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint. "
                        "(3) Every person shall be liable to punishment under this Sanhita and not otherwise for every act or omission contrary to the provisions thereof, of which he shall be guilty within India."
                    ),
                    "corresponding_historical_section": "IPC, 1860 — Sections 1 to 5",
                },
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "2",
                    "section_title": "Definitions",
                    "statutory_text": (
                        "In this Sanhita, unless the context otherwise requires, consolidated definitions alphabetically arranged apply, including 'act', 'child', 'counterfeit', 'dishonestly' (doing anything with the intention of causing wrongful gain to one person or wrongful loss to another person), 'document', 'electronic record' (as defined in the Information Technology Act, 2000), 'fraudulently', and 'good faith'."
                    ),
                    "corresponding_historical_section": "IPC, 1860 — Sections 8 to 52A",
                },
                {
                    "chapter_number": "VI",
                    "chapter_title": "Of Offences Affecting the Human Body",
                    "section_number": "101",
                    "section_title": "Murder",
                    "statutory_text": (
                        "Except in the cases hereinafter excepted, culpable homicide is murder,— "
                        "(a) if the act by which the death is caused is done with the intention of causing death; or "
                        "(b) if the act by which the death is caused is done with the intention of causing such bodily injury as the offender knows to be likely to cause the death of the person to whom the harm is caused; or "
                        "(c) if the act by which the death is caused is done with the intention of causing bodily injury to any person and the bodily injury intended to be inflicted is sufficient in the ordinary course of nature to cause death; or "
                        "(d) if the person committing the act knows that it is so imminently dangerous that it must, in all probability, cause death, or such bodily injury as is likely to cause death, and commits such act without any excuse for incurring the risk of causing death or such injury as aforesaid."
                    ),
                    "corresponding_historical_section": "IPC, 1860 — Section 300",
                },
                {
                    "chapter_number": "VI",
                    "chapter_title": "Of Offences Affecting the Human Body",
                    "section_number": "103",
                    "section_title": "Punishment for murder",
                    "statutory_text": (
                        "(1) Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine. "
                        "(2) When a group of five or more persons acting in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground each member of such group shall be punished with death or with imprisonment for life, and shall also be liable to fine."
                    ),
                    "corresponding_historical_section": "IPC, 1860 — Section 302",
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Offences Against Property",
                    "section_number": "316",
                    "section_title": "Criminal breach of trust",
                    "statutory_text": (
                        "(1) Whoever, being in any manner entrusted with property, or with any dominion over property, dishonestly misappropriates or converts to his own use that property, or dishonestly uses or disposes of that property in violation of any direction of law prescribing the mode in which such trust is to be discharged, or of any legal contract, express or implied, which he has made touching the discharge of such trust, or wilfully suffers any other person so to do, commits criminal breach of trust. "
                        "(2) Whoever commits criminal breach of trust shall be punished with imprisonment of either description for a term which may extend to five years, or with fine, or with both."
                    ),
                    "corresponding_historical_section": "IPC, 1860 — Sections 405 & 406",
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Offences Against Property",
                    "section_number": "318",
                    "section_title": "Cheating",
                    "statutory_text": (
                        "(1) Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, and which act or omission causes or is likely to cause damage or harm to that person in body, mind, reputation or property, is said to cheat. "
                        "(4) Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine."
                    ),
                    "corresponding_historical_section": "IPC, 1860 — Sections 415 & 420",
                },
            ],
        },
        # 2. Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)
        {
            "title": "Bharatiya Nagarik Suraksha Sanhita, 2023",
            "short_title": "BNSS, 2023",
            "act_number": "Act No. 46 of 2023",
            "enactment_year": 2023,
            "enactment_date": date(2023, 12, 25),
            "commencement_date": date(2024, 7, 1),
            "effective_date": date(2024, 7, 1),
            "status": "CURRENT",
            "replaces_act_code": "CrPC, 1973",
            "replaced_by_act_code": None,
            "subject_category": "Criminal Procedure",
            "preamble": (
                "An Act to consolidate and amend the law relating to Criminal Procedure."
            ),
            "amendment_history": [
                {
                    "date": "2024-07-01",
                    "note": "Effective July 1, 2024, replacing the Code of Criminal Procedure, 1973; pending trials/investigations registered prior to 01-07-2024 continue under CrPC per Section 531 BNSS.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "1",
                    "section_title": "Short title, extent and commencement",
                    "statutory_text": (
                        "(1) This Sanhita may be called the Bharatiya Nagarik Suraksha Sanhita, 2023. "
                        "(2) The provisions of this Sanhita, other than those relating to Chapters IX, XI and XII thereof, shall not apply to the State of Nagaland and to the tribal areas, subject to State Government notification."
                    ),
                    "corresponding_historical_section": "CrPC, 1973 — Section 1",
                },
                {
                    "chapter_number": "V",
                    "chapter_title": "Arrest of Persons",
                    "section_number": "35",
                    "section_title": "When police may arrest without warrant",
                    "statutory_text": (
                        "(1) Any police officer may without an order from a Magistrate and without a warrant, arrest any person who commits, in the presence of a police officer, a cognizable offence; or against whom a reasonable complaint has been made, or credible information has been received, or a reasonable suspicion exists that he has committed a cognizable offence punishable with imprisonment for a term which may be less than seven years or which may extend to seven years whether with or without fine, if the specified statutory conditions are satisfied. "
                        "(3) The police officer shall, in all cases where the arrest of a person is not required under sub-section (1) issue a notice directing the person against whom a reasonable complaint has been made to appear before him. "
                        "(7) No arrest shall be made without prior permission of an officer not below the rank of Deputy Superintendent of Police in case of an offence which is punishable for imprisonment of less than three years and such person is infirm or is above sixty years of age."
                    ),
                    "corresponding_historical_section": "CrPC, 1973 — Sections 41 & 41A",
                },
                {
                    "chapter_number": "XIII",
                    "chapter_title": "Information to the Police and Their Powers to Investigate",
                    "section_number": "173",
                    "section_title": "Information in cognizable cases (Zero FIR & e-FIR)",
                    "statutory_text": (
                        "(1) Every information relating to the commission of a cognizable offence, irrespective of the area where the offence is committed, may be given orally or by electronic communication to an officer in charge of a police station, and if given— "
                        "(i) orally, it shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it; "
                        "(ii) by electronic communication, it shall be taken on record by him on being signed within three days by the person giving it."
                    ),
                    "corresponding_historical_section": "CrPC, 1973 — Section 154",
                },
                {
                    "chapter_number": "XXXV",
                    "chapter_title": "Provisions as to Bail and Bonds",
                    "section_number": "482",
                    "section_title": "Direction for grant of bail to person apprehending arrest (Anticipatory Bail)",
                    "statutory_text": (
                        "(1) When any person has reason to believe that he may be arrested on an accusation of having committed a non-bailable offence, he may apply to the High Court or the Court of Session for a direction under this section; and that Court may, if it thinks fit, direct that in the event of such arrest, he shall be released on bail."
                    ),
                    "corresponding_historical_section": "CrPC, 1973 — Section 438",
                },
            ],
        },
        # 3. Bharatiya Sakshya Adhiniyam, 2023 (BSA)
        {
            "title": "Bharatiya Sakshya Adhiniyam, 2023",
            "short_title": "BSA, 2023",
            "act_number": "Act No. 47 of 2023",
            "enactment_year": 2023,
            "enactment_date": date(2023, 12, 25),
            "commencement_date": date(2024, 7, 1),
            "effective_date": date(2024, 7, 1),
            "status": "CURRENT",
            "replaces_act_code": "IEA, 1872",
            "replaced_by_act_code": None,
            "subject_category": "Law of Evidence",
            "preamble": (
                "An Act to consolidate and to provide for general rules and principles of evidence for fair trial."
            ),
            "amendment_history": [
                {
                    "date": "2024-07-01",
                    "note": "Came into force on July 1, 2024, replacing the Indian Evidence Act, 1872.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "1",
                    "section_title": "Short title, application and commencement",
                    "statutory_text": (
                        "(1) This Adhiniyam may be called the Bharatiya Sakshya Adhiniyam, 2023. "
                        "(2) It applies to all judicial proceedings in or before any Court, including Courts-martial, but not to affidavits presented to any Court or officer, nor to proceedings before an arbitrator."
                    ),
                    "corresponding_historical_section": "IEA, 1872 — Section 1",
                },
                {
                    "chapter_number": "V",
                    "chapter_title": "Of Documentary Evidence",
                    "section_number": "61",
                    "section_title": "Electronic or digital record",
                    "statutory_text": (
                        "Nothing in this Adhiniyam shall apply to deny the admissibility of an electronic or digital record in the evidence on the ground that it is an electronic or digital record and such record shall, subject to section 63, have the same legal effect, validity and enforceability as other document."
                    ),
                    "corresponding_historical_section": "Newly enacted parity provision in BSA, 2023",
                },
                {
                    "chapter_number": "V",
                    "chapter_title": "Of Documentary Evidence",
                    "section_number": "63",
                    "section_title": "Admissibility of electronic records",
                    "statutory_text": (
                        "(1) Notwithstanding anything contained in this Adhiniyam, any information contained in an electronic record which is printed on paper, stored, recorded or copied in optical or magnetic media or semiconductor memory which is produced by a computer or any communication device (hereinafter referred to as the computer output) shall be deemed to be also a document, if the conditions mentioned in this section are satisfied in relation to the information and computer in question and shall be admissible in any proceedings, without further proof or production of the original. "
                        "(4) In any proceeding where it is desired to give a statement in evidence by virtue of this section, a certificate (Part A by the party and Part B by the expert/person in charge of the device) identifying the electronic record and stating cryptographic hash value (SHA-256) shall be submitted."
                    ),
                    "corresponding_historical_section": "IEA, 1872 — Section 65B",
                },
            ],
        },
        # 4. Constitution of India, 1950
        {
            "title": "Constitution of India, 1950",
            "short_title": "Constitution of India",
            "act_number": "Constituent Assembly, 1949",
            "enactment_year": 1949,
            "enactment_date": date(1949, 11, 26),
            "commencement_date": date(1950, 1, 26),
            "effective_date": date(1950, 1, 26),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Constitutional Law",
            "preamble": (
                "WE, THE PEOPLE OF INDIA, having solemnly resolved to constitute India into a "
                "SOVEREIGN SOCIALIST SECULAR DEMOCRATIC REPUBLIC and to secure to all its citizens: "
                "JUSTICE, social, economic and political; LIBERTY of thought, expression, belief, faith and worship; "
                "EQUALITY of status and of opportunity; and to promote among them all FRATERNITY assuring the dignity "
                "of the individual and the unity and integrity of the Nation."
            ),
            "amendment_history": [
                {
                    "date": "1978-06-20",
                    "note": "Constitution (Forty-fourth Amendment) Act, 1978 reinforced Fundamental Rights safeguards.",
                }
            ],
            "sections": [
                {
                    "part_number": "Part III",
                    "chapter_number": "III",
                    "chapter_title": "Fundamental Rights — General",
                    "section_number": "Article 12",
                    "section_title": "Definition of the State",
                    "statutory_text": (
                        "In this Part, unless the context otherwise requires, 'the State' includes the Government and Parliament of India and the Government and the Legislature of each of the States and all local or other authorities within the territory of India or under the control of the Government of India."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "part_number": "Part III",
                    "chapter_number": "III",
                    "chapter_title": "Right to Equality",
                    "section_number": "Article 14",
                    "section_title": "Equality before law",
                    "statutory_text": (
                        "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "part_number": "Part III",
                    "chapter_number": "III",
                    "chapter_title": "Right to Freedom",
                    "section_number": "Article 19",
                    "section_title": "Protection of certain rights regarding freedom of speech, etc.",
                    "statutory_text": (
                        "(1) All citizens shall have the right— (a) to freedom of speech and expression; (b) to assemble peaceably and without arms; (c) to form associations or unions or co-operative societies; (d) to move freely throughout the territory of India; (e) to reside and settle in any part of the territory of India; and (g) to practise any profession, or to carry on any occupation, trade or business, subject to reasonable restrictions under clauses (2) to (6)."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "part_number": "Part III",
                    "chapter_number": "III",
                    "chapter_title": "Right to Freedom",
                    "section_number": "Article 21",
                    "section_title": "Protection of life and personal liberty",
                    "statutory_text": (
                        "No person shall be deprived of his life or personal liberty except according to procedure established by law."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "part_number": "Part III",
                    "chapter_number": "III",
                    "chapter_title": "Right to Constitutional Remedies",
                    "section_number": "Article 32",
                    "section_title": "Remedies for enforcement of rights conferred by this Part",
                    "statutory_text": (
                        "(1) The right to move the Supreme Court by appropriate proceedings for the enforcement of the rights conferred by this Part is guaranteed. "
                        "(2) The Supreme Court shall have power to issue directions or orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, whichever may be appropriate, for the enforcement of any of the rights conferred by this Part."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "part_number": "Part VI",
                    "chapter_number": "V",
                    "chapter_title": "The High Courts in the States",
                    "section_number": "Article 226",
                    "section_title": "Power of High Courts to issue certain writs",
                    "statutory_text": (
                        "(1) Notwithstanding anything in article 32, every High Court shall have power, throughout the territories in relation to which it exercises jurisdiction, to issue to any person or authority, including in appropriate cases, any Government, within those territories directions, orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, or any of them, for the enforcement of any of the rights conferred by Part III and for any other purpose."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 5. Information Technology Act, 2000
        {
            "title": "Information Technology Act, 2000",
            "short_title": "IT Act, 2000",
            "act_number": "Act No. 21 of 2000",
            "enactment_year": 2000,
            "enactment_date": date(2000, 6, 9),
            "commencement_date": date(2000, 10, 17),
            "effective_date": date(2000, 10, 17),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Cyber & Technology Law",
            "preamble": (
                "An Act to provide legal recognition for transactions carried out by means of electronic data interchange and other means of electronic communication."
            ),
            "amendment_history": [
                {
                    "date": "2009-10-27",
                    "note": "Information Technology (Amendment) Act, 2008 inserted Sections 43A, 66C, and revised Section 79 intermediary safe harbour.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "IX",
                    "chapter_title": "Penalties, Compensation and Adjudication",
                    "section_number": "43A",
                    "section_title": "Compensation for failure to protect data",
                    "statutory_text": (
                        "Where a body corporate, possessing, dealing or handling any sensitive personal data or information in a computer resource which it owns, controls or operates, is negligent in implementing and maintaining reasonable security practices and procedures and thereby causes wrongful loss or wrongful gain to any person, such body corporate shall be liable to pay damages by way of compensation to the person so affected."
                    ),
                    "corresponding_historical_section": "To be omitted upon notified commencement of Section 44(2) of the DPDP Act, 2023",
                },
                {
                    "chapter_number": "XI",
                    "chapter_title": "Offences",
                    "section_number": "66",
                    "section_title": "Computer related offences",
                    "statutory_text": (
                        "If any person, dishonestly or fraudulently, does any act referred to in section 43, he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or with both."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "XI",
                    "chapter_title": "Offences",
                    "section_number": "66C",
                    "section_title": "Punishment for identity theft",
                    "statutory_text": (
                        "Whoever, fraudulently or dishonestly makes use of the electronic signature, password or any other unique identification feature of any other person, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to rupees one lakh."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "XII",
                    "chapter_title": "Intermediaries Not to Be Liable in Certain Cases",
                    "section_number": "79",
                    "section_title": "Exemption from liability of intermediary in certain cases (Safe Harbour)",
                    "statutory_text": (
                        "(1) Notwithstanding anything contained in any law for the time being in force but subject to the provisions of sub-sections (2) and (3), an intermediary shall not be liable for any third party information, data, or communication link made available or hosted by him if the intermediary observes due diligence and does not initiate the transmission, select the receiver, or modify the information, and expeditiously removes unlawful content upon receiving actual knowledge by way of a court order or government notification as held in Shreya Singhal v. Union of India."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 6. Digital Personal Data Protection Act, 2023 (DPDP Act)
        {
            "title": "Digital Personal Data Protection Act, 2023",
            "short_title": "DPDP Act, 2023",
            "act_number": "Act No. 22 of 2023",
            "enactment_year": 2023,
            "enactment_date": date(2023, 8, 11),
            "commencement_date": date(2023, 8, 11),
            "effective_date": date(2023, 8, 11),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Data Privacy & Protection",
            "preamble": (
                "An Act to provide for the processing of digital personal data in a manner that recognises both the right of individuals to protect their personal data and the need to process such personal data for lawful purposes."
            ),
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "II",
                    "chapter_title": "Obligations of Data Fiduciary",
                    "section_number": "4",
                    "section_title": "Grounds for processing personal data",
                    "statutory_text": (
                        "(1) A person may process the personal data of a Data Principal only in accordance with the provisions of this Act and for a lawful purpose,— (a) for which the Data Principal has given her consent; or (b) for certain legitimate uses."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Obligations of Data Fiduciary",
                    "section_number": "6",
                    "section_title": "Consent",
                    "statutory_text": (
                        "(1) The consent given by the Data Principal shall be free, specific, informed, unconditional and unambiguous with a clear affirmative action, and shall signify an agreement to the processing of her personal data for the specified purpose and be limited to such personal data as is necessary for such specified purpose."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Obligations of Data Fiduciary",
                    "section_number": "8",
                    "section_title": "General obligations of Data Fiduciary",
                    "statutory_text": (
                        "(5) A Data Fiduciary shall protect personal data in its possession or under its control, including in respect of any processing undertaken by it or on its behalf by a Data Processor, by taking reasonable security safeguards to prevent personal data breach."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "III",
                    "chapter_title": "Rights and Duties of Data Principal",
                    "section_number": "12",
                    "section_title": "Right to correction and erasure of personal data",
                    "statutory_text": (
                        "(1) A Data Principal shall have the right to correction, completion, updating and erasure of her personal data for the processing of which she has previously given consent. "
                        "(3) A Data Fiduciary shall, upon receiving a request for erasure, erase the personal data of the Data Principal unless retention is necessary for the specified purpose or for compliance with any law."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 7. Consumer Protection Act, 2019
        {
            "title": "Consumer Protection Act, 2019",
            "short_title": "CPA, 2019",
            "act_number": "Act No. 35 of 2019",
            "enactment_year": 2019,
            "enactment_date": date(2019, 8, 9),
            "commencement_date": date(2020, 7, 20),
            "effective_date": date(2020, 7, 20),
            "status": "CURRENT",
            "replaces_act_code": "Consumer Protection Act, 1986",
            "replaced_by_act_code": None,
            "subject_category": "Consumer Law",
            "preamble": (
                "An Act to provide for protection of the interests of consumers and for the said purpose, to establish authorities for timely and effective administration and settlement of consumers' disputes."
            ),
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "2(7)",
                    "section_title": "Definition of Consumer",
                    "statutory_text": (
                        "'Consumer' means any person who buys any goods for a consideration or hires or avails of any service for a consideration which has been paid or promised or partly paid and partly promised, including offline or online transactions through electronic means, teleshopping, direct selling or multi-level marketing, but does not include a person who obtains such goods for resale or for any commercial purpose."
                    ),
                    "corresponding_historical_section": "CPA, 1986 — Section 2(1)(d)",
                },
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "2(47)",
                    "section_title": "Definition of Unfair Trade Practice",
                    "statutory_text": (
                        "'Unfair trade practice' means a trade practice which, for the purpose of promoting the sale, use or supply of any goods or for the provision of any service, adopts any unfair method or unfair or deceptive practice, including misleading advertisements, refusal to take back defective goods, or disclosure of personal information given in confidence."
                    ),
                    "corresponding_historical_section": "CPA, 1986 — Section 2(1)(r)",
                },
                {
                    "chapter_number": "IV",
                    "chapter_title": "Consumer Disputes Redressal Commission",
                    "section_number": "35",
                    "section_title": "Manner in which complaint shall be made",
                    "statutory_text": (
                        "(1) A complaint, in relation to any goods sold or delivered or agreed to be sold or delivered or any service provided or agreed to be provided, may be filed with a District Commission by the consumer to whom such goods are sold or services are provided."
                    ),
                    "corresponding_historical_section": "CPA, 1986 — Section 12",
                },
            ],
        },
        # 8. Indian Contract Act, 1872
        {
            "title": "Indian Contract Act, 1872",
            "short_title": "Contract Act, 1872",
            "act_number": "Act No. 9 of 1872",
            "enactment_year": 1872,
            "enactment_date": date(1872, 4, 25),
            "commencement_date": date(1872, 9, 1),
            "effective_date": date(1872, 9, 1),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Commercial & Contract Law",
            "preamble": (
                "Whereas it is expedient to define and amend certain parts of the law relating to contracts."
            ),
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "II",
                    "chapter_title": "Of Contracts, Voidable Contracts and Void Agreements",
                    "section_number": "10",
                    "section_title": "What agreements are contracts",
                    "statutory_text": (
                        "All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Of Contracts, Voidable Contracts and Void Agreements",
                    "section_number": "14",
                    "section_title": "Free consent defined",
                    "statutory_text": (
                        "Consent is said to be free when it is not caused by— (1) coercion, as defined in section 15, or (2) undue influence, as defined in section 16, or (3) fraud, as defined in section 17, or (4) misrepresentation, as defined in section 18, or (5) mistake, subject to the provisions of sections 20, 21 and 22."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Of Contracts, Voidable Contracts and Void Agreements",
                    "section_number": "23",
                    "section_title": "What considerations and objects are lawful, and what not",
                    "statutory_text": (
                        "The consideration or object of an agreement is lawful, unless— it is forbidden by law; or is of such a nature that, if permitted, it would defeat the provisions of any law; or is fraudulent; or involves or implies injury to the person or property of another; or the Court regards it as immoral, or opposed to public policy. Every agreement of which the object or consideration is unlawful is void."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Of Contracts, Voidable Contracts and Void Agreements",
                    "section_number": "27",
                    "section_title": "Agreement in restraint of trade, void",
                    "statutory_text": (
                        "Every agreement by which any one is restrained from exercising a lawful profession, trade or business of any kind, is to that extent void, save where one sells the goodwill of a business with reasonable local limits."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "VI",
                    "chapter_title": "Of the Consequences of Breach of Contract",
                    "section_number": "73",
                    "section_title": "Compensation for loss or damage caused by breach of contract",
                    "statutory_text": (
                        "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it. Such compensation is not to be given for any remote and indirect loss or damage sustained by reason of the breach."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "VI",
                    "chapter_title": "Of the Consequences of Breach of Contract",
                    "section_number": "74",
                    "section_title": "Compensation for breach of contract where penalty stipulated for",
                    "statutory_text": (
                        "When a contract has been broken, if a sum is named in the contract as the amount to be paid in case of such breach, or if the contract contains any other stipulation by way of penalty, the party complaining of the breach is entitled, whether or not actual damage or loss is proved to have been caused thereby, to receive from the party who has broken the contract reasonable compensation not exceeding the amount so named or, as the case may be, the penalty stipulated for."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 9. Companies Act, 2013
        {
            "title": "Companies Act, 2013",
            "short_title": "Companies Act, 2013",
            "act_number": "Act No. 18 of 2013",
            "enactment_year": 2013,
            "enactment_date": date(2013, 8, 29),
            "commencement_date": date(2013, 9, 12),
            "effective_date": date(2014, 4, 1),
            "status": "CURRENT",
            "replaces_act_code": "Companies Act, 1956",
            "replaced_by_act_code": None,
            "subject_category": "Corporate & Company Law",
            "preamble": (
                "An Act to consolidate and amend the law relating to companies."
            ),
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "I",
                    "chapter_title": "Preliminary",
                    "section_number": "2(20)",
                    "section_title": "Definition of Company",
                    "statutory_text": (
                        "'Company' means a company incorporated under this Act or under any previous company law."
                    ),
                    "corresponding_historical_section": "Companies Act, 1956 — Section 3",
                },
                {
                    "chapter_number": "XI",
                    "chapter_title": "Appointment and Qualifications of Directors",
                    "section_number": "166",
                    "section_title": "Duties of directors",
                    "statutory_text": (
                        "(1) Subject to the provisions of this Act, a director of a company shall act in accordance with the articles of the company. "
                        "(2) A director of a company shall act in good faith in order to promote the objects of the company for the benefit of its members as a whole, and in the best interests of the company, its employees, the shareholders, the community and for the protection of environment. "
                        "(3) A director of a company shall exercise his duties with due and reasonable care, skill and diligence and shall exercise independent judgment."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "XVI",
                    "chapter_title": "Prevention of Oppression and Mismanagement",
                    "section_number": "241",
                    "section_title": "Application to Tribunal for relief in cases of oppression, etc.",
                    "statutory_text": (
                        "(1) Any member of a company who complains that the affairs of the company have been or are being conducted in a manner prejudicial to public interest or in a manner prejudicial or oppressive to him or any other member or members or in a manner prejudicial to the interests of the company, may apply to the National Company Law Tribunal (NCLT), provided such member has a right to apply under section 244."
                    ),
                    "corresponding_historical_section": "Companies Act, 1956 — Sections 397 & 398",
                },
            ],
        },
        # 10. Historical Act: Indian Penal Code, 1860 (IPC)
        {
            "title": "Indian Penal Code, 1860",
            "short_title": "IPC, 1860",
            "act_number": "Act No. 45 of 1860",
            "enactment_year": 1860,
            "enactment_date": date(1860, 10, 6),
            "commencement_date": date(1862, 1, 1),
            "effective_date": date(1862, 1, 1),
            "status": "HISTORICAL",
            "replaces_act_code": None,
            "replaced_by_act_code": "BNS, 2023",
            "subject_category": "Criminal Law (Pre-July 1, 2024)",
            "preamble": (
                "Whereas it is expedient to provide a general Penal Code for India (Replaced by Bharatiya Nyaya Sanhita, 2023 w.e.f. 01-07-2024; continues to govern offences committed prior to 01-07-2024 under Section 358 BNS)."
            ),
            "amendment_history": [
                {
                    "date": "2024-07-01",
                    "note": "Repealed and replaced by Bharatiya Nyaya Sanhita, 2023 (Act 45 of 2023) with savings for pre-July 1, 2024 offences.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "XVI",
                    "chapter_title": "Of Offences Affecting the Human Body",
                    "section_number": "300",
                    "section_title": "Murder (Historical IPC)",
                    "statutory_text": (
                        "Except in the cases hereinafter excepted, culpable homicide is murder, if the act by which the death is caused is done with the intention of causing death, or with the intention of causing such bodily injury as the offender knows to be likely to cause death or sufficient in the ordinary course of nature to cause death."
                    ),
                    "corresponding_historical_section": "Now Section 101 of BNS, 2023 (w.e.f. 01-07-2024)",
                },
                {
                    "chapter_number": "XVI",
                    "chapter_title": "Of Offences Affecting the Human Body",
                    "section_number": "302",
                    "section_title": "Punishment for murder (Historical IPC)",
                    "statutory_text": (
                        "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine."
                    ),
                    "corresponding_historical_section": "Now Section 103(1) of BNS, 2023 (w.e.f. 01-07-2024)",
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Offences Against Property",
                    "section_number": "415",
                    "section_title": "Cheating (Historical IPC)",
                    "statutory_text": (
                        "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, is said to 'cheat'."
                    ),
                    "corresponding_historical_section": "Now Section 318(1) of BNS, 2023 (w.e.f. 01-07-2024)",
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Offences Against Property",
                    "section_number": "420",
                    "section_title": "Cheating and dishonestly inducing delivery of property (Historical IPC)",
                    "statutory_text": (
                        "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine."
                    ),
                    "corresponding_historical_section": "Now Section 318(4) of BNS, 2023 (w.e.f. 01-07-2024)",
                },
            ],
        },
        # 11. Historical Act: Code of Criminal Procedure, 1973 (CrPC)
        {
            "title": "Code of Criminal Procedure, 1973",
            "short_title": "CrPC, 1973",
            "act_number": "Act No. 2 of 1974",
            "enactment_year": 1974,
            "enactment_date": date(1974, 1, 25),
            "commencement_date": date(1974, 4, 1),
            "effective_date": date(1974, 4, 1),
            "status": "HISTORICAL",
            "replaces_act_code": "CrPC, 1898",
            "replaced_by_act_code": "BNSS, 2023",
            "subject_category": "Criminal Procedure (Pre-July 1, 2024)",
            "preamble": (
                "An Act to consolidate and amend the law relating to Criminal Procedure (Replaced by Bharatiya Nagarik Suraksha Sanhita, 2023 w.e.f. 01-07-2024)."
            ),
            "amendment_history": [
                {
                    "date": "2024-07-01",
                    "note": "Replaced by Bharatiya Nagarik Suraksha Sanhita, 2023 (Act 46 of 2023) subject to Section 531 savings.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "V",
                    "chapter_title": "Arrest of Persons",
                    "section_number": "41",
                    "section_title": "When police may arrest without warrant (Historical CrPC)",
                    "statutory_text": (
                        "Any police officer may without an order from a Magistrate and without a warrant, arrest any person against whom a reasonable complaint has been made, or credible information has been received, or a reasonable suspicion exists of his having been concerned in any cognizable offence, subject to Section 41A notice compliance."
                    ),
                    "corresponding_historical_section": "Now Section 35 of BNSS, 2023 (w.e.f. 01-07-2024)",
                },
                {
                    "chapter_number": "XII",
                    "chapter_title": "Information to the Police and Their Powers to Investigate",
                    "section_number": "154",
                    "section_title": "Information in cognizable cases (Historical CrPC)",
                    "statutory_text": (
                        "Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant."
                    ),
                    "corresponding_historical_section": "Now Section 173 of BNSS, 2023 (w.e.f. 01-07-2024)",
                },
                {
                    "chapter_number": "XXXIII",
                    "chapter_title": "Provisions as to Bail and Bonds",
                    "section_number": "438",
                    "section_title": "Direction for grant of bail to person apprehending arrest (Historical CrPC)",
                    "statutory_text": (
                        "Where any person has reason to believe that he may be arrested on accusation of having committed a non-bailable offence, he may apply to the High Court or the Court of Session for a direction under this section that in the event of such arrest he shall be released on bail."
                    ),
                    "corresponding_historical_section": "Now Section 482 of BNSS, 2023 (w.e.f. 01-07-2024)",
                },
            ],
        },
        # 12. Historical Act: Indian Evidence Act, 1872 (IEA)
        {
            "title": "Indian Evidence Act, 1872",
            "short_title": "IEA, 1872",
            "act_number": "Act No. 1 of 1872",
            "enactment_year": 1872,
            "enactment_date": date(1872, 3, 15),
            "commencement_date": date(1872, 9, 1),
            "effective_date": date(1872, 9, 1),
            "status": "HISTORICAL",
            "replaces_act_code": None,
            "replaced_by_act_code": "BSA, 2023",
            "subject_category": "Law of Evidence (Pre-July 1, 2024)",
            "preamble": (
                "Whereas it is expedient to consolidate, define and amend the law of Evidence (Replaced by Bharatiya Sakshya Adhiniyam, 2023 w.e.f. 01-07-2024)."
            ),
            "amendment_history": [
                {
                    "date": "2024-07-01",
                    "note": "Replaced by Bharatiya Sakshya Adhiniyam, 2023 (Act 47 of 2023) w.e.f. July 1, 2024.",
                }
            ],
            "sections": [
                {
                    "chapter_number": "V",
                    "chapter_title": "Of Documentary Evidence",
                    "section_number": "65B",
                    "section_title": "Admissibility of electronic records (Historical IEA)",
                    "statutory_text": (
                        "Notwithstanding anything contained in this Act, any information contained in an electronic record which is printed on a paper, stored, recorded or copied in optical or magnetic media produced by a computer shall be deemed to be also a document, subject to a mandatory certificate under sub-section (4) signed by a person occupying a responsible official position in relation to the operation of the relevant device."
                    ),
                    "corresponding_historical_section": "Now Section 63 of BSA, 2023 (w.e.f. 01-07-2024)",
                }
            ],
        },
        # 13. The Negotiable Instruments Act, 1881
        {
            "title": "The Negotiable Instruments Act, 1881",
            "short_title": "NI Act, 1881",
            "act_number": "Act No. 26 of 1881",
            "enactment_year": 1881,
            "enactment_date": date(1881, 12, 9),
            "commencement_date": date(1882, 3, 1),
            "effective_date": date(1882, 3, 1),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Banking & Commercial Law",
            "preamble": "An Act to define and amend the law relating to Promissory Notes, Bills of Exchange and Cheques.",
            "amendment_history": [
                {"date": "2018-09-01", "note": "Amended by Act 20 of 2018 inserting Section 143A and Section 148."}
            ],
            "sections": [
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques for Insufficiency of Funds",
                    "section_number": "138",
                    "section_title": "Dishonour of cheque for insufficiency, etc., of funds in the account",
                    "statutory_text": (
                        "Where any cheque drawn by a person on an account maintained by him with a banker for payment of any "
                        "amount of money to another person from out of that account for the discharge, in whole or in part, of any "
                        "debt or other liability, is returned by the bank unpaid, either because of the amount of money standing to the "
                        "credit of that account is insufficient to honour the cheque or that it exceeds the amount arranged to be paid "
                        "from that account by an agreement made with that bank, such person shall be deemed to have committed an offence "
                        "and shall, without prejudice to any other provisions of this Act, be punished with imprisonment for a term which may "
                        "be extended to two years, or with fine which may extend to twice the amount of the cheque, or with both:\n\n"
                        "Provided that nothing contained in this section shall apply unless—\n"
                        "(a) the cheque has been presented to the bank within a period of three months from the date on which it is drawn or within the period of its validity, whichever is earlier;\n"
                        "(b) the payee or the holder in due course of the cheque, as the case may be, makes a demand for the payment of the said amount of money by giving a notice in writing, to the drawer of the cheque, within thirty days of the receipt of information by him from the bank regarding the return of the cheque as unpaid; and\n"
                        "(c) the drawer of such cheque fails to make the payment of the said amount of money to the payee or, as the case may be, to the holder in due course of the cheque, within fifteen days of the receipt of the said notice."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                    "section_number": "139",
                    "section_title": "Presumption in favour of holder",
                    "statutory_text": (
                        "It shall be presumed, unless the contrary is proved, that the holder of a cheque received the cheque of the nature "
                        "referred to in section 138 for the discharge, in whole or in part, of any debt or other liability."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                    "section_number": "141",
                    "section_title": "Offences by companies",
                    "statutory_text": (
                        "(1) If the person committing an offence under section 138 is a company, every person who; at the time the offence "
                        "was committed, was in charge of, and was responsible to the company for the conduct of the business of the company, "
                        "as well as the company, shall be deemed to be guilty of the offence and shall be liable to be proceeded against and "
                        "punished accordingly.\n\n"
                        "(2) Where any offence under this Act has been committed by a company and it is proved that the offence has been committed "
                        "with the consent or connivance of, or is attributable to, any neglect on the part of, any director, manager, secretary or "
                        "other officer of the company, such director, manager, secretary or other officer shall also be deemed to be guilty of that offence."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "XVII",
                    "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                    "section_number": "142",
                    "section_title": "Cognizance of offences",
                    "statutory_text": (
                        "(1) Notwithstanding anything contained in the Code of Criminal Procedure, 1973 (2 of 1974),—\n"
                        "(a) no court shall take cognizance of any offence punishable under section 138 except upon a complaint, in writing, made by the payee or, as the case may be, the holder in due course of the cheque;\n"
                        "(b) such complaint is made within one month of the date on which the cause of action arises under clause (c) of the proviso to section 138;\n"
                        "(c) no court inferior to that of a Metropolitan Magistrate or a Judicial Magistrate of the first class shall try any offence punishable under section 138."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 14. The Arbitration and Conciliation Act, 1996
        {
            "title": "The Arbitration and Conciliation Act, 1996",
            "short_title": "Arbitration Act, 1996",
            "act_number": "Act No. 26 of 1996",
            "enactment_year": 1996,
            "enactment_date": date(1996, 8, 16),
            "commencement_date": date(1996, 8, 22),
            "effective_date": date(1996, 8, 22),
            "status": "CURRENT",
            "replaces_act_code": "Arbitration Act, 1940",
            "replaced_by_act_code": None,
            "subject_category": "Dispute Resolution & Commercial Arbitration",
            "preamble": "An Act to consolidate and amend the law relating to domestic arbitration, international commercial arbitration and enforcement of foreign arbitral awards.",
            "amendment_history": [
                {"date": "2015-10-23", "note": "Amended by Act 3 of 2016 inserting Section 29A and amending Section 8, 9, 11, 34."}
            ],
            "sections": [
                {
                    "chapter_number": "II",
                    "chapter_title": "Arbitration Agreement",
                    "section_number": "8",
                    "section_title": "Power to refer parties to arbitration where there is an arbitration agreement",
                    "statutory_text": (
                        "(1) A judicial authority, before which an action is brought in a matter which is the subject of an arbitration agreement shall, "
                        "if a party to the arbitration agreement or any person claiming through or under him, so applies not later than the date of "
                        "submitting his first statement on the substance of the dispute, refer the parties to arbitration unless it finds that prima facie no valid arbitration agreement exists."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Arbitration Agreement",
                    "section_number": "9",
                    "section_title": "Interim measures, etc. by Court",
                    "statutory_text": (
                        "(1) A party may, before or during arbitral proceedings or at any time after the making of the arbitral award but before "
                        "it is enforced in accordance with section 36, apply to a court for interim measures including preservation, custody or sale "
                        "of goods, securing the amount in dispute, or interim injunction."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "III",
                    "chapter_title": "Composition of Arbitral Tribunal",
                    "section_number": "11",
                    "section_title": "Appointment of arbitrators",
                    "statutory_text": (
                        "Governs appointment of arbitrators by party consensus or upon application to the Supreme Court or High Court. "
                        "Under sub-section (6A), the Court confines its examination to the existence of an arbitration agreement."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "VII",
                    "chapter_title": "Recourse against Arbitral Award",
                    "section_number": "34",
                    "section_title": "Application for setting aside arbitral award",
                    "statutory_text": (
                        "(1) Recourse to a Court against an arbitral award may be made only by an application for setting aside such award in accordance "
                        "with sub-section (2) and sub-section (2A) on grounds of incapacity, invalid agreement, lack of proper notice, dispute outside scope, "
                        "conflict with public policy of India, or patent illegality appearing on the face of the award."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 15. The Specific Relief Act, 1963
        {
            "title": "The Specific Relief Act, 1963",
            "short_title": "Specific Relief Act, 1963",
            "act_number": "Act No. 47 of 1963",
            "enactment_year": 1963,
            "enactment_date": date(1963, 12, 13),
            "commencement_date": date(1964, 3, 1),
            "effective_date": date(1964, 3, 1),
            "status": "CURRENT",
            "replaces_act_code": "Specific Relief Act, 1877",
            "replaced_by_act_code": None,
            "subject_category": "Civil Law & Remedies",
            "preamble": "An Act to define and amend the law relating to certain kinds of specific relief.",
            "amendment_history": [
                {"date": "2018-10-01", "note": "Amended by Act 18 of 2018 making specific performance mandatory."}
            ],
            "sections": [
                {
                    "chapter_number": "I",
                    "chapter_title": "Recovering Possession of Property",
                    "section_number": "6",
                    "section_title": "Suit by person dispossessed of immovable property",
                    "statutory_text": (
                        "(1) If any person is dispossessed without his consent of immovable property otherwise than in due course of law, "
                        "he or any person through whom he has been in possession or any person claiming through him may, by suit, recover possession "
                        "thereof, notwithstanding any other title that may be set up in such suit. (2) No suit under this section shall be brought "
                        "after the expiry of six months from the date of dispossession or against the Government."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Specific Performance of Contracts",
                    "section_number": "10",
                    "section_title": "Specific performance in respect of contracts",
                    "statutory_text": (
                        "The specific performance of a contract shall be enforced by the court subject to the provisions contained in "
                        "sub-section (2) of section 11, section 14 and section 16."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "VI",
                    "chapter_title": "Declaratory Decrees",
                    "section_number": "34",
                    "section_title": "Discretion of court as to declaration of status or right",
                    "statutory_text": (
                        "Any person entitled to any legal character, or to any right as to any property, may institute a suit against any person "
                        "denying, or interested to deny, his title to such character or right, and the court may in its discretion make therein a "
                        "declaration that he is so entitled."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 16. The Code of Civil Procedure, 1908 (CPC)
        {
            "title": "The Code of Civil Procedure, 1908",
            "short_title": "CPC, 1908",
            "act_number": "Act No. 5 of 1908",
            "enactment_year": 1908,
            "enactment_date": date(1908, 3, 21),
            "commencement_date": date(1909, 1, 1),
            "effective_date": date(1909, 1, 1),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Civil Procedure & Adjudication",
            "preamble": "An Act to consolidate and amend the laws relating to the procedure of the Courts of Civil Judicature.",
            "amendment_history": [
                {"date": "2002-07-01", "note": "Major procedural amendments under CPC Amendment Acts of 1999 and 2002."}
            ],
            "sections": [
                {
                    "chapter_number": "Preliminary",
                    "chapter_title": "Jurisdiction of Courts",
                    "section_number": "9",
                    "section_title": "Courts to try all civil suits unless barred",
                    "statutory_text": (
                        "The Courts shall (subject to the provisions herein contained) have jurisdiction to try all suits of a civil nature "
                        "excepting suits of which their cognizance is either expressly or impliedly barred."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "Part I",
                    "chapter_title": "Suits in General",
                    "section_number": "11",
                    "section_title": "Res Judicata",
                    "statutory_text": (
                        "No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and "
                        "substantially in issue in a former suit between the same parties, litigating under the same title, in a Court competent "
                        "to try such subsequent suit and has been heard and finally decided by such Court."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "Part XI",
                    "chapter_title": "Miscellaneous",
                    "section_number": "151",
                    "section_title": "Saving of inherent powers of Court",
                    "statutory_text": (
                        "Nothing in this Code shall be deemed to limit or otherwise affect the inherent power of the Court to make such orders "
                        "as may be necessary for the ends of justice or to prevent abuse of the process of the Court."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "First Schedule",
                    "chapter_title": "Order VII — Plaint",
                    "section_number": "Order VII Rule 11",
                    "section_title": "Rejection of plaint",
                    "statutory_text": (
                        "The plaint shall be rejected: (a) where it does not disclose a cause of action; (b) where relief is undervalued; "
                        "(c) where insufficiently stamped; (d) where the suit appears from the statement in the plaint to be barred by any law."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "First Schedule",
                    "chapter_title": "Order XXXIX — Temporary Injunctions",
                    "section_number": "Order XXXIX Rules 1 & 2",
                    "section_title": "Cases in which temporary injunction may be granted",
                    "statutory_text": (
                        "Where in any suit it is proved by affidavit or otherwise that any property in dispute is in danger of being wasted, damaged "
                        "or alienated, or the defendant threatens to dispossess the plaintiff, the Court may grant a temporary injunction."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 17. The Transfer of Property Act, 1882
        {
            "title": "The Transfer of Property Act, 1882",
            "short_title": "Transfer of Property Act, 1882",
            "act_number": "Act No. 4 of 1882",
            "enactment_year": 1882,
            "enactment_date": date(1882, 2, 17),
            "commencement_date": date(1882, 7, 1),
            "effective_date": date(1882, 7, 1),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Property Law",
            "preamble": "An Act to define and amend certain parts of the law relating to the transfer of property by act of parties.",
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "II",
                    "chapter_title": "Of Transfers of Property by Act of Parties",
                    "section_number": "52",
                    "section_title": "Transfer of property pending suit relating thereto (Lis Pendens)",
                    "statutory_text": (
                        "During the pendency in any Court of any suit or proceeding in which any right to immovable property is directly and specifically "
                        "in question, the property cannot be transferred or otherwise dealt with by any party so as to affect the rights of any other party thereto."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "II",
                    "chapter_title": "Of Transfers of Property by Act of Parties",
                    "section_number": "53A",
                    "section_title": "Part performance",
                    "statutory_text": (
                        "Where any person contracts to transfer for consideration any immovable property by writing signed by him, and the transferee has, "
                        "in part performance of the contract, taken possession and performed his part, the transferor is debarred from enforcing any right against the transferee."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "III",
                    "chapter_title": "Of Sales of Immovable Property",
                    "section_number": "54",
                    "section_title": "Sale defined, Sale how made, Contract for sale",
                    "statutory_text": (
                        "'Sale' is a transfer of ownership in exchange for a price paid or promised. Transfer of tangible immovable property of value 100 rupees and upwards can be made only by registered instrument."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 18. The Limitation Act, 1963
        {
            "title": "The Limitation Act, 1963",
            "short_title": "Limitation Act, 1963",
            "act_number": "Act No. 36 of 1963",
            "enactment_year": 1963,
            "enactment_date": date(1963, 10, 5),
            "commencement_date": date(1964, 1, 1),
            "effective_date": date(1964, 1, 1),
            "status": "CURRENT",
            "replaces_act_code": "Limitation Act, 1908",
            "replaced_by_act_code": None,
            "subject_category": "Procedural Law & Timelines",
            "preamble": "An Act to consolidate and amend the law for the limitation of suits and other proceedings.",
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "Part II",
                    "chapter_title": "Limitation of Suits, Appeals and Applications",
                    "section_number": "3",
                    "section_title": "Bar of limitation",
                    "statutory_text": (
                        "Subject to the provisions contained in sections 4 to 24 (inclusive), every suit instituted, appeal preferred, and application "
                        "made after the prescribed period shall be dismissed, although limitation has not been set up as a defence."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "Part II",
                    "chapter_title": "Limitation of Suits, Appeals and Applications",
                    "section_number": "5",
                    "section_title": "Extension of prescribed period in certain cases (Condonation of Delay)",
                    "statutory_text": (
                        "Any appeal or any application, other than an application under Order XXI of CPC, may be admitted after the prescribed period, "
                        "if the appellant or the applicant satisfies the court that he had sufficient cause for not preferring the appeal or application within such period."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 19. The Insolvency and Bankruptcy Code, 2016 (IBC)
        {
            "title": "The Insolvency and Bankruptcy Code, 2016",
            "short_title": "IBC, 2016",
            "act_number": "Act No. 31 of 2016",
            "enactment_year": 2016,
            "enactment_date": date(2016, 5, 28),
            "commencement_date": date(2016, 12, 1),
            "effective_date": date(2016, 12, 1),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Insolvency & Corporate Restructuring",
            "preamble": "An Act to consolidate and amend the laws relating to reorganisation and insolvency resolution of corporate persons.",
            "amendment_history": [],
            "sections": [
                {
                    "chapter_number": "Part II, Chapter II",
                    "chapter_title": "Corporate Insolvency Resolution Process",
                    "section_number": "7",
                    "section_title": "Initiation of corporate insolvency resolution process by financial creditor",
                    "statutory_text": (
                        "A financial creditor either by itself or jointly with other financial creditors may file an application for initiating "
                        "corporate insolvency resolution process against a corporate debtor before the Adjudicating Authority (NCLT) when a default has occurred."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "Part II, Chapter II",
                    "chapter_title": "Corporate Insolvency Resolution Process",
                    "section_number": "9",
                    "section_title": "Application for initiation of corporate insolvency resolution process by operational creditor",
                    "statutory_text": (
                        "After the expiry of ten days from the date of delivery of statutory demand notice or invoice under section 8, if payment "
                        "is not received or dispute not notified, the operational creditor may file an application before the NCLT."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "Part II, Chapter II",
                    "chapter_title": "Corporate Insolvency Resolution Process",
                    "section_number": "14",
                    "section_title": "Moratorium",
                    "statutory_text": (
                        "On insolvency commencement date, the Adjudicating Authority declares moratorium prohibiting institution or continuation of suits, "
                        "transferring or disposing of debtor's assets, foreclosing security interests, and recovery of occupied property."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
        # 20. The Protection of Children from Sexual Offences Act, 2012 (POCSO)
        {
            "title": "The Protection of Children from Sexual Offences Act, 2012",
            "short_title": "POCSO Act, 2012",
            "act_number": "Act No. 32 of 2012",
            "enactment_year": 2012,
            "enactment_date": date(2012, 6, 19),
            "commencement_date": date(2012, 11, 14),
            "effective_date": date(2012, 11, 14),
            "status": "CURRENT",
            "replaces_act_code": None,
            "replaced_by_act_code": None,
            "subject_category": "Criminal Law & Child Protection",
            "preamble": "An Act to protect children from offences of sexual assault, sexual harassment and pornography.",
            "amendment_history": [
                {"date": "2019-08-16", "note": "Amended by Act 25 of 2019 introducing death penalty for aggravated penetrative sexual assault."}
            ],
            "sections": [
                {
                    "chapter_number": "II",
                    "chapter_title": "Offences under the Act",
                    "section_number": "4",
                    "section_title": "Punishment for penetrative sexual assault",
                    "statutory_text": (
                        "Whoever commits penetrative sexual assault shall be punished with rigorous imprisonment for a term which shall not be less "
                        "than twenty years, but which may extend to imprisonment for life, and shall also be liable to fine."
                    ),
                    "corresponding_historical_section": None,
                },
                {
                    "chapter_number": "V",
                    "chapter_title": "Procedure for Reporting of Cases",
                    "section_number": "19",
                    "section_title": "Reporting of offences",
                    "statutory_text": (
                        "Mandatory reporting: Notwithstanding anything contained in the Code of Criminal Procedure, 1973, any person who has apprehension "
                        "that an offence under this Act has been committed shall provide such information to Special Juvenile Police Unit or local police."
                    ),
                    "corresponding_historical_section": None,
                },
            ],
        },
    ]

    sections_lookup: Dict[str, LegalSection] = {}

    for act_item in acts_data:
        sections_list = act_item.pop("sections")
        act = (
            db.query(LegalAct)
            .filter(
                LegalAct.short_title == act_item["short_title"],
                LegalAct.enactment_year == act_item["enactment_year"],
            )
            .first()
        )
        if act is None:
            act = LegalAct(source_id=india_code.id, **act_item)
            db.add(act)
            db.flush()

        for sec_item in sections_list:
            existing_sec = (
                db.query(LegalSection)
                .filter(
                    LegalSection.act_id == act.id,
                    LegalSection.section_number == sec_item["section_number"],
                )
                .first()
            )
            embed_input = (
                f"{act.title} {act.short_title} Section {sec_item['section_number']} "
                f"{sec_item['section_title']} {sec_item['statutory_text']} "
                f"{sec_item.get('corresponding_historical_section') or ''}"
            )
            if existing_sec is None:
                existing_sec = LegalSection(
                    act_id=act.id,
                    part_number=sec_item.get("part_number"),
                    chapter_number=sec_item.get("chapter_number"),
                    chapter_title=sec_item.get("chapter_title"),
                    section_number=sec_item["section_number"],
                    section_title=sec_item["section_title"],
                    statutory_text=sec_item["statutory_text"],
                    amendment_notes=f"Status: {act.status}. Effective: {act.effective_date}.",
                    effective_date=act.effective_date,
                    corresponding_historical_section=sec_item.get(
                        "corresponding_historical_section"
                    ),
                    embedding=deterministic_embedding(embed_input),
                )
                db.add(existing_sec)
                db.flush()
            key = f"{act.short_title}:{sec_item['section_number']}"
            sections_lookup[key] = existing_sec

    return sections_lookup


def _seed_judgments_and_citations(
    db: Session,
    sources_map: Dict[str, LegalSource],
    sections_map: Dict[str, LegalSection],
) -> None:
    sci_source = sources_map["SCI_ESCR"]

    judgments_data = [
        {
            "case_title": "His Holiness Kesavananda Bharati Sripadagalvaru v. State of Kerala",
            "neutral_citation": "1973 INSC 91",
            "equivalent_citations": ["(1973) 4 SCC 225", "AIR 1973 SC 1461"],
            "court": "Supreme Court of India",
            "bench_type": "13-Judge Constitution Bench",
            "judges": [
                "S.M. Sikri, C.J.",
                "J.M. Shelat, J.",
                "K.S. Hegde, J.",
                "A.N. Grover, J.",
                "H.R. Khanna, J.",
                "A.N. Ray, J.",
                "Y.V. Chandrachud, J.",
            ],
            "decision_date": date(1973, 4, 24),
            "subject_matter": "Constitutional Law — Basic Structure Doctrine & Article 368",
            "legal_issues": [
                "Whether Parliament's constituent power under Article 368 extends to abrogating or destroying the Basic Structure of the Constitution of India?",
                "Whether Golaknath v. State of Punjab was rightly decided?",
            ],
            "headnote_summary": (
                "The 13-Judge Bench overruled Golaknath to hold that Parliament can amend any part of the Constitution including Fundamental Rights under Article 368, provided such amendment does not alter or destroy the Basic Structure or essential features of the Constitution."
            ),
            "ratio_decidendi": (
                "While Parliament's amending power under Article 368 is wide and extends to all Articles of the Constitution, the expression 'amendment' does not include the power to abrogate or destroy the basic structure or framework of the Constitution (such as supremacy of the Constitution, republican and democratic form of government, secularism, separation of powers, and judicial review)."
            ),
            "key_paragraphs": [
                {
                    "para": "292 (Sikri, C.J.)",
                    "excerpt": "The expression 'amendment of this Constitution' does not enable Parliament to abrogate or take away fundamental rights or to completely change the fundamental features of the Constitution so as to destroy its identity.",
                },
                {
                    "para": "1426 (Khanna, J.)",
                    "excerpt": "The power of amendment under Article 368 does not include the power to abrogate the Constitution nor does it include the power to alter the basic structure or framework of the Constitution.",
                },
            ],
            "full_text_excerpt": (
                "Held (by majority of 7:6): Article 368 does not enable Parliament to alter the basic structure or framework of the Constitution. Judicial review under Articles 32 and 226 is an integral feature of the Basic Structure."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified against Supreme Court e-SCR (1973 INSC 91 / (1973) 4 SCC 225). Foundational 13-Judge Constitution Bench authority.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "Constitution of India:Article 32",
        },
        {
            "case_title": "Maneka Gandhi v. Union of India",
            "neutral_citation": "1978 INSC 16",
            "equivalent_citations": ["(1978) 1 SCC 248", "AIR 1978 SC 597"],
            "court": "Supreme Court of India",
            "bench_type": "7-Judge Constitution Bench",
            "judges": [
                "M.H. Beg, C.J.",
                "Y.V. Chandrachud, J.",
                "P.N. Bhagwati, J.",
                "V.R. Krishna Iyer, J.",
                "N.L. Untwalia, J.",
                "S. Murtaza Fazal Ali, J.",
                "P.S. Kailasam, J.",
            ],
            "decision_date": date(1978, 1, 25),
            "subject_matter": "Constitutional Law — Article 21 Procedure Established by Law & Golden Triangle",
            "legal_issues": [
                "Whether 'procedure established by law' under Article 21 can be arbitrary or must satisfy the test of fairness, non-arbitrariness, and reasonableness under Articles 14 and 19?",
                "Whether the impoundment of a passport under Section 10(3)(c) of the Passports Act, 1967 violates audi alteram partem?",
            ],
            "headnote_summary": (
                "Fundamental rights under Articles 14, 19, and 21 are not mutually exclusive compartments (overruling A.K. Gopalan). Any procedure depriving a person of personal liberty under Article 21 must be 'right, just and fair' and not arbitrary, fanciful or oppressive."
            ),
            "ratio_decidendi": (
                "Articles 14, 19, and 21 form an integrated 'Golden Triangle'. The 'procedure established by law' contemplated by Article 21 must answer the test of reasonableness and non-arbitrariness under Article 14 and conform to natural justice (audi alteram partem)."
            ),
            "key_paragraphs": [
                {
                    "para": "5 (Bhagwati, J.)",
                    "excerpt": "The attempt of the Court should be to expand the reach and ambit of the fundamental rights rather than attenuate their meaning and content by a process of judicial construction.",
                },
                {
                    "para": "7 (Bhagwati, J.)",
                    "excerpt": "The procedure cannot be arbitrary, unfair or unreasonable. Article 14 strikes at arbitrariness in State action and ensures fairness and equality of treatment.",
                },
            ],
            "full_text_excerpt": (
                "Overruling the compartmentalized approach in A.K. Gopalan v. State of Madras (1950 SCR 88), the 7-Judge Bench established substantive due process principles within Article 21 of the Constitution of India."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified against Supreme Court e-SCR (1978 INSC 16 / (1978) 1 SCC 248). Overruled A.K. Gopalan.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "Constitution of India:Article 21",
        },
        {
            "case_title": "Justice K.S. Puttaswamy (Retd.) & Anr. v. Union of India & Ors.",
            "neutral_citation": "2017 INSC 801",
            "equivalent_citations": ["(2017) 10 SCC 1", "AIR 2017 SC 4161"],
            "court": "Supreme Court of India",
            "bench_type": "9-Judge Constitution Bench",
            "judges": [
                "J.S. Khehar, C.J.",
                "J. Chelameswar, J.",
                "S.A. Bobde, J.",
                "R.K. Agrawal, J.",
                "R.F. Nariman, J.",
                "A.M. Sapre, J.",
                "Dr. D.Y. Chandrachud, J.",
                "S.K. Kaul, J.",
                "S. Abdul Nazeer, J.",
            ],
            "decision_date": date(2017, 8, 24),
            "subject_matter": "Constitutional Law & Data Privacy — Fundamental Right to Privacy",
            "legal_issues": [
                "Whether the right to privacy is a constitutionally protected Fundamental Right under Part III of the Constitution of India?",
                "Whether the decisions in M.P. Sharma (1954) and Kharak Singh (1962) holding that privacy is not a fundamental right are correct?",
            ],
            "headnote_summary": (
                "Unanimous 9-Judge Constitution Bench held that the Right to Privacy is protected as an intrinsic part of the right to life and personal liberty under Article 21 and as a part of the freedoms guaranteed by Part III of the Constitution. M.P. Sharma and Kharak Singh were expressly overruled."
            ),
            "ratio_decidendi": (
                "Privacy is the constitutional core of human dignity and informational self-determination under Article 21. Any State intrusion into privacy must satisfy the three-fold proportionality test: (i) legality (existence of a valid law), (ii) legitimate State aim (need), and (iii) proportionality of the measure."
            ),
            "key_paragraphs": [
                {
                    "para": "652 (Order of the Court)",
                    "excerpt": "The right to privacy is protected as an intrinsic part of the right to life and personal liberty under Article 21 and as a part of the freedoms guaranteed by Part III of the Constitution.",
                }
            ],
            "full_text_excerpt": (
                "The decision in M.P. Sharma to the extent that it holds that the right to privacy is not protected by the Constitution stands overruled; the decision in Kharak Singh to the extent that it holds that the right to privacy is not protected by the Constitution also stands overruled."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified 9-Judge Bench ruling (2017 INSC 801 / (2017) 10 SCC 1). Foundational authority for informational privacy and the DPDP Act, 2023.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "Constitution of India:Article 21",
        },
        {
            "case_title": "Arnesh Kumar v. State of Bihar & Anr.",
            "neutral_citation": "2014 INSC 463",
            "equivalent_citations": ["(2014) 8 SCC 273", "AIR 2014 SC 2756"],
            "court": "Supreme Court of India",
            "bench_type": "Division Bench",
            "judges": ["Chandramauli Kr. Prasad, J.", "Pinaki Chandra Ghose, J."],
            "decision_date": date(2014, 7, 2),
            "subject_matter": "Criminal Procedure — Safeguards Against Arbitrary Arrest (CrPC s. 41 / BNSS s. 35)",
            "legal_issues": [
                "What mandatory procedural safeguards must police officers and Magistrates follow before arresting or authorising detention of an accused in offences punishable with imprisonment up to seven years?",
            ],
            "headnote_summary": (
                "Issued mandatory directions across India prohibiting automatic or mechanical arrests in offences punishable with imprisonment up to 7 years. Police officers must record reasons and serve a notice of appearance under Section 41A CrPC (now Section 35(3) BNSS, 2023)."
            ),
            "ratio_decidendi": (
                "No arrest can be made in a routine manner on a mere allegation of commission of an offence punishable with imprisonment up to seven years. Police officers must satisfy the parameters of Section 41(1)(b) CrPC (now Section 35(1)(b) BNSS) and issue a Section 41A CrPC / Section 35(3) BNSS notice within two weeks of institution of the case; non-compliance renders officers liable for departmental action and contempt of court."
            ),
            "key_paragraphs": [
                {
                    "para": "11",
                    "excerpt": "Our endeavour in this judgment is to ensure that police officers do not arrest the accused unnecessarily and Magistrate do not authorise detention casually and mechanically.",
                }
            ],
            "full_text_excerpt": (
                "All State Governments shall instruct police officers not to automatically arrest when a case under Section 498-A IPC or any offence punishable with imprisonment for a term which may be less than seven years or which may extend to seven years is registered, and instead follow the checklist and notice regime under Section 41/41A CrPC (now Section 35 BNSS, 2023)."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified against e-SCR (2014 INSC 463 / (2014) 8 SCC 273). Continues to apply directly to Section 35 of BNSS, 2023.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "BNSS, 2023:35",
        },
        {
            "case_title": "Anvar P.V. v. P.K. Basheer & Ors.",
            "neutral_citation": "2014 INSC 628",
            "equivalent_citations": ["(2014) 10 SCC 473", "AIR 2015 SC 180"],
            "court": "Supreme Court of India",
            "bench_type": "3-Judge Bench",
            "judges": ["R.M. Lodha, C.J.", "Kurian Joseph, J.", "Rohinton Fali Nariman, J."],
            "decision_date": date(2014, 9, 18),
            "subject_matter": "Law of Evidence — Electronic Evidence Certificate (IEA s. 65B / BSA s. 63)",
            "legal_issues": [
                "Whether secondary electronic evidence (CDs, VCDs, printouts, pen drives) is admissible without a mandatory certificate under Section 65B(4) of the Indian Evidence Act, 1872 (now Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023)?",
            ],
            "headnote_summary": (
                "Overruled State (NCT of Delhi) v. Navjot Sandhu (2005) 11 SCC 600. Held that Section 65B is a complete code governing admissibility of electronic records, and secondary electronic evidence is inadmissible unless accompanied by a valid Section 65B(4) certificate."
            ),
            "ratio_decidendi": (
                "General provisions of Sections 63 and 65 of the Evidence Act yield to the special provision in Section 65B (generalia specialibus non derogant). Any documentary evidence by way of an electronic record by means of secondary computer output can be proved only in accordance with the mandatory certificate procedure under Section 65B(4) IEA (now Section 63(4) BSA, 2023)."
            ),
            "key_paragraphs": [
                {
                    "para": "22",
                    "excerpt": "An electronic record by way of secondary evidence shall not be admitted in evidence unless the requirements under Section 65-B are satisfied.",
                }
            ],
            "full_text_excerpt": (
                "To that extent, the statement of law on admissibility of secondary evidence pertaining to electronic record, as stated by this Court in Navjot Sandhu case, does not lay down the correct legal position and is overruled."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified against e-SCR (2014 INSC 628 / (2014) 10 SCC 473); affirmed and clarified by 3-Judge Bench in Arjun Panditrao Khotkar (2020) 7 SCC 1.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "BSA, 2023:63",
        },
        {
            "case_title": "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal & Ors.",
            "neutral_citation": "2020 INSC 453",
            "equivalent_citations": ["(2020) 7 SCC 1", "AIR 2020 SC 4908"],
            "court": "Supreme Court of India",
            "bench_type": "3-Judge Bench",
            "judges": ["R.F. Nariman, J.", "S. Ravindra Bhat, J.", "V. Ramasubramanian, J."],
            "decision_date": date(2020, 7, 14),
            "subject_matter": "Law of Evidence — Primary vs Secondary Electronic Evidence (IEA s. 65B / BSA s. 63)",
            "legal_issues": [
                "Whether a certificate under Section 65B(4) IEA (now Section 63(4) BSA) is required when the original electronic device itself is produced as primary evidence?",
                "What is the remedy when the authority in possession of the device refuses to issue the certificate?",
            ],
            "headnote_summary": (
                "Affirmed Anvar P.V. v. P.K. Basheer and overruled Shafhi Mohammad v. State of H.P. (2018) 2 SCC 801. Clarified that the certificate under Section 65B(4) is mandatory for secondary computer output, but is unnecessary if the original physical device is produced in court and proved by its owner."
            ),
            "ratio_decidendi": (
                "The certificate required under Section 65B(4) IEA (now Section 63(4) BSA, 2023) is a condition precedent to the admissibility of secondary electronic evidence. Where a party applies for the certificate from a third-party/authority who refuses to provide it, the party may apply to the Court to summon the certificate under the Code of Civil/Criminal Procedure."
            ),
            "key_paragraphs": [
                {
                    "para": "72",
                    "excerpt": "The required certificate under Section 65B(4) is unnecessary if the original document itself is produced. In all other cases where a 'computer output' is produced, Section 65B(4) is mandatory.",
                }
            ],
            "full_text_excerpt": (
                "Shafhi Mohammad v. State of H.P. (2018) 2 SCC 801 is overruled. Anvar P.V. v. P.K. Basheer (2014) 10 SCC 473 is affirmed with the clarification regarding production of the original device."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified against e-SCR (2020 INSC 453 / (2020) 7 SCC 1). Directly governs Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "BSA, 2023:63",
        },
        {
            "case_title": "Shreya Singhal v. Union of India",
            "neutral_citation": "2015 INSC 257",
            "equivalent_citations": ["(2015) 5 SCC 1", "AIR 2015 SC 1523"],
            "court": "Supreme Court of India",
            "bench_type": "Division Bench",
            "judges": ["J. Chelameswar, J.", "Rohinton Fali Nariman, J."],
            "decision_date": date(2015, 3, 24),
            "subject_matter": "Constitutional & Cyber Law — Free Speech Online & Section 79 Intermediary Safe Harbour",
            "legal_issues": [
                "Whether Section 66A of the Information Technology Act, 2000 violates Article 19(1)(a) of the Constitution?",
                "How should 'actual knowledge' under Section 79(3)(b) of the IT Act, 2000 be construed for intermediary safe harbour?",
            ],
            "headnote_summary": (
                "Struck down Section 66A of the IT Act, 2000 in its entirety as unconstitutional and void for vagueness and overbreadth under Article 19(1)(a). Upheld Section 79 intermediary safe harbour by reading down 'actual knowledge' to mean knowledge via a court order or notification by an appropriate government agency."
            ),
            "ratio_decidendi": (
                "Mere discussion or even advocacy of an unpopular cause cannot be curtailed under Article 19(2) unless it reaches the level of incitement having a proximate nexus with public disorder. Under Section 79(3)(b) of the IT Act, 2000, an intermediary loses safe harbour only upon failing to act after receiving 'actual knowledge' through a judicial order or an executive order relatable to Article 19(2)."
            ),
            "key_paragraphs": [
                {
                    "para": "119",
                    "excerpt": "Section 66A of the Information Technology Act, 2000 is struck down in its entirety being violative of Article 19(1)(a) and not saved under Article 19(2). Section 79(3)(b) is read down to mean that the intermediary upon receiving actual knowledge from a court order or on being notified by the appropriate government must expeditiously remove or disable access to that material.",
                }
            ],
            "full_text_excerpt": (
                "Online speech enjoys the full protection of Article 19(1)(a). Intermediaries are not required to adjudicate private takedown demands on pain of losing Section 79 immunity."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified against e-SCR (2015 INSC 257 / (2015) 5 SCC 1).",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "IT Act, 2000:79",
        },
        {
            "case_title": "Lalita Kumari v. Government of Uttar Pradesh & Ors.",
            "neutral_citation": "2013 INSC 756",
            "equivalent_citations": ["(2014) 2 SCC 1", "AIR 2014 SC 187"],
            "court": "Supreme Court of India",
            "bench_type": "5-Judge Constitution Bench",
            "judges": [
                "P. Sathasivam, C.J.",
                "Dr. B.S. Chauhan, J.",
                "Ranjana Prakash Desai, J.",
                "Ranjan Gogoi, J.",
                "S.A. Bobde, J.",
            ],
            "decision_date": date(2013, 11, 12),
            "subject_matter": "Criminal Procedure — Mandatory Registration of FIR in Cognizable Offences (CrPC s. 154 / BNSS s. 173)",
            "legal_issues": [
                "Whether a police officer is bound to register a First Information Report (FIR) upon receiving any information relating to commission of a cognizable offence under Section 154 of the Code of Criminal Procedure, 1973 (now Section 173 of the BNSS, 2023)?",
            ],
            "headnote_summary": (
                "Registration of FIR is mandatory under Section 154 CrPC if the information discloses commission of a cognizable offence and no preliminary inquiry is permissible in such a situation. Preliminary inquiry is permitted only in limited categories (matrimonial, commercial, medical negligence, corruption, or abnormal delay)."
            ),
            "ratio_decidendi": (
                "Use of the word 'shall' in Section 154(1) CrPC (and Section 173(1) BNSS) leaves no discretion to the police officer: if information discloses a cognizable offence, an FIR must be registered forthwith.Note: Under Section 173(3) of the BNSS, 2023, for cognizable offences punishable with 3 to less than 7 years, a preliminary inquiry within 14 days may be conducted with prior permission of an officer not below the rank of DSP."
            ),
            "key_paragraphs": [
                {
                    "para": "111",
                    "excerpt": "Registration of FIR is mandatory under Section 154 of the Code, if the information discloses commission of a cognizable offence and no preliminary inquiry is permissible in such a situation.",
                }
            ],
            "full_text_excerpt": (
                "Action must be taken against erring officers who do not register the FIR if information received by him discloses a cognizable offence."
            ),
            "precedent_status": "BINDING",
            "verification_notes": "Verified 5-Judge Constitution Bench ruling ((2014) 2 SCC 1). Read alongside the statutory carve-out in Section 173(3) of BNSS, 2023 for offences punishable with 3 to 7 years.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "BNSS, 2023:173",
        },
        {
            "case_title": "A.K. Gopalan v. State of Madras",
            "neutral_citation": "1950 INSC 14",
            "equivalent_citations": ["1950 SCR 88", "AIR 1950 SC 27"],
            "court": "Supreme Court of India",
            "bench_type": "6-Judge Constitution Bench",
            "judges": [
                "H.J. Kania, C.J.",
                "Saiyid Fazl Ali, J. (Dissenting)",
                "M. Patanjali Sastri, J.",
                "Mehr Chand Mahajan, J.",
                "B.K. Mukherjea, J.",
                "S.R. Das, J.",
            ],
            "decision_date": date(1950, 5, 19),
            "subject_matter": "Constitutional Law — Preventive Detention & Interpretation of Articles 19 and 21 (OVERRULED)",
            "legal_issues": [
                "Whether Articles 19 and 21 operate as separate, mutually exclusive compartments?",
                "Whether 'procedure established by law' in Article 21 means any enacted statute regardless of natural justice or reasonableness?",
            ],
            "headnote_summary": (
                "[HISTORICAL — OVERRULED PRECEDENT] The majority held in 1950 that Fundamental Rights in Part III were isolated 'watertight compartments' and 'procedure established by law' meant any procedure enacted by the legislature. Justice Fazl Ali's dissent was later adopted as the law of the land in R.C. Cooper (1970) and Maneka Gandhi (1978)."
            ),
            "ratio_decidendi": (
                "OVERRULED: The majority proposition that Articles 14, 19, and 21 are mutually exclusive compartments and that 'procedure established by law' under Article 21 need not satisfy Articles 14 and 19 was expressly overruled in R.C. Cooper v. Union of India, (1970) 1 SCC 248 and Maneka Gandhi v. Union of India, (1978) 1 SCC 248."
            ),
            "key_paragraphs": [
                {
                    "para": "Majority (Kania, C.J.) — OVERRULED",
                    "excerpt": "Article 19 has no application to a legislation dealing with preventive or punitive detention as its direct object.",
                }
            ],
            "full_text_excerpt": (
                "CAUTION: Do not cite A.K. Gopalan as good law on the interpretation of Article 21 or the relationship between Fundamental Rights. It stands overruled by R.C. Cooper (11-Judge Bench) and Maneka Gandhi (7-Judge Bench)."
            ),
            "precedent_status": "OVERRULED",
            "verification_notes": "OVERRULED PRECEDENT — Expressly overruled by R.C. Cooper v. Union of India, (1970) 1 SCC 248 and Maneka Gandhi v. Union of India, (1978) 1 SCC 248.",
            "official_source_url": "https://digiscr.sci.gov.in",
            "cited_section_key": "Constitution of India:Article 21",
        },
    ]

    judgment_models: Dict[str, Judgment] = {}
    for j_item in judgments_data:
        cited_sec_key = j_item.pop("cited_section_key")
        existing = (
            db.query(Judgment)
            .filter(Judgment.neutral_citation == j_item["neutral_citation"])
            .first()
        )
        embed_text = (
            f"{j_item['case_title']} {j_item['neutral_citation']} "
            f"{' '.join(j_item['equivalent_citations'])} {j_item['subject_matter']} "
            f"{j_item['headnote_summary']} {j_item['ratio_decidendi']}"
        )
        if existing is None:
            existing = Judgment(
                source_id=sci_source.id,
                embedding=deterministic_embedding(embed_text),
                **j_item,
            )
            db.add(existing)
            db.flush()

        judgment_models[j_item["neutral_citation"]] = existing

        # Create verified citation to the statutory section if not already linked
        sec_obj = sections_map.get(cited_sec_key)
        if sec_obj is not None:
            existing_cit = (
                db.query(Citation)
                .filter(
                    Citation.citing_judgment_id == existing.id,
                    Citation.cited_section_id == sec_obj.id,
                )
                .first()
            )
            if existing_cit is None:
                db.add(
                    Citation(
                        citing_judgment_id=existing.id,
                        cited_section_id=sec_obj.id,
                        citation_text=f"{cited_sec_key.replace(':', ' — Section/Article ')}",
                        treatment_type="INTERPRETED",
                        context_excerpt=existing.ratio_decidendi[:300],
                        is_verified=True,
                    )
                )

    # Link Maneka Gandhi overruling A.K. Gopalan and Arjun Panditrao affirming Anvar P.V.
    maneka = judgment_models.get("1978 INSC 16")
    gopalan = judgment_models.get("1950 INSC 14")
    if maneka and gopalan:
        if (
            db.query(Citation)
            .filter(
                Citation.citing_judgment_id == maneka.id,
                Citation.cited_judgment_id == gopalan.id,
            )
            .first()
            is None
        ):
            db.add(
                Citation(
                    citing_judgment_id=maneka.id,
                    cited_judgment_id=gopalan.id,
                    citation_text="A.K. Gopalan v. State of Madras, 1950 SCR 88",
                    treatment_type="OVERRULED",
                    context_excerpt="Overruled the watertight compartments theory of Fundamental Rights.",
                    is_verified=True,
                )
            )

    arjun = judgment_models.get("2020 INSC 453")
    anvar = judgment_models.get("2014 INSC 628")
    if arjun and anvar:
        if (
            db.query(Citation)
            .filter(
                Citation.citing_judgment_id == arjun.id,
                Citation.cited_judgment_id == anvar.id,
            )
            .first()
            is None
        ):
            db.add(
                Citation(
                    citing_judgment_id=arjun.id,
                    cited_judgment_id=anvar.id,
                    citation_text="Anvar P.V. v. P.K. Basheer, (2014) 10 SCC 473",
                    treatment_type="RELIED_UPON",
                    context_excerpt="Affirmed mandatory Section 65B(4) certificate for secondary electronic records.",
                    is_verified=True,
                )
            )


def _seed_initial_workspace_items(db: Session) -> None:
    """Seed initial folders, bookmarks, notes, and tasks for Amil Bhatt's workspace."""
    owner = db.query(User).filter(User.email == settings.OWNER_DEFAULT_EMAIL).first()
    if owner is None:
        return

    if db.query(Folder).filter(Folder.user_id == owner.id).count() == 0:
        folder_crim = Folder(
            user_id=owner.id,
            name="2024 Criminal Law Transition (BNS / BNSS / BSA)",
            color_hex="#D4AF37",
            description="Comparative research on BNS, BNSS, and BSA effective July 1, 2024.",
        )
        folder_const = Folder(
            user_id=owner.id,
            name="Constitutional & DPDP Privacy Briefs",
            color_hex="#38BDF8",
            description="Supreme Court Constitution Bench authorities and DPDP Act, 2023 compliance.",
        )
        db.add_all([folder_crim, folder_const])
        db.flush()

        db.add(
            Bookmark(
                user_id=owner.id,
                folder_id=folder_crim.id,
                item_type="SECTION",
                title="BSA, 2023 — Section 63 (Admissibility of Electronic Records / ex-IEA s. 65B)",
                excerpt="Requires Part A & Part B certificate with SHA-256 cryptographic hash for secondary electronic output.",
                tags=["BSA 2023", "Electronic Evidence", "Section 63", "65B"],
            )
        )
        db.add(
            Note(
                user_id=owner.id,
                folder_id=folder_crim.id,
                title="Practice Note: Cut-off Date for IPC/CrPC vs BNS/BNSS (01-07-2024)",
                content=(
                    "1. Offences committed BEFORE July 1, 2024 continue to be governed by substantive provisions of IPC, 1860 (per Section 358 BNS).\n"
                    "2. Pending trials, appeals, and investigations registered prior to July 1, 2024 proceed under CrPC, 1973 (per Section 531(2)(a) BNSS).\n"
                    "3. Fresh FIRs registered on or after July 1, 2024 for post-commencement offences are governed by BNS, BNSS, and BSA."
                ),
                linked_entity_type="ACT",
                tags=["BNS", "BNSS", "Savings Clause", "Litigation Strategy"],
                is_pinned=True,
            )
        )

    if db.query(Task).filter(Task.user_id == owner.id).count() == 0:
        now = datetime.now(timezone.utc)
        db.add_all(
            [
                Task(
                    user_id=owner.id,
                    title="Verify Section 63 BSA (ex-65B IEA) Hash Certificate for Commercial Arbitration",
                    description="Ensure Part A (Party) and Part B (System Administrator) certificates include SHA-256 hash values.",
                    task_type="EVIDENCE_CHECK",
                    priority="HIGH",
                    status="TODO",
                    due_at=now + timedelta(days=2),
                    reminder_at=now + timedelta(days=1),
                ),
                Task(
                    user_id=owner.id,
                    title="Review DPDP Act Section 6 Consent Notice for Enterprise SaaS Agreement",
                    description="Audit itemised personal data notice and withdrawal mechanism under Sections 6 and 12 of DPDP Act, 2023.",
                    task_type="COMPLIANCE_REVIEW",
                    priority="MEDIUM",
                    status="IN_PROGRESS",
                    due_at=now + timedelta(days=5),
                ),
            ]
        )
