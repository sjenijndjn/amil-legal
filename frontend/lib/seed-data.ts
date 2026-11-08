import {
  AuditHistoryEntry,
  Conversation,
  Judgment,
  LegalAct,
  LegalDocument,
  LegalDraft,
  LegalSection,
  LegalSource,
  LegalTask,
  LibraryBookmark,
  LibraryFolder,
  LibraryNote,
  UserProfile
} from "./types";

export const SEED_USER_PROFILE: UserProfile = {
  id: "u-amil-0001",
  user_id: "u-amil-0001",
  email: "amil@amillegal.in",
  role: "owner",
  display_name: "Amil",
  avatar_url: null,
  preferred_theme: "dark",
  preferred_language: "en-IN",
  ai_response_style: "detailed",
  saved_legal_topics: [
    "Constitutional Law & Fundamental Rights",
    "Criminal Law Transition (BNS / BNSS / BSA 2023)",
    "Commercial & Contract Dispute Resolution",
    "Digital Personal Data Protection (DPDP Act 2023)",
    "Electronic Evidence & Cyber Jurisprudence"
  ],
  ai_document_consent: true,
  research_preferences: {
    default_jurisdiction: "Republic of India (Supreme Court & High Courts)",
    include_historical_comparison: true,
    citation_format: "INSC Neutral Citation + SCC Equivalent"
  },
  workspace_settings: {
    compact_density: false,
    auto_save_drafts: true
  },
  created_at: "2025-01-01T09:00:00Z",
  updated_at: "2025-02-20T14:30:00Z"
};

export const SEED_LEGAL_SOURCES: LegalSource[] = [
  {
    id: "src-indiacode",
    code: "INDIA_CODE",
    name: "India Code Digital Repository (Legislative Department, Ministry of Law & Justice)",
    source_type: "STATUTORY",
    jurisdiction: "Union of India",
    official_url: "https://www.indiacode.nic.in",
    is_verified_repository: true,
    last_synced_at: "2025-02-24T06:00:00Z"
  },
  {
    id: "src-sci-escr",
    code: "SCI_ESCR",
    name: "Supreme Court of India — Digital SCR (e-SCR) & Neutral Citation Portal",
    source_type: "JUDICIAL",
    jurisdiction: "Supreme Court of India",
    official_url: "https://digiscr.sci.gov.in",
    is_verified_repository: true,
    last_synced_at: "2025-02-24T06:30:00Z"
  },
  {
    id: "src-hc-portal",
    code: "HIGH_COURTS",
    name: "High Courts of India Judgment Information System",
    source_type: "JUDICIAL",
    jurisdiction: "High Courts (Delhi, Bombay, Madras, Calcutta, Karnataka & others)",
    official_url: "https://judgments.ecourts.gov.in",
    is_verified_repository: true,
    last_synced_at: "2025-02-24T05:15:00Z"
  },
  {
    id: "src-ecourts",
    code: "ECOURTS",
    name: "eCourts Services Portal (e-Committee, Supreme Court of India)",
    source_type: "ECOURTS",
    jurisdiction: "All India District & Subordinate Judiciary",
    official_url: "https://services.ecourts.gov.in",
    is_verified_repository: true,
    last_synced_at: "2025-02-24T04:45:00Z"
  }
];

export const SEED_LEGAL_ACTS: LegalAct[] = [
  {
    id: "act-bns-2023",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Bharatiya Nyaya Sanhita, 2023",
    short_title: "BNS 2023",
    act_number: "Act No. 45 of 2023",
    enactment_year: 2023,
    enactment_date: "2023-12-25",
    commencement_date: "2024-07-01",
    effective_date: "2024-07-01",
    status: "CURRENT",
    replaces_act_code: "IPC 1860",
    replaced_by_act_code: null,
    subject_category: "Criminal Substantive Law",
    preamble:
      "An Act to consolidate and amend the provisions relating to offences and for matters connected therewith or incidental thereto.",
    amendment_history: [
      {
        year: 2024,
        note: "S.O. 850(E) dated 23rd February, 2024 appointed 1st July, 2024 as the date on which the provisions of the BNS (except Section 106(2)) came into force."
      }
    ],
    sections_count: 358,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-bnss-2023",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Bharatiya Nagarik Suraksha Sanhita, 2023",
    short_title: "BNSS 2023",
    act_number: "Act No. 46 of 2023",
    enactment_year: 2023,
    enactment_date: "2023-12-25",
    commencement_date: "2024-07-01",
    effective_date: "2024-07-01",
    status: "CURRENT",
    replaces_act_code: "CrPC 1973",
    replaced_by_act_code: null,
    subject_category: "Criminal Procedural Law",
    preamble:
      "An Act to consolidate and amend the law relating to Criminal Procedure.",
    amendment_history: [
      {
        year: 2024,
        note: "Brought into force with effect from 1st July, 2024 via Gazette Notification S.O. 848(E), modernizing FIR registration (Zero FIR & e-FIR), forensic mandates, and timeline-bound trials."
      }
    ],
    sections_count: 531,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-bsa-2023",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Bharatiya Sakshya Adhiniyam, 2023",
    short_title: "BSA 2023",
    act_number: "Act No. 47 of 2023",
    enactment_year: 2023,
    enactment_date: "2023-12-25",
    commencement_date: "2024-07-01",
    effective_date: "2024-07-01",
    status: "CURRENT",
    replaces_act_code: "IEA 1872",
    replaced_by_act_code: null,
    subject_category: "Law of Evidence",
    preamble:
      "An Act to consolidate and to provide for general rules and principles of evidence for fair trial.",
    amendment_history: [
      {
        year: 2024,
        note: "Effective from 1st July, 2024 via S.O. 849(E); expands definition of documents to include electronic and digital records as primary evidence under Section 57 and admissibility under Section 63."
      }
    ],
    sections_count: 170,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-coi-1950",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Constitution of India",
    short_title: "Constitution of India",
    act_number: "Constituent Assembly 1949",
    enactment_year: 1949,
    enactment_date: "1949-11-26",
    commencement_date: "1950-01-26",
    effective_date: "1950-01-26",
    status: "CURRENT",
    replaces_act_code: null,
    replaced_by_act_code: null,
    subject_category: "Constitutional Law",
    preamble:
      "WE, THE PEOPLE OF INDIA, having solemnly resolved to constitute India into a SOVEREIGN SOCIALIST SECULAR DEMOCRATIC REPUBLIC and to secure to all its citizens: JUSTICE, LIBERTY, EQUALITY, and FRATERNITY.",
    amendment_history: [
      {
        year: 2023,
        note: "Updated through the Constitution (One Hundred and Sixth Amendment) Act, 2023."
      }
    ],
    sections_count: 395,
    official_url: "https://legislative.gov.in/constitution-of-india/"
  },
  {
    id: "act-dpdp-2023",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Digital Personal Data Protection Act, 2023",
    short_title: "DPDP Act 2023",
    act_number: "Act No. 22 of 2023",
    enactment_year: 2023,
    enactment_date: "2023-08-11",
    commencement_date: "2023-08-11",
    effective_date: "2023-08-11",
    status: "CURRENT",
    replaces_act_code: null,
    replaced_by_act_code: null,
    subject_category: "Data Privacy & Technology Law",
    preamble:
      "An Act to provide for the processing of digital personal data in a manner that recognises both the right of individuals to protect their personal data and the need to process such personal data for lawful purposes.",
    amendment_history: [
      {
        year: 2023,
        note: "Received Presidential Assent on 11th August, 2023 (CG-DL-E-12082023-248045)."
      }
    ],
    sections_count: 44,
    official_url: "https://www.meity.gov.in"
  },
  {
    id: "act-it-2000",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Information Technology Act, 2000",
    short_title: "IT Act 2000",
    act_number: "Act No. 21 of 2000",
    enactment_year: 2000,
    enactment_date: "2000-06-09",
    commencement_date: "2000-10-17",
    effective_date: "2000-10-17",
    status: "CURRENT",
    replaces_act_code: null,
    replaced_by_act_code: null,
    subject_category: "Cyber & Information Technology Law",
    preamble:
      "An Act to provide legal recognition for transactions carried out by means of electronic data interchange and other means of electronic communication.",
    amendment_history: [
      { year: 2008, note: "Information Technology (Amendment) Act, 2008 (Act 10 of 2009)." },
      { year: 2023, note: "Section 43A omitted prospectively upon commencement of DPDP Act provisions." }
    ],
    sections_count: 90,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-cpa-2019",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Consumer Protection Act, 2019",
    short_title: "Consumer Protection Act 2019",
    act_number: "Act No. 35 of 2019",
    enactment_year: 2019,
    enactment_date: "2019-08-09",
    commencement_date: "2020-07-20",
    effective_date: "2020-07-20",
    status: "CURRENT",
    replaces_act_code: "Consumer Protection Act 1986",
    replaced_by_act_code: null,
    subject_category: "Consumer & Commercial Law",
    preamble:
      "An Act to provide for protection of the interests of consumers and for the said purpose, to establish authorities for timely and effective administration and settlement of consumers' disputes.",
    amendment_history: [
      { year: 2020, note: "Entered into force on 20th July, 2020 establishing CCPA and e-commerce liability rules." }
    ],
    sections_count: 107,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-contract-1872",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Indian Contract Act, 1872",
    short_title: "Indian Contract Act 1872",
    act_number: "Act No. 9 of 1872",
    enactment_year: 1872,
    enactment_date: "1872-04-25",
    commencement_date: "1872-09-01",
    effective_date: "1872-09-01",
    status: "CURRENT",
    replaces_act_code: null,
    replaced_by_act_code: null,
    subject_category: "Commercial & Contract Law",
    preamble:
      "Whereas it is expedient to define and amend certain parts of the law relating to contracts.",
    amendment_history: [
      { year: 1997, note: "Section 28 amended by Act 1 of 1997 and Act 4 of 2013 regarding agreements in restraint of legal proceedings." }
    ],
    sections_count: 266,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-companies-2013",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository",
    title: "The Companies Act, 2013",
    short_title: "Companies Act 2013",
    act_number: "Act No. 18 of 2013",
    enactment_year: 2013,
    enactment_date: "2013-08-29",
    commencement_date: "2013-09-12",
    effective_date: "2014-04-01",
    status: "CURRENT",
    replaces_act_code: "Companies Act 1956",
    replaced_by_act_code: null,
    subject_category: "Corporate & Commercial Law",
    preamble:
      "An Act to consolidate and amend the law relating to companies.",
    amendment_history: [
      { year: 2020, note: "Companies (Amendment) Act, 2020 decriminalizing technical procedural defaults." }
    ],
    sections_count: 470,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-ipc-1860",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository (Historical Archive)",
    title: "The Indian Penal Code, 1860",
    short_title: "IPC 1860",
    act_number: "Act No. 45 of 1860",
    enactment_year: 1860,
    enactment_date: "1860-10-06",
    commencement_date: "1862-01-01",
    effective_date: "1862-01-01",
    status: "HISTORICAL",
    replaces_act_code: null,
    replaced_by_act_code: "BNS 2023",
    subject_category: "Criminal Substantive Law (Historical)",
    preamble:
      "Whereas it is expedient to provide a general Penal Code for India (Repealed w.e.f. 01-07-2024 by Section 358 of the Bharatiya Nyaya Sanhita, 2023, subject to savings for prior offences).",
    amendment_history: [
      {
        year: 2024,
        note: "Repealed w.e.f. July 1, 2024 by Section 358 of BNS 2023; continues to govern offences committed prior to July 1, 2024 under Section 358(2) savings clause."
      }
    ],
    sections_count: 511,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-crpc-1973",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository (Historical Archive)",
    title: "The Code of Criminal Procedure, 1973",
    short_title: "CrPC 1973",
    act_number: "Act No. 2 of 1974",
    enactment_year: 1974,
    enactment_date: "1974-01-25",
    commencement_date: "1974-04-01",
    effective_date: "1974-04-01",
    status: "HISTORICAL",
    replaces_act_code: "CrPC 1898",
    replaced_by_act_code: "BNSS 2023",
    subject_category: "Criminal Procedural Law (Historical)",
    preamble:
      "An Act to consolidate and amend the law relating to Criminal Procedure (Repealed w.e.f. 01-07-2024 by Section 531 of BNSS 2023, with savings for pending trials/investigations initiated before 01-07-2024).",
    amendment_history: [
      {
        year: 2024,
        note: "Repealed w.e.f. July 1, 2024 by Section 531 of BNSS 2023; pending investigations and trials registered prior to 01-07-2024 governed by Section 531(2) savings clause."
      }
    ],
    sections_count: 484,
    official_url: "https://www.indiacode.nic.in"
  },
  {
    id: "act-iea-1872",
    source_id: "src-indiacode",
    source_name: "India Code Digital Repository (Historical Archive)",
    title: "The Indian Evidence Act, 1872",
    short_title: "IEA 1872",
    act_number: "Act No. 1 of 1872",
    enactment_year: 1872,
    enactment_date: "1872-03-15",
    commencement_date: "1872-09-01",
    effective_date: "1872-09-01",
    status: "HISTORICAL",
    replaces_act_code: null,
    replaced_by_act_code: "BSA 2023",
    subject_category: "Law of Evidence (Historical)",
    preamble:
      "Whereas it is expedient to consolidate, define and amend the law of Evidence (Repealed w.e.f. 01-07-2024 by Section 170 of BSA 2023, subject to savings).",
    amendment_history: [
      {
        year: 2024,
        note: "Repealed w.e.f. July 1, 2024 by Section 170 of the Bharatiya Sakshya Adhiniyam, 2023."
      }
    ],
    sections_count: 167,
    official_url: "https://www.indiacode.nic.in"
  }
];

export const SEED_LEGAL_SECTIONS: LegalSection[] = [
  {
    id: "sec-bns-318",
    act_id: "act-bns-2023",
    act_short_title: "BNS 2023",
    part_number: "Chapter XVII",
    chapter_number: "XVII",
    chapter_title: "Of Offences Against Property — Of Cheating",
    section_number: "318",
    section_title: "Cheating and dishonestly inducing delivery of property",
    statutory_text:
      "(1) Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, and which act or omission causes or is likely to cause damage or harm to that person in body, mind, reputation or property, is said to cheat.\n(2) Whoever cheats shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.\n(3) Whoever cheats with the knowledge that he is likely thereby to cause wrongful loss to a person whose interest in the transaction to which the cheating relates, he was bound, either by law, or by a legal contract, to protect, shall be punished with imprisonment of either description for a term which may extend to five years, or with fine, or with both.\n(4) Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
    amendment_notes:
      "Consolidates former Sections 415, 417, 418, and 420 of the Indian Penal Code, 1860 into a single structured section with enhanced maximum punishment under sub-section (2) raised from 1 year to 3 years, and sub-section (3) raised from 3 years to 5 years.",
    effective_date: "2024-07-01",
    corresponding_historical_section: "IPC 1860 — Sections 415, 417, 418 & 420",
    historical_comparison: {
      legacy_act: "Indian Penal Code, 1860 (IPC)",
      legacy_section: "Section 415 & Section 420",
      legacy_title: "Cheating and dishonestly inducing delivery of property",
      legacy_text:
        "Section 420 IPC: Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security... shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
      key_changes: [
        "Consolidates IPC Sections 415 (definition), 417 (simple cheating), 418 (cheating by person bound to protect interest), and 420 (aggravated cheating inducing delivery of property) into Section 318(1)-(4) of BNS 2023.",
        "Increases punishment for simple cheating under BNS Section 318(2) up to 3 years (formerly 1 year under IPC Section 417).",
        "Increases punishment under BNS Section 318(3) up to 5 years (formerly 3 years under IPC Section 418).",
        "BNS Section 318(4) retains the 7-year maximum imprisonment and mandatory fine liability corresponding to IPC Section 420."
      ]
    }
  },
  {
    id: "sec-bns-103",
    act_id: "act-bns-2023",
    act_short_title: "BNS 2023",
    part_number: "Chapter VI",
    chapter_number: "VI",
    chapter_title: "Of Offences Affecting the Human Body",
    section_number: "103",
    section_title: "Punishment for murder",
    statutory_text:
      "(1) Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.\n(2) When a group of five or more persons acting in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground each member of such group shall be punished with death or with imprisonment for life, and shall also be liable to fine.",
    amendment_notes:
      "Replaces Section 302 of the IPC 1860 and introduces sub-section (2) specifically codifying punishment for murder committed by a group of five or more persons acting in concert (mob lynching).",
    effective_date: "2024-07-01",
    corresponding_historical_section: "IPC 1860 — Section 302",
    historical_comparison: {
      legacy_act: "Indian Penal Code, 1860 (IPC)",
      legacy_section: "Section 302",
      legacy_title: "Punishment for murder",
      legacy_text:
        "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
      key_changes: [
        "Retains the core punishment for murder in Section 103(1) (death or life imprisonment + fine).",
        "Adds Section 103(2) explicitly addressing group/mob murder by five or more persons acting in concert on grounds of race, caste, community, sex, place of birth, language, or personal belief."
      ]
    }
  },
  {
    id: "sec-bnss-173",
    act_id: "act-bnss-2023",
    act_short_title: "BNSS 2023",
    part_number: "Chapter XIII",
    chapter_number: "XIII",
    chapter_title: "Information to the Police and their Powers to Investigate",
    section_number: "173",
    section_title: "Information in cognizable cases (Zero FIR & Electronic FIR)",
    statutory_text:
      "(1) Every information relating to the commission of a cognizable offence, irrespective of the area where the offence is committed, may be given orally or by electronic communication to an officer in charge of a police station, and if given—\n(i) orally, it shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it;\n(ii) by electronic communication, it shall be taken on record by him on being signed within three days by the person giving it, and the substance thereof shall be entered in a book to be kept by such officer in such form as the State Government may prescribe in this behalf.\n(3) Without prejudice to the provisions contained in section 175, on receipt of information relating to the commission of any cognizable offence, which is made punishable for three years or more but less than seven years, the officer in charge of the police station may with the prior permission from an officer not below the rank of Deputy Superintendent of Police, considering the nature and gravity of the offence, proceed to conduct preliminary enquiry within a period of fourteen days.",
    amendment_notes:
      "Statutorily codifies Zero FIR ('irrespective of the area where the offence is committed') and Electronic FIR (e-FIR signed within 3 days).",
    effective_date: "2024-07-01",
    corresponding_historical_section: "CrPC 1973 — Section 154",
    historical_comparison: {
      legacy_act: "Code of Criminal Procedure, 1973 (CrPC)",
      legacy_section: "Section 154",
      legacy_title: "Information in cognizable cases",
      legacy_text:
        "Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction...",
      key_changes: [
        "Expressly inserts 'irrespective of the area where the offence is committed' in Section 173(1), giving statutory force to Zero FIR.",
        "Recognizes FIR submission by 'electronic communication' (taken on record upon signature within 3 days).",
        "Introduces structured 14-day preliminary enquiry under Section 173(3) with DSP permission for offences punishable with 3 to less than 7 years."
      ]
    }
  },
  {
    id: "sec-bsa-63",
    act_id: "act-bsa-2023",
    act_short_title: "BSA 2023",
    part_number: "Part II",
    chapter_number: "V",
    chapter_title: "Of Documentary Evidence",
    section_number: "63",
    section_title: "Admissibility of electronic records",
    statutory_text:
      "(1) Notwithstanding anything contained in this Adhiniyam, any information contained in an electronic record which is printed on paper, stored, recorded or copied in optical or magnetic media or semiconductor memory which is produced by a computer or any communication device or otherwise stored, recorded or copied in any electronic form (hereinafter referred to as the computer output) shall be deemed to be also a document, if the conditions mentioned in this section are satisfied in relation to the information and computer in question and shall be admissible in any proceedings, without further proof or production of the original, as evidence or any contents of the original or of any fact stated therein of which direct evidence would be admissible.\n(4) In any proceeding where it is desired to give a statement in evidence by virtue of this section, a certificate doing any of the following things shall be submitted along with the electronic record at each instance where it is being submitted for admission, namely:— (a) identifying the electronic record containing the statement and describing the manner in which it was produced; (b) giving such particulars of any device involved in the production of that electronic record; (c) signed by a person in charge of the computer or communication device and an expert (wherever applicable) in the form specified in the Schedule.",
    amendment_notes:
      "Replaces Section 65B of the Indian Evidence Act, 1872. Expands coverage to semiconductor memory and any communication device, and standardizes the mandatory certificate format in the Schedule to the BSA 2023.",
    effective_date: "2024-07-01",
    corresponding_historical_section: "IEA 1872 — Section 65B",
    historical_comparison: {
      legacy_act: "Indian Evidence Act, 1872 (IEA)",
      legacy_section: "Section 65B",
      legacy_title: "Admissibility of electronic records",
      legacy_text:
        "Notwithstanding anything contained in this Act, any information contained in an electronic record which is printed on a paper, stored, recorded or copied in optical or magnetic media produced by a computer shall be deemed to be also a document, if the conditions mentioned in this section are satisfied...",
      key_changes: [
        "Broadens 'optical or magnetic media' to explicitly include 'semiconductor memory' and 'any communication device'.",
        "Prescribes a standardized dual-part Certificate in the Schedule to the BSA 2023 under Section 63(4) (Part A by Party/Person in charge and Part B by Expert where applicable)."
      ]
    }
  },
  {
    id: "sec-coi-21",
    act_id: "act-coi-1950",
    act_short_title: "Constitution of India",
    part_number: "Part III",
    chapter_number: "III",
    chapter_title: "Fundamental Rights — Right to Freedom",
    section_number: "Article 21",
    section_title: "Protection of life and personal liberty",
    statutory_text:
      "No person shall be deprived of his life or personal liberty except according to procedure established by law.",
    amendment_notes:
      "Judicially interpreted by the Supreme Court of India (Maneka Gandhi, 1978; K.S. Puttaswamy, 2017) to require that any procedure established by law must be fair, just, and reasonable, and encompasses the fundamental right to privacy, dignity, speedy trial, and livelihood.",
    effective_date: "1950-01-26",
    corresponding_historical_section: null,
    historical_comparison: null
  },
  {
    id: "sec-dpdp-6",
    act_id: "act-dpdp-2023",
    act_short_title: "DPDP Act 2023",
    part_number: "Chapter II",
    chapter_number: "II",
    chapter_title: "Obligations of Data Fiduciary",
    section_number: "6",
    section_title: "Consent of Data Principal",
    statutory_text:
      "(1) The consent given by the Data Principal shall be free, specific, informed, unconditional and unambiguous with a clear affirmative action, and shall signify an agreement to the processing of her personal data for the specified purpose and be limited to such personal data as is necessary for such specified purpose.\n(4) Where consent given by the Data Principal is the basis of processing of personal data, such Data Principal shall have the right to withdraw her consent at any time, with the ease of doing so being comparable to the ease with which such consent was given.",
    amendment_notes:
      "Establishes the foundational consent standard for Data Fiduciaries across India, including AI document processing platforms.",
    effective_date: "2023-08-11",
    corresponding_historical_section: "IT Act 2000 — Section 43A & SPDI Rules 2011",
    historical_comparison: null
  },
  {
    id: "sec-contract-73",
    act_id: "act-contract-1872",
    act_short_title: "Indian Contract Act 1872",
    part_number: "Chapter VI",
    chapter_number: "VI",
    chapter_title: "Of the Consequences of Breach of Contract",
    section_number: "73",
    section_title: "Compensation for loss or damage caused by breach of contract",
    statutory_text:
      "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.\nSuch compensation is not to be given for any remote and indirect loss or damage sustained by reason of the breach.",
    amendment_notes:
      "Codifies the rule in Hadley v. Baxendale in Indian contract jurisprudence; read alongside Section 74 (liquidated damages / penalty).",
    effective_date: "1872-09-01",
    corresponding_historical_section: null,
    historical_comparison: null
  },
  {
    id: "sec-ipc-420",
    act_id: "act-ipc-1860",
    act_short_title: "IPC 1860",
    part_number: "Chapter XVII",
    chapter_number: "XVII",
    chapter_title: "Of Offences Against Property — Of Cheating",
    section_number: "420",
    section_title: "Cheating and dishonestly inducing delivery of property (Historical)",
    statutory_text:
      "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
    amendment_notes:
      "HISTORICAL STATUTE: Repealed w.e.f. July 1, 2024 by Section 358 of BNS 2023. Replaced by Section 318(4) of the Bharatiya Nyaya Sanhita, 2023 for offences committed on or after July 1, 2024.",
    effective_date: "1862-01-01",
    corresponding_historical_section: "Replaced by BNS 2023 — Section 318(4)",
    historical_comparison: {
      legacy_act: "Indian Penal Code, 1860",
      legacy_section: "Section 420",
      legacy_title: "Cheating and dishonestly inducing delivery of property",
      legacy_text:
        "Punishable with imprisonment up to 7 years and fine. Replaced w.e.f. 01-07-2024 by Section 318(4) of BNS 2023.",
      key_changes: [
        "Continues to apply only to FIRs/offences committed prior to July 1, 2024 under the savings clause in Section 358(2) of BNS 2023.",
        "For offences committed on or after July 1, 2024, cite Section 318(4) of BNS 2023."
      ]
    }
  },
  {
    id: "sec-iea-65b",
    act_id: "act-iea-1872",
    act_short_title: "IEA 1872",
    part_number: "Part II",
    chapter_number: "V",
    chapter_title: "Of Documentary Evidence",
    section_number: "65B",
    section_title: "Admissibility of electronic records (Historical)",
    statutory_text:
      "Notwithstanding anything contained in this Act, any information contained in an electronic record which is printed on a paper, stored, recorded or copied in optical or magnetic media produced by a computer shall be deemed to be also a document, if the conditions mentioned in this section are satisfied in relation to the information and computer in question...",
    amendment_notes:
      "HISTORICAL STATUTE: Replaced w.e.f. July 1, 2024 by Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA).",
    effective_date: "2000-10-17",
    corresponding_historical_section: "Replaced by BSA 2023 — Section 63",
    historical_comparison: {
      legacy_act: "Indian Evidence Act, 1872",
      legacy_section: "Section 65B",
      legacy_title: "Admissibility of electronic records",
      legacy_text: "Inserted by IT Act 2000; replaced by Section 63 of BSA 2023 w.e.f. 01-07-2024.",
      key_changes: [
        "Proceedings initiated on or after July 1, 2024 require certification under Section 63(4) and the Schedule to the BSA 2023."
      ]
    }
  }
];

export const SEED_JUDGMENTS: Judgment[] = [
  {
    id: "jud-arjun-2020",
    source_id: "src-sci-escr",
    source_name: "Supreme Court of India — Digital SCR (e-SCR)",
    case_title: "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal & Ors.",
    neutral_citation: "2020 INSC 453",
    equivalent_citations: ["(2020) 7 SCC 1", "[2020] 7 S.C.R. 180", "AIR 2020 SC 4908"],
    court: "Supreme Court of India",
    bench_type: "Three-Judge Bench",
    judges: [
      "Justice Rohinton Fali Nariman",
      "Justice S. Ravindra Bhat",
      "Justice V. Ramasubramanian"
    ],
    decision_date: "2020-07-14",
    subject_matter: "Law of Evidence — Electronic Records Admissibility",
    legal_issues: [
      "Mandatory nature of certificate under Section 65B(4) IEA (now Section 63(4) BSA 2023)",
      "Distinction between primary electronic evidence (original device produced) and secondary computer output",
      "Overruling of Shafhi Mohammad v. State of Himachal Pradesh"
    ],
    headnote_summary:
      "A three-judge Bench of the Supreme Court settled the law on electronic evidence, holding that the certificate under Section 65B(4) of the Indian Evidence Act is a condition precedent to the admissibility of secondary electronic evidence (computer output), while clarifying that no certificate is required if the original physical electronic device itself is produced in court by its owner.",
    ratio_decidendi:
      "The requirement of a certificate under Section 65B(4) is mandatory whenever secondary evidence of an electronic record is sought to be produced via computer output. Anvar P.V. v. P.K. Basheer (2014) 10 SCC 473 is affirmed in full, and Shafhi Mohammad v. State of H.P. (2018) 2 SCC 801 is overruled.",
    key_paragraphs: [
      {
        para_no: "Para 72(a)",
        text: "The required certificate under Section 65B(4) is unnecessary if the original document itself is produced. This can be done by the owner of a laptop computer, computer tablet or even a mobile phone, by stepping into the witness box and proving that the concerned device, on which the original information is first stored, is owned and/or operated by him."
      },
      {
        para_no: "Para 72(b)",
        text: "In all other cases where the computer happens to be part of a 'computer system' or 'computer network' and it becomes impossible to physically bring such system or network to the Court, then the only means of providing information contained in such electronic record can be in accordance with Section 65B(1), together with the requisite certificate under Section 65B(4)."
      }
    ],
    precedent_status: "BINDING",
    verification_notes:
      "Verified against Supreme Court e-SCR ([2020] 7 S.C.R. 180). Note: For trials under the Bharatiya Sakshya Adhiniyam, 2023 (w.e.f. 01-07-2024), read alongside Section 63(4) and the Schedule to the BSA 2023.",
    official_source_url: "https://digiscr.sci.gov.in",
    cited_authorities: [
      {
        citation_text: "Anvar P.V. v. P.K. Basheer, (2014) 10 SCC 473",
        treatment_type: "FOLLOWED",
        context_excerpt: "Three-Judge Bench rule in Anvar P.V. affirmed as the governing law on electronic records."
      },
      {
        citation_text: "Shafhi Mohammad v. State of Himachal Pradesh, (2018) 2 SCC 801",
        treatment_type: "OVERRULED",
        context_excerpt: "Two-Judge Bench clarification treating Section 65B(4) as merely procedural is overruled."
      }
    ]
  },
  {
    id: "jud-puttaswamy-2017",
    source_id: "src-sci-escr",
    source_name: "Supreme Court of India — Digital SCR (e-SCR)",
    case_title: "Justice K.S. Puttaswamy (Retd.) & Anr. v. Union of India & Ors.",
    neutral_citation: "2017 INSC 801",
    equivalent_citations: ["(2017) 10 SCC 1", "AIR 2017 SC 4161"],
    court: "Supreme Court of India",
    bench_type: "Nine-Judge Constitution Bench",
    judges: [
      "Chief Justice J.S. Khehar",
      "Justice J. Chelameswar",
      "Justice S.A. Bobde",
      "Justice R.K. Agrawal",
      "Justice R.F. Nariman",
      "Justice A.M. Sapre",
      "Justice Dr. D.Y. Chandrachud",
      "Justice S.K. Kaul",
      "Justice S. Abdul Nazeer"
    ],
    decision_date: "2017-08-24",
    subject_matter: "Constitutional Law — Fundamental Right to Privacy & Informational Self-Determination",
    legal_issues: [
      "Whether the right to privacy is an intrinsic part of the right to life and personal liberty under Article 21",
      "Three-fold test for any state restriction on privacy: legality, legitimate state aim, and proportionality",
      "Overruling of M.P. Sharma (1954) and Kharak Singh (1962) to the extent they held privacy was not protected"
    ],
    headnote_summary:
      "A unanimous Nine-Judge Constitution Bench declared that the right to privacy is protected as an intrinsic part of the right to life and personal liberty under Article 21 and as a part of the freedoms guaranteed by Part III of the Constitution of India.",
    ratio_decidendi:
      "Privacy is a constitutionally protected right which emerges primarily from the guarantee of life and personal liberty in Article 21 of the Constitution. Any encroachment upon privacy must withstand the three-pronged test of (i) existence of a valid law, (ii) legitimate State aim, and (iii) proportionality.",
    key_paragraphs: [
      {
        para_no: "Conclusion Para 3(C)",
        text: "Privacy is a constitutionally protected right which emerges primarily from the guarantee of life and personal liberty in Article 21 of the Constitution. Elements of privacy also arise in varying contexts from the other facets of freedom and dignitygerminating from the fundamental rights contained in Part III."
      },
      {
        para_no: "Informational Privacy",
        text: "Informational privacy is a facet of the right to privacy. The dangers to privacy in an age of information can originate not only from the state but from non-state actors as well."
      }
    ],
    precedent_status: "BINDING",
    verification_notes:
      "Verified 9-Judge Constitution Bench precedent on Supreme Court e-SCR.",
    official_source_url: "https://digiscr.sci.gov.in",
    cited_authorities: [
      {
        citation_text: "M.P. Sharma v. Satish Chandra, 1954 SCR 1077",
        treatment_type: "OVERRULED",
        context_excerpt: "Overruled to the extent it observed that the Constitution does not recognize a fundamental right to privacy."
      },
      {
        citation_text: "Maneka Gandhi v. Union of India, (1978) 1 SCC 248",
        treatment_type: "FOLLOWED",
        context_excerpt: "Inter-relationship of Articles 14, 19, and 21 reaffirmed."
      }
    ]
  },
  {
    id: "jud-lalita-2013",
    source_id: "src-sci-escr",
    source_name: "Supreme Court of India — Digital SCR (e-SCR)",
    case_title: "Lalita Kumari v. Government of Uttar Pradesh & Ors.",
    neutral_citation: "2013 INSC 759",
    equivalent_citations: ["(2014) 2 SCC 1", "[2013] 14 S.C.R. 713"],
    court: "Supreme Court of India",
    bench_type: "Five-Judge Constitution Bench",
    judges: [
      "Chief Justice P. Sathasivam",
      "Justice Dr. B.S. Chauhan",
      "Justice Ranjana Prakash Desai",
      "Justice Ranjan Gogoi",
      "Justice S.A. Bobde"
    ],
    decision_date: "2013-11-12",
    subject_matter: "Criminal Procedure — Mandatory Registration of FIR in Cognizable Offences",
    legal_issues: [
      "Mandatory registration of FIR under Section 154 CrPC when information discloses a cognizable offence",
      "Permissible categories for time-bound preliminary inquiry"
    ],
    headnote_summary:
      "The Constitution Bench held that registration of an FIR is mandatory under Section 154 of the Code of Criminal Procedure if the information discloses commission of a cognizable offence, and no preliminary inquiry is permissible in such a situation, subject to narrow exceptions where information does not facially disclose a cognizable offence.",
    ratio_decidendi:
      "Registration of FIR is mandatory if information discloses a cognizable offence. Preliminary inquiry is only to ascertain whether the information reveals any cognizable offence, not to verify the veracity of the information.",
    key_paragraphs: [
      {
        para_no: "Para 120.1",
        text: "Registration of FIR is mandatory under Section 154 of the Code, if the information discloses commission of a cognizable offence and no preliminary inquiry is permissible in such a situation."
      }
    ],
    precedent_status: "BINDING",
    verification_notes:
      "Verified 5-Judge Constitution Bench ruling. Note statutory evolution under Section 173(3) of BNSS 2023 regarding 14-day preliminary enquiry with DSP approval for offences punishable with 3 to less than 7 years.",
    official_source_url: "https://digiscr.sci.gov.in",
    cited_authorities: []
  },
  {
    id: "jud-arnesh-2014",
    source_id: "src-sci-escr",
    source_name: "Supreme Court of India — Digital SCR (e-SCR)",
    case_title: "Arnesh Kumar v. State of Bihar & Anr.",
    neutral_citation: "2014 INSC 463",
    equivalent_citations: ["(2014) 8 SCC 273", "AIR 2014 SC 2756"],
    court: "Supreme Court of India",
    bench_type: "Division Bench",
    judges: ["Justice Chandramauli Kr. Prasad", "Justice Pinaki Chandra Ghose"],
    decision_date: "2014-07-02",
    subject_matter: "Criminal Procedure — Safeguards Against Mechanical Arrest (Offences up to 7 Years)",
    legal_issues: [
      "Mandatory compliance with Section 41 and Section 41A CrPC (now Sections 35(1)(b) and 35(3) of BNSS 2023) before arrest in offences punishable up to 7 years"
    ],
    headnote_summary:
      "The Supreme Court laid down mandatory checklists and directions requiring police officers not to automatically arrest accused persons when an offence is punishable with imprisonment for a term which may be less than seven years or which may extend to seven years, and mandated issuance of Notice of Appearance under Section 41A CrPC (now Section 35(3) BNSS).",
    ratio_decidendi:
      "Police officers shall not automatically arrest when a case is registered for an offence punishable with imprisonment up to 7 years; they must satisfy themselves of the necessity of arrest under the parameters of Section 41 CrPC (Section 35 BNSS) and issue notice of appearance within two weeks.",
    key_paragraphs: [
      {
        para_no: "Para 11.1 - 11.4",
        text: "All the State Governments to instruct its police officers not to automatically arrest when a case under Section 498-A IPC is registered but to satisfy themselves about the necessity for arrest under the parameters laid down above flowing from Section 41 CrPC; this direction shall apply to all such cases where offence is punishable with imprisonment for a term which may be less than seven years or which may extend to seven years."
      }
    ],
    precedent_status: "BINDING",
    verification_notes:
      "Reaffirmed and expanded in Satender Kumar Antil v. CBI (2022) 10 SCC 51; corresponds to Section 35 of BNSS 2023.",
    official_source_url: "https://digiscr.sci.gov.in",
    cited_authorities: []
  },
  {
    id: "jud-core-2024",
    source_id: "src-sci-escr",
    source_name: "Supreme Court of India — Digital SCR (e-SCR)",
    case_title: "Central Organisation for Railway Electrification v. M/s ECI SPIC SMO MCML (JV) A Joint Venture Company",
    neutral_citation: "2024 INSC 857",
    equivalent_citations: ["2024 SCC OnLine SC 3219"],
    court: "Supreme Court of India",
    bench_type: "Five-Judge Constitution Bench",
    judges: [
      "Chief Justice Dr. D.Y. Chandrachud",
      "Justice Hrishikesh Roy",
      "Justice P.S. Narasimha",
      "Justice J.B. Pardiwala",
      "Justice Manoj Misra"
    ],
    decision_date: "2024-11-08",
    subject_matter: "Arbitration & Commercial Law — Unilateral Appointment of Arbitrators & Curated Panels",
    legal_issues: [
      "Validity of unilateral appointment clauses and restrictive curated arbitrator panels in public-private contracts under Article 14 and Section 12(5) of the Arbitration and Conciliation Act, 1996"
    ],
    headnote_summary:
      "A Five-Judge Constitution Bench held that clauses allowing unilateral appointment of sole arbitrators or mandating the private contractor to choose its nominee exclusively from a panel curated by a Public Sector Undertaking violate the principle of equal treatment of parties under Section 18 of the Arbitration Act and Article 14 of the Constitution.",
    ratio_decidendi:
      "Unilateral appointment clauses in arbitration agreements, as well as clauses mandating one party to select its arbitrator from a curated panel maintained by the other party in public-private contracts, violate equal treatment and independence/impartiality norms.",
    key_paragraphs: [
      {
        para_no: "Para 169",
        text: "A clause that allows one party to unilaterally appoint a sole arbitrator gives rise to justifiable doubts as to the independence and impartiality of the arbitrator. Further, such a unilateral clause is exclusive and hinders equal participation of the other party in the appointment process of arbitrators."
      }
    ],
    precedent_status: "BINDING",
    verification_notes:
      "Verified 5-Judge Constitution Bench decision (2024 INSC 857) overruling earlier 3-Judge ruling in CORE (2020) 14 SCC 712.",
    official_source_url: "https://digiscr.sci.gov.in",
    cited_authorities: [
      {
        citation_text: "Perkins Eastman Architects DPC v. HSCC (India) Ltd., (2020) 20 SCC 760",
        treatment_type: "FOLLOWED",
        context_excerpt: "Principle against unilateral appointment affirmed."
      }
    ]
  },
  {
    id: "jud-shafhi-2018",
    source_id: "src-sci-escr",
    source_name: "Supreme Court of India — Digital SCR (e-SCR)",
    case_title: "Shafhi Mohammad v. State of Himachal Pradesh",
    neutral_citation: "2018 INSC 71",
    equivalent_citations: ["(2018) 2 SCC 801"],
    court: "Supreme Court of India",
    bench_type: "Division Bench",
    judges: ["Justice Adarsh Kumar Goel", "Justice Uday Umesh Lalit"],
    decision_date: "2018-01-30",
    subject_matter: "Law of Evidence — Electronic Records (OVERRULED)",
    legal_issues: [
      "Whether Section 65B(4) certificate can be relaxed when device is not in possession of party"
    ],
    headnote_summary:
      "Held that the requirement of a certificate under Section 65B(4) of the Evidence Act was procedural and could be relaxed wherever the interest of justice so justified. SUBSEQUENTLY OVERRULED by the Three-Judge Bench in Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1.",
    ratio_decidendi:
      "OVERRULED: Do not cite as good law. See Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal, 2020 INSC 453 / (2020) 7 SCC 1.",
    key_paragraphs: [
      {
        para_no: "Precedent Alert",
        text: "This decision was expressly overruled by a Three-Judge Bench of the Supreme Court on 14 July 2020 in Arjun Panditrao Khotkar (2020) 7 SCC 1."
      }
    ],
    precedent_status: "OVERRULED",
    verification_notes:
      "Flagged as OVERRULED by Citation Validator to prevent reliance on superseded electronic evidence holdings.",
    official_source_url: "https://digiscr.sci.gov.in",
    cited_authorities: []
  }
];

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-001",
    title: "Admissibility of WhatsApp & Server Logs under Section 63 BSA 2023 vs Section 65B IEA",
    response_mode: "detailed",
    is_pinned: true,
    message_count: 2,
    created_at: "2025-02-23T10:15:00Z",
    updated_at: "2025-02-23T10:16:12Z",
    messages: [
      {
        id: "msg-001-u",
        conversation_id: "conv-001",
        role: "user",
        content:
          "Compare the legal requirements for admitting electronic records (such as WhatsApp messages and cloud server logs) under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 versus Section 65B of the Indian Evidence Act, 1872, in light of Arjun Panditrao Khotkar.",
        response_mode: "detailed",
        created_at: "2025-02-23T10:15:00Z"
      },
      {
        id: "msg-001-a",
        conversation_id: "conv-001",
        role: "assistant",
        content:
          "Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA), which replaced Section 65B of the Indian Evidence Act, 1872 (IEA) w.e.f. July 1, 2024, secondary electronic outputs (such as exported WhatsApp chat transcripts or cloud server logs) remain admissible only upon strict compliance with the mandatory certification requirement under Section 63(4) in the form prescribed in the Schedule to the BSA, read with the binding Three-Judge Bench ruling in Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020 INSC 453).",
        response_mode: "detailed",
        confidence_score: 0.98,
        coverage_status: "VERIFIED",
        follow_up_suggestions: [
          "What are the exact Part A and Part B fields in the BSA 2023 Schedule Certificate?",
          "How can a party summon third-party server logs if they do not control the server?",
          "Draft a Section 63(4) BSA 2023 Certificate for electronic commercial correspondence"
        ],
        structured_sections: {
          direct_answer:
            "For proceedings governed by the Bharatiya Sakshya Adhiniyam, 2023 (commenced on July 1, 2024), any secondary output of an electronic record (such as printed/PDF WhatsApp chats, emails, or cloud server logs) is deemed a document and admissible under Section 63(1) only when accompanied at each instance of submission by a mandatory certificate under Section 63(4) in the statutory Schedule format (Part A signed by the person in charge of the computer/communication device and Part B signed by an expert where applicable). If the original mobile phone or laptop on which the record was first stored is physically produced in Court and proved by its owner in the witness box, it constitutes primary evidence under Section 57 BSA and no Section 63(4) certificate is required, per Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal, 2020 INSC 453.",
          applicable_provisions: [
            {
              act_title: "The Bharatiya Sakshya Adhiniyam, 2023 (Act No. 47 of 2023)",
              section: "Section 63 (read with Section 57 & The Schedule)",
              status: "CURRENT",
              corresponding_historical: "Indian Evidence Act, 1872 — Section 65B",
              summary:
                "Governs admissibility of computer/communication device output stored on optical, magnetic, or semiconductor media. Section 63(4) mandates submission of the statutory Schedule certificate at the time the electronic record is tendered for admission."
            },
            {
              act_title: "The Indian Evidence Act, 1872 (Act No. 1 of 1872)",
              section: "Section 65B",
              status: "HISTORICAL",
              corresponding_historical: "Replaced by BSA 2023 — Section 63 (w.e.f. 01-07-2024)",
              summary:
                "Continues to govern trials and proceedings initiated prior to July 1, 2024 under the savings clause in Section 170(2) of the BSA 2023."
            }
          ],
          relevant_judgments: [
            {
              case_title: "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal & Ors.",
              neutral_citation: "2020 INSC 453 / (2020) 7 SCC 1",
              court: "Supreme Court of India (3-Judge Bench)",
              decision_date: "2020-07-14",
              precedent_status: "BINDING",
              holding:
                "Certification is a mandatory condition precedent for secondary electronic evidence; if the party does not possess the device, they must apply to the Court to summon the person in control to produce the certificate. Overruled Shafhi Mohammad (2018) 2 SCC 801."
            }
          ],
          legal_reasoning:
            "1. Statutory Transition & Scope Expansion: While Section 65B of the IEA 1872 referred to 'optical or magnetic media produced by a computer', Section 63(1) of the BSA 2023 explicitly expands coverage to 'semiconductor memory' (flash storage, SSDs, mobile chipsets) and 'any communication device'.\n2. Dual-Part Statutory Certification: Unlike Section 65B(4) IEA which left the certificate layout flexible, Section 63(4)(c) BSA mandates a structured Schedule certificate signed by both the person in charge of the device (Part A) and, wherever applicable, an expert certifying hash value (SHA-256) and integrity (Part B).\n3. Primary vs Secondary Distinction: Under Arjun Panditrao Khotkar (Para 72), producing the original device itself in court is primary evidence; producing a printout, pen-drive copy, or PDF export is secondary computer output requiring certification.",
          source_references: [
            {
              id: "sec-bsa-63",
              source_type: "STATUTE",
              title: "Bharatiya Sakshya Adhiniyam, 2023 — Section 63",
              citation: "Act No. 47 of 2023, s. 63 (w.e.f. 01-07-2024)",
              repository: "India Code Digital Repository",
              section_or_para: "Section 63(1)-(4) & Schedule",
              effective_date: "2024-07-01",
              excerpt:
                "Any information contained in an electronic record which is printed on paper, stored, recorded or copied in optical or magnetic media or semiconductor memory... shall be deemed to be also a document...",
              official_url: "https://www.indiacode.nic.in",
              is_verified: true
            },
            {
              id: "jud-arjun-2020",
              source_type: "JUDGMENT",
              title: "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal",
              citation: "2020 INSC 453 | (2020) 7 SCC 1",
              repository: "Supreme Court of India e-SCR",
              section_or_para: "Paragraph 72(a)-(c)",
              precedent_status: "BINDING",
              excerpt:
                "The required certificate under Section 65B(4) is unnecessary if the original document itself is produced... In all other cases... the only means of providing information contained in such electronic record can be in accordance with Section 65B(1), together with the requisite certificate under Section 65B(4).",
              official_url: "https://digiscr.sci.gov.in",
              is_verified: true
            }
          ],
          important_limitations:
            "Whether a specific trial is governed by Section 63 of the BSA 2023 or Section 65B of the IEA 1872 depends on the date of institution of the trial/inquiry/proceeding under the savings clause in Section 170(2) of the BSA 2023. Furthermore, admission of a record under Section 63 only establishes formal admissibility ('mode of proof'), while the weight, authenticity, and probative value remain subject to cross-examination.",
          verification_date: "2025-02-24 | Verified against India Code & Supreme Court e-SCR"
        },
        cited_sources: [
          {
            id: "sec-bsa-63",
            source_type: "STATUTE",
            title: "Bharatiya Sakshya Adhiniyam, 2023 — Section 63",
            citation: "Act No. 47 of 2023, s. 63",
            repository: "India Code Digital Repository",
            section_or_para: "Section 63(1)-(4)",
            effective_date: "2024-07-01",
            excerpt:
              "Admissibility of electronic records stored in optical, magnetic, or semiconductor memory with mandatory Schedule certificate.",
            official_url: "https://www.indiacode.nic.in",
            is_verified: true
          },
          {
            id: "jud-arjun-2020",
            source_type: "JUDGMENT",
            title: "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal",
            citation: "2020 INSC 453 | (2020) 7 SCC 1",
            repository: "Supreme Court of India e-SCR",
            section_or_para: "Para 72",
            precedent_status: "BINDING",
            excerpt:
              "Three-Judge Bench ruling affirming Anvar P.V. and overruling Shafhi Mohammad on mandatory certification of secondary electronic evidence.",
            official_url: "https://digiscr.sci.gov.in",
            is_verified: true
          }
        ],
        created_at: "2025-02-23T10:16:12Z"
      }
    ]
  },
  {
    id: "conv-002",
    title: "Unilateral Arbitrator Appointment Clauses after CORE (2024 INSC 857)",
    response_mode: "research",
    is_pinned: false,
    message_count: 2,
    created_at: "2025-02-21T16:40:00Z",
    updated_at: "2025-02-21T16:41:30Z",
    messages: [
      {
        id: "msg-002-u",
        conversation_id: "conv-002",
        role: "user",
        content:
          "Are unilateral arbitrator appointment clauses or curated PSU arbitrator panels enforceable in Indian commercial contracts after the Constitution Bench judgment in CORE (2024)?",
        response_mode: "research",
        created_at: "2025-02-21T16:40:00Z"
      },
      {
        id: "msg-002-a",
        conversation_id: "conv-002",
        role: "assistant",
        content:
          "No. In Central Organisation for Railway Electrification v. ECI SPIC SMO MCML (JV), 2024 INSC 857 (decided on November 8, 2024), a Five-Judge Constitution Bench of the Supreme Court held that unilateral appointment of a sole arbitrator—or requiring a private contractor to choose its nominee arbitrator exclusively from a panel curated by a public sector counterparty—violates Section 18 of the Arbitration and Conciliation Act, 1996 (equal treatment of parties) and Article 14 of the Constitution of India.",
        response_mode: "research",
        confidence_score: 0.99,
        coverage_status: "VERIFIED",
        follow_up_suggestions: [
          "Draft a balanced 3-member arbitral tribunal clause compliant with CORE 2024 INSC 857",
          "What happens to pending arbitrations where a unilateral appointment was already made?"
        ],
        structured_sections: {
          direct_answer:
            "Unilateral appointment of a sole arbitrator, as well as clauses in public-private contracts mandating the private party to select its nominee arbitrator from a restricted panel curated by the PSU/Government entity, are unenforceable. They infringe the fundamental principle of equal treatment of parties at the stage of constituting the arbitral tribunal under Section 18 read with Section 12(5) of the Arbitration and Conciliation Act, 1996, and Article 14 of the Constitution.",
          applicable_provisions: [
            {
              act_title: "The Constitution of India",
              section: "Article 14",
              status: "CURRENT",
              summary: "Equality before law and non-arbitrariness in state contractual action."
            },
            {
              act_title: "The Indian Contract Act, 1872",
              section: "Section 23 & Section 28",
              status: "CURRENT",
              summary: "Public policy and agreements relating to dispute resolution mechanisms."
            }
          ],
          relevant_judgments: [
            {
              case_title:
                "Central Organisation for Railway Electrification v. M/s ECI SPIC SMO MCML (JV)",
              neutral_citation: "2024 INSC 857",
              court: "Supreme Court of India (5-Judge Constitution Bench)",
              decision_date: "2024-11-08",
              precedent_status: "BINDING",
              holding:
                "Unilateral appointment of sole arbitrators and mandatory selection from PSU-curated panels violate equal participation and impartiality."
            }
          ],
          legal_reasoning:
            "The Constitution Bench reasoned that equal participation of parties in the appointment of arbitrators is a corollary of the principle of equal treatment under Section 18 of the Arbitration Act. While a public sector undertaking is not barred from maintaining a panel of potential arbitrators, it cannot contractually compel the counterparty to select its nominee exclusively from that unilaterally curated list.",
          source_references: [
            {
              id: "jud-core-2024",
              source_type: "JUDGMENT",
              title: "Central Organisation for Railway Electrification v. ECI SPIC SMO MCML (JV)",
              citation: "2024 INSC 857",
              repository: "Supreme Court of India e-SCR",
              section_or_para: "Para 169",
              precedent_status: "BINDING",
              excerpt:
                "A clause that allows one party to unilaterally appoint a sole arbitrator gives rise to justifiable doubts as to the independence and impartiality of the arbitrator.",
              official_url: "https://digiscr.sci.gov.in",
              is_verified: true
            }
          ],
          important_limitations:
            "Parties may still expressly waive the applicability of Section 12(5) only *after* the disputes have arisen, by an express agreement in writing as permitted by the proviso to Section 12(5) of the Arbitration and Conciliation Act, 1996.",
          verification_date: "2025-02-24 | Verified against Supreme Court e-SCR"
        },
        cited_sources: [
          {
            id: "jud-core-2024",
            source_type: "JUDGMENT",
            title: "Central Organisation for Railway Electrification v. ECI SPIC SMO MCML (JV)",
            citation: "2024 INSC 857",
            repository: "Supreme Court of India e-SCR",
            section_or_para: "Para 169",
            precedent_status: "BINDING",
            excerpt:
              "Unilateral appointment clauses and mandatory selection from PSU-curated panels held invalid.",
            official_url: "https://digiscr.sci.gov.in",
            is_verified: true
          }
        ],
        created_at: "2025-02-21T16:41:30Z"
      }
    ]
  }
];

export const SEED_DOCUMENTS: LegalDocument[] = [
  {
    id: "doc-msa-2025",
    title: "Master Enterprise Software & Data Processing Agreement — Apex FinTech Ltd.",
    original_filename: "Apex_FinTech_Master_Services_Agreement_v2.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 482910,
    sha256_hash: "8f4b2e91c7d03a65f19e84b2a9d4c77e1230a8f5e6d2c1b09a8e7f6d5c4b3a21",
    page_count: 14,
    ocr_applied: false,
    ai_consent_granted: true,
    processing_status: "READY",
    extracted_text_preview:
      "MASTER ENTERPRISE SERVICES AGREEMENT made at Mumbai on 15th January 2025 between APEX FINTECH SOLUTIONS PRIVATE LIMITED ('Client' / 'Data Fiduciary') and VANGUARD CLOUD INFRASTRUCTURE LLP ('Service Provider' / 'Data Processor'). Clause 9 (Limitation of Liability), Clause 11 (DPDP Act 2023 Compliance), Clause 14 (Dispute Resolution & Arbitration)...",
    analysis_result: {
      executive_summary:
        "This 14-page Master Enterprise Services Agreement governs cloud infrastructure hosting and personal data processing between Apex FinTech Solutions Pvt. Ltd. (Client / Data Fiduciary) and Vanguard Cloud Infrastructure LLP (Service Provider / Data Processor). While the agreement includes data localization and breach notification clauses, it contains three significant legal risks: (1) an asymmetric unilateral arbitrator appointment clause in Clause 14.2 that is unenforceable under CORE (2024 INSC 857), (2) a 72-hour breach reporting window in Clause 11.4 that may be too slow for CERT-In 6-hour cyber incident reporting directions, and (3) an uncapped indemnity carve-out lacking mutuality.",
      parties_and_dates: [
        { label: "First Party (Client / Data Fiduciary)", value: "Apex FinTech Solutions Private Limited (Mumbai)", page: 1 },
        { label: "Second Party (Processor)", value: "Vanguard Cloud Infrastructure LLP (Bengaluru)", page: 1 },
        { label: "Execution Date", value: "15 January 2025", page: 1 },
        { label: "Initial Term", value: "36 Months (01 Feb 2025 to 31 Jan 2028)", page: 3 },
        { label: "Governing Law & Seat", value: "Laws of India; Seat of Arbitration at Mumbai", page: 12 }
      ],
      key_clauses: [
        {
          clause_ref: "Clause 4.2",
          title: "Service Level & Uptime Guarantee",
          summary: "Requires 99.95% monthly uptime with service credit remedies capped at 15% of monthly fee.",
          page: 4
        },
        {
          clause_ref: "Clause 9.1",
          title: "Aggregate Limitation of Liability",
          summary: "Caps Service Provider's aggregate liability at 6 months' fees preceding the claim, excluding IP and confidentiality breaches.",
          page: 8
        },
        {
          clause_ref: "Clause 11.3",
          title: "DPDP Act 2023 Data Processor Obligations",
          summary: "Binds Service Provider to process personal data strictly on documented instructions of the Data Fiduciary and erase data upon termination per Section 8(7) DPDP Act 2023.",
          page: 10
        },
        {
          clause_ref: "Clause 14.2",
          title: "Arbitration & Dispute Resolution",
          summary: "Provides that a Sole Arbitrator shall be unilaterally appointed by the Managing Director of the Client.",
          page: 12
        }
      ],
      obligations: [
        {
          party: "Vanguard Cloud Infrastructure LLP (Service Provider)",
          obligation: "Maintain ISO 27001 certification and host all primary and backup databases within Indian data centers (Mumbai / Hyderabad).",
          clause_ref: "Clause 11.1",
          page: 9
        },
        {
          party: "Apex FinTech Solutions Pvt. Ltd. (Client)",
          obligation: "Ensure valid notice and affirmative consent from Data Principals under Section 6 of the DPDP Act 2023 prior to transmitting personal data.",
          clause_ref: "Clause 11.2",
          page: 10
        },
        {
          party: "Both Parties",
          obligation: "Issue 30 days' written cure notice before exercising termination for material breach.",
          clause_ref: "Clause 13.1",
          page: 11
        }
      ],
      deadlines_and_notice: [
        { event: "Cyber Security / Data Breach Notification", timeline: "Within 72 hours of discovery (Note: CERT-In requires 6 hours)", clause_ref: "Clause 11.4", page: 10 },
        { event: "Cure Period for Material Breach", timeline: "30 calendar days from written notice", clause_ref: "Clause 13.1", page: 11 },
        { event: "Termination for Convenience Notice", timeline: "90 calendar days prior written notice", clause_ref: "Clause 13.3", page: 11 },
        { event: "Post-Termination Data Erasure Certificate", timeline: "Within 15 days of effective termination", clause_ref: "Clause 13.5", page: 12 }
      ],
      risk_flags: [
        {
          severity: "HIGH",
          issue: "Unilateral Sole Arbitrator Appointment in Clause 14.2",
          recommendation: "Clause 14.2 empowers the Client's Managing Director to unilaterally appoint the Sole Arbitrator. This is void under Perkins Eastman (2020) 20 SCC 760 and CORE v. ECI SPIC (2024 INSC 857). Replace with mutual appointment or institutional appointment (MCIA / DIAC).",
          clause_ref: "Clause 14.2",
          page: 12
        },
        {
          severity: "HIGH",
          issue: "72-Hour Cyber Incident Reporting Window Conflicts with CERT-In 6-Hour Mandate",
          recommendation: "Amend Clause 11.4 to require notification within 4 hours of detecting any reportable cyber incident so the Data Fiduciary can meet the 6-hour CERT-In Direction under Section 70B of the IT Act 2000 and DPDP Board notification requirements.",
          clause_ref: "Clause 11.4",
          page: 10
        },
        {
          severity: "MEDIUM",
          issue: "Restraint on Legal Proceedings / Shortened Claim Limitation in Clause 14.5",
          recommendation: "Clause 14.5 states that any claim is extinguished if not raised within 6 months. Under Section 28(b) of the Indian Contract Act, 1872, clauses extinguishing rights prior to statutory limitation are void.",
          clause_ref: "Clause 14.5",
          page: 13
        }
      ],
      qa_history: [
        {
          question: "Is the arbitration clause in this agreement valid under Indian law?",
          answer:
            "No. Clause 14.2 (Page 12) grants the Client's Managing Director the unilateral right to appoint a Sole Arbitrator. Under the Supreme Court's 5-Judge Constitution Bench ruling in Central Organisation for Railway Electrification v. ECI SPIC SMO MCML (JV) (2024 INSC 857) and Perkins Eastman (2020) 20 SCC 760, unilateral appointment of a sole arbitrator by an interested party is invalid under Section 12(5) and Section 18 of the Arbitration and Conciliation Act, 1996.",
          citations: [
            {
              page: 12,
              section_heading: "Clause 14.2 — Reference to Sole Arbitrator",
              excerpt:
                "All disputes arising out of this Agreement shall be referred to a Sole Arbitrator to be appointed solely by the Managing Director of the Client..."
            }
          ],
          asked_at: "2025-02-22T11:20:00Z"
        }
      ]
    },
    created_at: "2025-02-22T11:15:00Z"
  },
  {
    id: "doc-msa-counter-2025",
    title: "Counter-Proposal Redline — Vanguard Cloud Infrastructure LLP (v3)",
    original_filename: "Vanguard_Counter_Proposal_MSA_v3.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    file_size_bytes: 391400,
    sha256_hash: "3c9a1d84e2b7f605a19c8e3d4b5a6f7e8d9c0b1a2e3f4d5c6b7a890123456789",
    page_count: 15,
    ocr_applied: false,
    ai_consent_granted: true,
    processing_status: "READY",
    extracted_text_preview:
      "COUNTER-PROPOSAL REDLINE (v3) dated 18th February 2025. Modifies Clause 9.1 (Liability Cap reduced to 3 months' fees), Clause 11.4 (Incident notification set to 12 hours), and Clause 14.2 (Joint appointment of Sole Arbitrator under Mumbai Centre for International Arbitration rules)...",
    analysis_result: {
      executive_summary:
        "This 15-page counter-proposal (v3) submitted by Vanguard Cloud Infrastructure LLP cures the invalid unilateral arbitration clause by adopting institutional arbitration under MCIA Rules at Mumbai (Clause 14.2). However, it dilutes the aggregate liability cap from 6 months' fees down to 3 months' fees (Clause 9.1) and removes statutory data breach penalties from the super-cap carve-out.",
      parties_and_dates: [
        { label: "First Party", value: "Apex FinTech Solutions Private Limited", page: 1 },
        { label: "Second Party", value: "Vanguard Cloud Infrastructure LLP", page: 1 },
        { label: "Redline Date", value: "18 February 2025", page: 1 }
      ],
      key_clauses: [
        {
          clause_ref: "Clause 9.1",
          title: "Revised Limitation of Liability",
          summary: "Reduces aggregate liability cap from 6 months' fees to 3 months' fees and removes data protection indemnity from uncapped exceptions.",
          page: 8
        },
        {
          clause_ref: "Clause 14.2",
          title: "Institutional Arbitration (MCIA)",
          summary: "Replaces unilateral appointment with a mutually appointed Sole Arbitrator failing which appointment under MCIA Rules.",
          page: 13
        }
      ],
      obligations: [
        {
          party: "Vanguard Cloud Infrastructure LLP",
          obligation: "Report confirmed security breaches within 12 hours of confirmation.",
          clause_ref: "Clause 11.4",
          page: 10
        }
      ],
      deadlines_and_notice: [
        { event: "Security Breach Notification", timeline: "Within 12 hours of confirmation", clause_ref: "Clause 11.4", page: 10 },
        { event: "Cure Period for Material Breach", timeline: "45 calendar days", clause_ref: "Clause 13.1", page: 12 }
      ],
      risk_flags: [
        {
          severity: "HIGH",
          issue: "Removal of Data Protection Indemnity from Liability Cap Carve-Out",
          recommendation: "Re-insert a dedicated super-cap (at least 24 months' fees) for breaches of Clause 11 (DPDP Act 2023 & confidentiality obligations).",
          clause_ref: "Clause 9.2",
          page: 9
        }
      ],
      qa_history: []
    },
    created_at: "2025-02-23T09:40:00Z"
  }
];

export const SEED_DRAFTS: LegalDraft[] = [
  {
    id: "draft-001",
    title: "Statutory Legal Notice for Breach of Commercial Supply & Software Escrow Contract",
    draft_type: "Legal Notice",
    user_facts: {
      client_or_sender_name: "Meridian Precision Engineering Pvt. Ltd., Pune",
      recipient_or_opposite_party: "Kinetix Automation Systems Ltd., Bengaluru",
      jurisdiction_or_forum: "Commercial Courts at Pune / Bombay High Court Jurisdiction",
      chronology_of_facts:
        "1. Master Supply & Integration Contract executed on 10 August 2024 for automated CNC telemetry modules worth INR 1,45,00,000.\n2. Advance tranche of INR 58,00,000 remitted via RTGS on 14 August 2024.\n3. Delivery milestone on 30 November 2024 was missed despite three written extensions.\n4. Cure notice issued on 05 January 2025 under Clause 12.1 went unanswered.",
      relief_or_remedy_sought:
        "Refund of advance sum of INR 58,00,000 along with contractual interest @ 18% p.a. and compensation for direct loss under Section 73 of the Indian Contract Act, 1872 within 15 days of receipt.",
      notice_period_or_deadline: "15 clear days from receipt of notice"
    },
    content_markdown: `> **[AI-GENERATED DRAFT — REQUIRES HUMAN LEGAL REVIEW BEFORE ISSUANCE]**

**WITHOUT PREJUDICE**  
**BY REGISTERED POST A.D. / SPEED POST & ELECTRONIC MAIL**

**Date:** 24 February 2025

**To,**  
**The Board of Directors / Principal Officer,**  
**Kinetix Automation Systems Limited**  
Registered Office: Bengaluru, Karnataka

**Subject:** **STATUTORY LEGAL NOTICE FOR BREACH OF MASTER SUPPLY & INTEGRATION CONTRACT DATED 10.08.2024 AND DEMAND FOR REFUND & COMPENSATION UNDER SECTION 73 OF THE INDIAN CONTRACT ACT, 1872**

Under instructions from and on behalf of **Meridian Precision Engineering Private Limited**, having its registered office at Pune, Maharashtra (hereinafter referred to as **"the Instructing Party"**), the following Legal Notice is hereby served upon you:

1. **Contractual Engagement:** That the Instructing Party and your Company entered into a Master Supply & Integration Contract dated **10 August 2024** for the supply, commissioning, and integration of automated CNC telemetry modules for a total consideration of **INR 1,45,00,000/-** (Rupees One Crore Forty-Five Lakhs Only).
2. **Payment of Advance Consideration:** That strictly in compliance with its contractual obligations, the Instructing Party remitted an advance tranche of **INR 58,00,000/-** (Rupees Fifty-Eight Lakhs Only) on **14 August 2024** via RTGS, receipt whereof was duly acknowledged by your Company.
3. **Material Breach & Default in Delivery:** That time was of the essence of the contract (Section 55, *Indian Contract Act, 1872*), with the binding delivery and commissioning milestone fixed for **30 November 2024**. Your Company failed to deliver the contracted modules despite three written extensions granted in good faith.
4. **Failure to Cure:** That a formal Cure Notice dated **05 January 2025** was served under Clause 12.1 of the Contract, which your Company has failed and neglected to comply with.
5. **Statutory Entitlement to Restitution & Damages:** That by reason of your fundamental breach, the Instructing Party has suffered direct and natural loss arising in the usual course of things and is statutorily entitled to restitution and compensation under **Section 73 of the Indian Contract Act, 1872** (Act No. 9 of 1872).

**DEMAND**

You are hereby called upon within **fifteen (15) clear days** from the receipt of this Legal Notice to:
- **(a)** Refund the principal advance sum of **INR 58,00,000/-** together with contractual interest at **18% per annum** from 14.08.2024 until realization; and
- **(b)** Pay direct damages quantified in terms of Section 73 of the *Indian Contract Act, 1872*;

failing which the Instructing Party shall be constrained to initiate appropriate civil, commercial, and arbitral proceedings before the competent Courts/Tribunal at Pune at your sole risk as to costs and consequences.

A copy of this Notice is retained for evidentiary record under **Section 63 of the Bharatiya Sakshya Adhiniyam, 2023**.

---
*Prepared in AMIL Drafting Studio — Subject to verification of annexures, dates, and counsel signature.*`,
    cited_references: [
      {
        id: "sec-contract-73",
        citation: "Indian Contract Act, 1872 — Section 73",
        title: "Compensation for loss or damage caused by breach of contract",
        type: "STATUTE"
      },
      {
        id: "sec-bsa-63",
        citation: "Bharatiya Sakshya Adhiniyam, 2023 — Section 63",
        title: "Admissibility of electronic records",
        type: "STATUTE"
      }
    ],
    version: 2,
    version_history: [
      {
        version: 1,
        updated_at: "2025-02-20T15:00:00Z",
        summary_note: "Initial fact-sheet generation with Section 73 Indian Contract Act citation.",
        content_markdown: "Initial draft v1 — Statutory Legal Notice for Meridian Precision Engineering Pvt. Ltd."
      },
      {
        version: 2,
        updated_at: "2025-02-23T18:10:00Z",
        summary_note: "Added Section 63 BSA 2023 electronic service preservation clause and RTGS tranche details.",
        content_markdown: "Updated draft v2 with Section 63 BSA 2023 electronic service preservation clause."
      }
    ],
    status: "UNDER_REVIEW",
    created_at: "2025-02-20T15:00:00Z",
    updated_at: "2025-02-23T18:10:00Z"
  }
];

export const SEED_FOLDERS: LibraryFolder[] = [
  {
    id: "fld-crim-2024",
    name: "Criminal Law Transition (BNS / BNSS / BSA)",
    color_hex: "#D6B66D",
    description: "Comparative statutory research and savings clause notes on July 1, 2024 criminal law overhaul.",
    item_count: 3,
    created_at: "2025-01-12T10:00:00Z"
  },
  {
    id: "fld-comm-arb",
    name: "Commercial Contracts & Arbitration",
    color_hex: "#3BAA83",
    description: "Supreme Court precedents on Section 12(5) Arbitration Act, Section 73 Contract Act, and MSAs.",
    item_count: 2,
    created_at: "2025-01-18T11:30:00Z"
  },
  {
    id: "fld-dpdp-tech",
    name: "DPDP Act 2023 & Electronic Evidence",
    color_hex: "#4D88E5",
    description: "Data Fiduciary consent obligations, CERT-In mandates, and Section 63 BSA certification.",
    item_count: 2,
    created_at: "2025-02-02T09:15:00Z"
  }
];

export const SEED_BOOKMARKS: LibraryBookmark[] = [
  {
    id: "bmk-001",
    folder_id: "fld-dpdp-tech",
    item_type: "JUDGMENT",
    target_id: "jud-arjun-2020",
    title: "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal & Ors.",
    citation: "2020 INSC 453 | (2020) 7 SCC 1",
    excerpt:
      "Certificate under Section 65B(4) IEA (now Section 63(4) BSA 2023) is a mandatory condition precedent for secondary electronic evidence.",
    tags: ["Electronic Evidence", "Section 63 BSA", "Binding Precedent"],
    created_at: "2025-02-10T14:20:00Z"
  },
  {
    id: "bmk-002",
    folder_id: "fld-comm-arb",
    item_type: "JUDGMENT",
    target_id: "jud-core-2024",
    title: "Central Organisation for Railway Electrification v. ECI SPIC SMO MCML (JV)",
    citation: "2024 INSC 857",
    excerpt:
      "Five-Judge Constitution Bench holding unilateral arbitrator appointment and mandatory PSU-curated panels invalid under Section 18 and Article 14.",
    tags: ["Arbitration", "Constitution Bench", "Commercial Law"],
    created_at: "2025-02-14T16:05:00Z"
  },
  {
    id: "bmk-003",
    folder_id: "fld-crim-2024",
    item_type: "SECTION",
    target_id: "sec-bns-318",
    title: "BNS 2023 — Section 318 (Cheating and dishonestly inducing delivery of property)",
    citation: "Act No. 45 of 2023, s. 318 (Replaces IPC s. 415 & s. 420)",
    excerpt:
      "Consolidates former IPC Sections 415, 417, 418, and 420; retains 7-year maximum imprisonment under Section 318(4).",
    tags: ["BNS 2023", "IPC 420 Comparison", "Cheating"],
    created_at: "2025-02-16T11:45:00Z"
  },
  {
    id: "bmk-004",
    folder_id: "fld-crim-2024",
    item_type: "SECTION",
    target_id: "sec-bnss-173",
    title: "BNSS 2023 — Section 173 (Zero FIR & Electronic FIR in Cognizable Cases)",
    citation: "Act No. 46 of 2023, s. 173 (Replaces CrPC s. 154)",
    excerpt:
      "Codifies Zero FIR irrespective of territorial jurisdiction and Electronic FIR signed within 3 days.",
    tags: ["BNSS 2023", "Zero FIR", "e-FIR"],
    created_at: "2025-02-18T09:30:00Z"
  },
  {
    id: "bmk-005",
    folder_id: "fld-dpdp-tech",
    item_type: "AI_ANSWER",
    target_id: "conv-001",
    title: "Juris Analysis: Section 63 BSA 2023 vs Section 65B IEA Electronic Evidence Certification",
    citation: "Verified Juris Research Note (2025-02-23)",
    excerpt:
      "Detailed comparison of primary device production under Section 57 BSA vs secondary computer output requiring Part A & Part B Schedule Certificate under Section 63(4) BSA.",
    tags: ["Juris Answer", "BSA 2023", "Electronic Evidence"],
    created_at: "2025-02-23T10:20:00Z"
  }
];

export const SEED_NOTES: LibraryNote[] = [
  {
    id: "note-001",
    folder_id: "fld-crim-2024",
    title: "Cut-off Date Checklist for BNS/BNSS/BSA vs IPC/CrPC/IEA (July 1, 2024)",
    content:
      "1. Offences committed BEFORE 01 July 2024: Substantive offence remains governed by IPC 1860 under Section 358(2) BNS savings clause.\n2. FIR registered ON OR AFTER 01 July 2024 for an offence committed before 01 July 2024: Substantive charge under IPC 1860, while procedural applicability of BNSS 2023 vs CrPC 1973 depends on whether investigation/inquiry was already pending before 01-07-2024 under Section 531(2)(a) BNSS.\n3. Offences committed ON OR AFTER 01 July 2024: Governed in full by BNS 2023, BNSS 2023, and BSA 2023.",
    linked_entity_type: "ACT",
    linked_entity_id: "act-bns-2023",
    linked_entity_label: "Bharatiya Nyaya Sanhita, 2023 (Section 358 Savings)",
    tags: ["Practice Note", "July 1 2024 Transition", "BNS 358"],
    is_pinned: true,
    created_at: "2025-02-12T17:00:00Z",
    updated_at: "2025-02-19T12:00:00Z"
  },
  {
    id: "note-002",
    folder_id: "fld-comm-arb",
    title: "Drafting Checklist for Dispute Resolution Clauses Post-CORE (2024 INSC 857)",
    content:
      "- Never give either party's Managing Director or officer unilateral power to appoint a Sole Arbitrator.\n- Avoid clauses requiring the counterparty to nominate its arbitrator from a closed 3- or 5-member panel curated by one party.\n- Prefer institutional appointment rules (MCIA Mumbai, DIAC New Delhi, IAMC Hyderabad) or mutual agreement failing which Section 11 application.",
    linked_entity_type: "JUDGMENT",
    linked_entity_id: "jud-core-2024",
    linked_entity_label: "CORE v. ECI SPIC SMO MCML (2024 INSC 857)",
    tags: ["Contract Drafting", "Arbitration", "CORE 2024"],
    is_pinned: true,
    created_at: "2025-02-21T18:00:00Z",
    updated_at: "2025-02-21T18:00:00Z"
  }
];

export const SEED_TASKS: LegalTask[] = [
  {
    id: "tsk-001",
    title: "Finalize Clause 14.2 Arbitration Redline in Apex FinTech MSA",
    description:
      "Replace unilateral arbitrator appointment in Clause 14.2 with MCIA institutional appointment rule per CORE (2024 INSC 857) and restore 24-month super-cap for DPDP Act breaches.",
    task_type: "DRAFT_REVIEW",
    priority: "URGENT",
    status: "IN_PROGRESS",
    due_at: "2025-02-26T17:00:00Z",
    reminder_at: "2025-02-26T10:00:00Z",
    linked_entity_type: "DOCUMENT",
    linked_entity_label: "Apex_FinTech_Master_Services_Agreement_v2.pdf",
    completed_at: null,
    created_at: "2025-02-22T12:00:00Z"
  },
  {
    id: "tsk-002",
    title: "Prepare Section 63(4) BSA 2023 Schedule Certificate (Part A & Part B)",
    description:
      "Verify SHA-256 hash values and device serial particulars for electronic email & RTGS annexures in Meridian Precision Engineering legal notice.",
    task_type: "FILING_DEADLINE",
    priority: "HIGH",
    status: "TODO",
    due_at: "2025-02-28T15:00:00Z",
    reminder_at: "2025-02-27T11:00:00Z",
    linked_entity_type: "DRAFT",
    linked_entity_label: "Statutory Legal Notice — Meridian Precision Engineering",
    completed_at: null,
    created_at: "2025-02-23T14:00:00Z"
  },
  {
    id: "tsk-003",
    title: "Research BNSS Section 173(3) Preliminary Enquiry High Court Rulings",
    description:
      "Compile recent High Court interpretations on the 14-day preliminary enquiry timeline for commercial offences punishable between 3 and 7 years.",
    task_type: "RESEARCH",
    priority: "MEDIUM",
    status: "TODO",
    due_at: "2025-03-04T18:00:00Z",
    reminder_at: "2025-03-03T09:30:00Z",
    linked_entity_type: "SECTION",
    linked_entity_label: "BNSS 2023 — Section 173",
    completed_at: null,
    created_at: "2025-02-23T16:30:00Z"
  },
  {
    id: "tsk-004",
    title: "Verify DPDP Act Section 6 Consent Banner & Data Retention Policy",
    description:
      "Completed audit of affirmative consent notice and right-to-erasure workflow.",
    task_type: "CASE_REMINDER",
    priority: "LOW",
    status: "COMPLETED",
    due_at: "2025-02-19T17:00:00Z",
    reminder_at: null,
    linked_entity_type: "SECTION",
    linked_entity_label: "DPDP Act 2023 — Section 6",
    completed_at: "2025-02-19T15:20:00Z",
    created_at: "2025-02-15T10:00:00Z"
  }
];

export const SEED_HISTORY: AuditHistoryEntry[] = [
  {
    id: "hist-001",
    action: "JURIS_CONSULTATION",
    title: "Consulted Juris AI on Section 63 BSA 2023 vs Section 65B IEA Electronic Evidence",
    query_or_reference: "Admissibility of WhatsApp & Server Logs under Section 63 BSA 2023 vs Section 65B IEA",
    module_path: "/juris?conv=conv-001",
    metadata_label: "Detailed Mode • 2 Verified Citations",
    created_at: "2025-02-23T10:16:12Z"
  },
  {
    id: "hist-002",
    action: "ANALYZE_DOCUMENT",
    title: "Analyzed Master Enterprise Services Agreement — Apex FinTech Ltd.",
    query_or_reference: "Apex_FinTech_Master_Services_Agreement_v2.pdf (SHA-256 Verified)",
    module_path: "/documents",
    metadata_label: "14 Pages • 3 Risk Flags Identified",
    created_at: "2025-02-22T11:15:00Z"
  },
  {
    id: "hist-003",
    action: "VIEW_STATUTE",
    title: "Compared BNS 2023 Section 318 with IPC 1860 Section 420",
    query_or_reference: "The Bharatiya Nyaya Sanhita, 2023 — Section 318 (Cheating)",
    module_path: "/bare-acts",
    metadata_label: "India Code • Version Comparison",
    created_at: "2025-02-22T09:40:00Z"
  },
  {
    id: "hist-004",
    action: "VIEW_JUDGMENT",
    title: "Inspected Precedent: Central Organisation for Railway Electrification v. ECI SPIC",
    query_or_reference: "2024 INSC 857 (5-Judge Constitution Bench)",
    module_path: "/case-laws",
    metadata_label: "Supreme Court e-SCR • BINDING",
    created_at: "2025-02-21T16:35:00Z"
  },
  {
    id: "hist-005",
    action: "GENERATE_DRAFT",
    title: "Generated Statutory Legal Notice — Meridian Precision Engineering Pvt. Ltd.",
    query_or_reference: "Section 73 Indian Contract Act, 1872 & Section 63 BSA 2023",
    module_path: "/drafting",
    metadata_label: "Drafting Studio • Version 2",
    created_at: "2025-02-20T15:00:00Z"
  },
  {
    id: "hist-006",
    action: "SEARCH_QUERY",
    title: "Hybrid Search: 'mandatory arrest checklist 7 years section 35 BNSS Arnesh Kumar'",
    query_or_reference: "mandatory arrest checklist 7 years section 35 BNSS Arnesh Kumar",
    module_path: "/research?q=Arnesh+Kumar+Section+35+BNSS",
    metadata_label: "Unified Search • 5 Authorities Found",
    created_at: "2025-02-19T14:10:00Z"
  }
];
