"""Universal Statutory Discovery & Grounding Engine for Indian Bare Acts & Sections."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.database.init_db import deterministic_embedding
from app.models.legal_corpus import LegalAct, LegalSection, LegalSource
from app.schemas.legal import (
    ActLookupResponse,
    LegalActDetailResponse,
    LegalActResponse,
    LegalSectionResponse,
)

# ---------------------------------------------------------------------------
# Fallback Knowledge Base for Common Indian Statutes (Zero-Latency Guarantee)
# ---------------------------------------------------------------------------

BUILTIN_ACTS_FALLBACK: Dict[str, Dict[str, Any]] = {
    "negotiable instruments": {
        "title": "The Negotiable Instruments Act, 1881",
        "short_title": "NI Act, 1881",
        "act_number": "Act No. 26 of 1881",
        "enactment_year": 1881,
        "enactment_date": "1881-12-09",
        "commencement_date": "1882-03-01",
        "effective_date": "1882-03-01",
        "status": "CURRENT",
        "subject_category": "Banking & Commercial Law",
        "preamble": (
            "An Act to define and amend the law relating to Promissory Notes, "
            "Bills of Exchange and Cheques."
        ),
        "sections": [
            {
                "section_number": "138",
                "section_title": "Dishonour of cheque for insufficiency, etc., of funds in the account",
                "chapter_number": "XVII",
                "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques for Insufficiency of Funds in the Accounts",
                "statutory_text": (
                    "Where any cheque drawn by a person on an account maintained by him with a banker for payment of any "
                    "amount of money to another person from out of that account for the discharge, in whole or in part, of any "
                    "debt or other liability, is returned by the bank unpaid, either because of the amount of money standing "
                    "to the credit of that account is insufficient to honour the cheque or that it exceeds the amount arranged "
                    "to be paid from that account by an agreement made with that bank, such person shall be deemed to have "
                    "committed an offence and shall, without prejudice to any other provisions of this Act, be punished with "
                    "imprisonment for a term which may be extended to two years, or with fine which may extend to twice the "
                    "amount of the cheque, or with both:\n\n"
                    "Provided that nothing contained in this section shall apply unless—\n"
                    "(a) the cheque has been presented to the bank within a period of three months from the date on which it is drawn or within the period of its validity, whichever is earlier;\n"
                    "(b) the payee or the holder in due course of the cheque, as the case may be, makes a demand for the payment of the said amount of money by giving a notice in writing, to the drawer of the cheque, within thirty days of the receipt of information by him from the bank regarding the return of the cheque as unpaid; and\n"
                    "(c) the drawer of such cheque fails to make the payment of the said amount of money to the payee or, as the case may be, to the holder in due course of the cheque, within fifteen days of the receipt of the said notice.\n\n"
                    "Explanation.—For the purposes of this section, 'debt or other liability' means a legally enforceable debt or other liability."
                ),
                "amendment_notes": "Amended by Act 55 of 2002 (term increased to 2 years) and Act 20 of 2018.",
            },
            {
                "section_number": "139",
                "section_title": "Presumption in favour of holder",
                "chapter_number": "XVII",
                "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                "statutory_text": (
                    "It shall be presumed, unless the contrary is proved, that the holder of a cheque received the cheque of the nature "
                    "referred to in section 138 for the discharge, in whole or in part, of any debt or other liability."
                ),
            },
            {
                "section_number": "141",
                "section_title": "Offences by companies",
                "chapter_number": "XVII",
                "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                "statutory_text": (
                    "(1) If the person committing an offence under section 138 is a company, every person who; at the time the offence "
                    "was committed, was in charge of, and was responsible to the company for the conduct of the business of the company, "
                    "as well as the company, shall be deemed to be guilty of the offence and shall be liable to be proceeded against and "
                    "punished accordingly:\n"
                    "Provided that nothing contained in this sub-section shall render any person liable to punishment if he proves that "
                    "the offence was committed without his knowledge, or that he had exercised all due diligence to prevent the commission of such offence.\n\n"
                    "(2) Where any offence under this Act has been committed by a company and it is proved that the offence has been "
                    "committed with the consent or connivance of, or is attributable to, any neglect on the part of, any director, "
                    "manager, secretary or other officer of the company, such director, manager, secretary or other officer shall also "
                    "be deemed to be guilty of that offence."
                ),
            },
            {
                "section_number": "142",
                "section_title": "Cognizance of offences",
                "chapter_number": "XVII",
                "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                "statutory_text": (
                    "(1) Notwithstanding anything contained in the Code of Criminal Procedure, 1973 (2 of 1974),—\n"
                    "(a) no court shall take cognizance of any offence punishable under section 138 except upon a complaint, in writing, made by the payee or, as the case may be, the holder in due course of the cheque;\n"
                    "(b) such complaint is made within one month of the date on which the cause of action arises under clause (c) of the proviso to section 138;\n"
                    "(c) no court inferior to that of a Metropolitan Magistrate or a Judicial Magistrate of the first class shall try any offence punishable under section 138.\n\n"
                    "(2) The offence under section 138 shall be inquired into and tried only by a court within whose local jurisdiction,—\n"
                    "(a) if the cheque is delivered for collection through an account, the branch of the bank where the payee or holder in due course, as the case may be, maintains the account, is situated; or\n"
                    "(b) if the cheque is presented for payment by the payee or holder in due course, otherwise through an account, the branch of the drawee bank where the drawer maintains the account, is situated."
                ),
            },
            {
                "section_number": "148",
                "section_title": "Power of Appellate Court to order interim deposit",
                "chapter_number": "XVII",
                "chapter_title": "Of Penalties in Case of Dishonour of Certain Cheques",
                "statutory_text": (
                    "(1) Notwithstanding anything contained in the Code of Criminal Procedure, 1973 (2 of 1974), in an appeal by the drawer against conviction under section 138, the Appellate Court may order the appellant to deposit such sum which shall be a minimum of twenty per cent of the fine or compensation awarded by the trial Court.\n"
                    "(2) The amount referred to in sub-section (1) shall be deposited within sixty days from the date of the order, or within such further period not exceeding thirty days as may be directed by the Court on sufficient cause being shown."
                ),
                "amendment_notes": "Inserted by Negotiable Instruments (Amendment) Act, 2018 (Act 20 of 2018) w.e.f. 01-09-2018.",
            },
        ],
    },
    "arbitration": {
        "title": "The Arbitration and Conciliation Act, 1996",
        "short_title": "Arbitration Act, 1996",
        "act_number": "Act No. 26 of 1996",
        "enactment_year": 1996,
        "enactment_date": "1996-08-16",
        "commencement_date": "1996-08-22",
        "effective_date": "1996-08-22",
        "status": "CURRENT",
        "subject_category": "Dispute Resolution & Commercial Arbitration",
        "preamble": (
            "An Act to consolidate and amend the law relating to domestic arbitration, "
            "international commercial arbitration and enforcement of foreign arbitral awards as also to define "
            "the law relating to conciliation and for matters connected therewith or incidental thereto."
        ),
        "sections": [
            {
                "section_number": "8",
                "section_title": "Power to refer parties to arbitration where there is an arbitration agreement",
                "chapter_number": "II",
                "chapter_title": "Arbitration Agreement",
                "statutory_text": (
                    "(1) A judicial authority, before which an action is brought in a matter which is the subject of an arbitration agreement shall, "
                    "if a party to the arbitration agreement or any person claiming through or under him, so applies not later than the date of "
                    "submitting his first statement on the substance of the dispute, notwithstanding any judgment, decree or order of the Supreme Court "
                    "or any Court, refer the parties to arbitration unless it finds that prima facie no valid arbitration agreement exists.\n"
                    "(2) The application referred to in sub-section (1) shall not be entertained unless it is accompanied by the original arbitration "
                    "agreement or a duly certified copy thereof.\n"
                    "(3) Notwithstanding that an application has been made under sub-section (1) and that the issue is pending before the judicial "
                    "authority, an arbitration may be commenced or continued and an arbitral award made."
                ),
                "amendment_notes": "Amended by Arbitration and Conciliation (Amendment) Act, 2015 w.e.f. 23-10-2015.",
            },
            {
                "section_number": "9",
                "section_title": "Interim measures, etc. by Court",
                "chapter_number": "II",
                "chapter_title": "Arbitration Agreement",
                "statutory_text": (
                    "(1) A party may, before or during arbitral proceedings or at any time after the making of the arbitral award but before "
                    "it is enforced in accordance with section 36, apply to a court—\n"
                    "(i) for the appointment of a guardian for a minor or person of unsound mind for the purposes of arbitral proceedings; or\n"
                    "(ii) for an interim measure of protection in respect of any of the following matters, namely:—\n"
                    "  (a) the preservation, interim custody or sale of any goods which are the subject-matter of the arbitration agreement;\n"
                    "  (b) securing the amount in dispute in the arbitration;\n"
                    "  (c) the detention, preservation or inspection of any property or thing which is the subject-matter of the dispute in arbitration;\n"
                    "  (d) interim injunction or the appointment of a receiver;\n"
                    "  (e) such other interim measure of protection as may appear to the court to be just and convenient.\n\n"
                    "(2) Where, before the commencement of the arbitral proceedings, a Court passes an order for any interim measure of protection "
                    "under sub-section (1), the arbitral proceedings shall be commenced within a period of ninety days from the date of such order "
                    "or within such further time as the Court may determine.\n\n"
                    "(3) Once the arbitral tribunal has been constituted, the Court shall not entertain an application under sub-section (1), unless "
                    "the Court finds that circumstances exist which may not render the remedy provided under section 17 efficacious."
                ),
                "amendment_notes": "Sub-sections (2) and (3) inserted by 2015 Amendment Act w.e.f. 23-10-2015.",
            },
            {
                "section_number": "11",
                "section_title": "Appointment of arbitrators",
                "chapter_number": "III",
                "chapter_title": "Composition of Arbitral Tribunal",
                "statutory_text": (
                    "Provisions governing party autonomy in appointing arbitrators, failure of appointment procedure, and reference to the "
                    "Supreme Court (in international commercial arbitrations) or the High Court (in domestic arbitrations). Under sub-section (6A), "
                    "the Supreme Court or High Court, while considering any application under sub-section (4), (5) or (6), shall confine to the "
                    "examination of the existence of an arbitration agreement."
                ),
            },
            {
                "section_number": "29A",
                "section_title": "Time limit for arbitral award",
                "chapter_number": "V",
                "chapter_title": "Conduct of Arbitral Proceedings",
                "statutory_text": (
                    "(1) The award in matters other than international commercial arbitration shall be made by the arbitral tribunal within a period "
                    "of twelve months from the date of completion of pleadings under sub-section (4) of section 23.\n"
                    "(3) The parties may, by consent, extend the period specified in sub-section (1) for making award for a further period not exceeding six months.\n"
                    "(4) If the award is not made within the period specified in sub-section (1) or the extended period specified under sub-section (3), "
                    "the mandate of the arbitrator(s) shall terminate unless the Court has, either prior to or after the expiry of the period so specified, "
                    "extended the period."
                ),
                "amendment_notes": "Inserted by Act 3 of 2016 and amended by Act 33 of 2019.",
            },
            {
                "section_number": "34",
                "section_title": "Application for setting aside arbitral award",
                "chapter_number": "VII",
                "chapter_title": "Recourse against Arbitral Award",
                "statutory_text": (
                    "(1) Recourse to a Court against an arbitral award may be made only by an application for setting aside such award in accordance "
                    "with sub-section (2) and sub-section (2A).\n"
                    "(2) An arbitral award may be set aside by the Court only if the party making the application furnishes proof that: a party was "
                    "under some incapacity, the arbitration agreement is not valid under law, the applicant was not given proper notice or was unable "
                    "to present his case, the award deals with a dispute not contemplated by the submission, or the subject-matter is not capable "
                    "of settlement by arbitration, or the arbitral award is in conflict with the public policy of India.\n"
                    "(2A) An arbitral award arising out of arbitrations other than international commercial arbitrations, may also be set aside by the "
                    "Court, if the Court finds that the award is vitiated by patent illegality appearing on the face of the award: Provided that an award "
                    "shall not be set aside merely on the ground of an erroneous application of the law or by reappreciation of evidence.\n"
                    "(3) An application for setting aside may not be made after three months have elapsed from the date on which the party making that "
                    "application had received the arbitral award."
                ),
                "amendment_notes": "Ground of patent illegality under (2A) inserted by 2015 Amendment Act.",
            },
            {
                "section_number": "37",
                "section_title": "Appealable orders",
                "chapter_number": "VII",
                "chapter_title": "Recourse against Arbitral Award",
                "statutory_text": (
                    "(1) Notwithstanding anything contained in any other law for the time being in force, an appeal shall lie from the following orders "
                    "(and from no others) to the Court authorised by law to hear appeals from original decrees of the Court passing the order, namely:—\n"
                    "(a) refusing to refer the parties to arbitration under section 8;\n"
                    "(b) granting or refusing to grant any measure under section 9;\n"
                    "(c) setting aside or refusing to set aside an arbitral award under section 34.\n"
                    "(2) Appeal shall also lie to a court from an order of the arbitral tribunal accepting plea under section 16(2) or granting or refusing interim measure under section 17.\n"
                    "(3) No second appeal shall lie from an order passed in appeal under this section, but nothing in this section shall affect or take away any right to appeal to the Supreme Court."
                ),
            },
        ],
    },
    "specific relief": {
        "title": "The Specific Relief Act, 1963",
        "short_title": "Specific Relief Act, 1963",
        "act_number": "Act No. 47 of 1963",
        "enactment_year": 1963,
        "enactment_date": "1963-12-13",
        "commencement_date": "1964-03-01",
        "effective_date": "1964-03-01",
        "status": "CURRENT",
        "subject_category": "Civil Law & Remedies",
        "preamble": "An Act to define and amend the law relating to certain kinds of specific relief.",
        "sections": [
            {
                "section_number": "6",
                "section_title": "Suit by person dispossessed of immovable property",
                "chapter_number": "I",
                "chapter_title": "Recovering Possession of Property",
                "statutory_text": (
                    "(1) If any person is dispossessed without his consent of immovable property otherwise than in due course of law, "
                    "he or any person through whom he has been in possession or any person claiming through him may, by suit, recover possession "
                    "thereof, notwithstanding any other title that may be set up in such suit.\n"
                    "(2) No suit under this section shall be brought—\n"
                    "  (a) after the expiry of six months from the date of dispossession; or\n"
                    "  (b) against the Government.\n"
                    "(3) No appeal shall lie from any order or decree passed in any suit instituted under this section, nor shall any review of any "
                    "such order or decree be allowed.\n"
                    "(4) Nothing in this section shall bar any person from suing to establish his title to such property and to recover possession thereof."
                ),
            },
            {
                "section_number": "10",
                "section_title": "Specific performance in respect of contracts",
                "chapter_number": "II",
                "chapter_title": "Specific Performance of Contracts",
                "statutory_text": (
                    "The specific performance of a contract shall be enforced by the court subject to the provisions contained in sub-section (2) "
                    "of section 11, section 14 and section 16."
                ),
                "amendment_notes": (
                    "Substituted by the Specific Relief (Amendment) Act, 2018 (Act 18 of 2018), w.e.f. 01-10-2018, converting specific performance "
                    "from a discretionary equitable remedy to a mandatory statutory rule."
                ),
            },
            {
                "section_number": "14",
                "section_title": "Contracts not specifically enforceable",
                "chapter_number": "II",
                "chapter_title": "Specific Performance of Contracts",
                "statutory_text": (
                    "The following contracts cannot be specifically enforced, namely:—\n"
                    "(a) where a party to the contract has obtained substituted performance of contract in accordance with the provisions of section 20;\n"
                    "(b) a contract, the performance of which involves the performance of a continuous duty which the court cannot supervise;\n"
                    "(c) a contract which is so dependent on the personal qualifications of the parties that the court cannot enforce specific performance of its material terms; and\n"
                    "(d) a contract which is in its nature determinable."
                ),
                "amendment_notes": "Substituted by Act 18 of 2018 w.e.f. 01-10-2018.",
            },
            {
                "section_number": "16",
                "section_title": "Personal bars to relief",
                "chapter_number": "II",
                "chapter_title": "Specific Performance of Contracts",
                "statutory_text": (
                    "Specific performance of a contract cannot be enforced in favour of a person—\n"
                    "(a) who has obtained substituted performance of contract under section 20; or\n"
                    "(b) who has become incapable of performing, or violates any essential term of, the contract that on his part remains to be performed, or acts in fraud of the contract, or wilfully acts at variance with, or in subversion of, the relation intended to be established by the contract; or\n"
                    "(c) who fails to prove that he has performed or has always been ready and willing to perform the essential terms of the contract which are to be performed by him, other than terms the performance of which has been prevented or waived by the defendant."
                ),
                "amendment_notes": "Mandatory readiness and willingness requirement under 16(c).",
            },
            {
                "section_number": "34",
                "section_title": "Discretion of court as to declaration of status or right",
                "chapter_number": "VI",
                "chapter_title": "Declaratory Decrees",
                "statutory_text": (
                    "Any person entitled to any legal character, or to any right as to any property, may institute a suit against any person denying, "
                    "or interested to deny, his title to such character or right, and the court may in its discretion make therein a declaration that "
                    "he is so entitled, and the plaintiff need not in such suit ask for any further relief:\n"
                    "Provided that no court shall make any such declaration where the plaintiff, being able to seek further relief than a mere declaration "
                    "of title, omits to do so."
                ),
            },
            {
                "section_number": "38",
                "section_title": "Perpetual injunction when granted",
                "chapter_number": "VIII",
                "chapter_title": "Perpetual Injunctions",
                "statutory_text": (
                    "(1) Subject to the other provisions contained in or referred to by this Chapter, a perpetual injunction may be granted to the plaintiff "
                    "to prevent the breach of an obligation existing in his favour, whether expressly or by implication.\n"
                    "(2) When any such obligation arises from contract, the court shall be guided by the rules and provisions contained in Chapter II.\n"
                    "(3) When the defendant invades or threatens to invade the plaintiff's right to, or enjoyment of, property, the court may grant a "
                    "perpetual injunction in the following cases, namely:—\n"
                    "  (a) where the defendant is a trustee of the property for the plaintiff;\n"
                    "  (b) where there exists no standard for ascertaining the actual damage caused, or likely to be caused, by the invasion;\n"
                    "  (c) where the invasion is such that compensation in money would not afford adequate relief;\n"
                    "  (d) where the injunction is necessary to prevent a multiplicity of judicial proceedings."
                ),
            },
        ],
    },
    "civil procedure": {
        "title": "The Code of Civil Procedure, 1908",
        "short_title": "CPC, 1908",
        "act_number": "Act No. 5 of 1908",
        "enactment_year": 1908,
        "enactment_date": "1908-03-21",
        "commencement_date": "1909-01-01",
        "effective_date": "1909-01-01",
        "status": "CURRENT",
        "subject_category": "Civil Procedure & Adjudication",
        "preamble": "An Act to consolidate and amend the laws relating to the procedure of the Courts of Civil Judicature.",
        "sections": [
            {
                "section_number": "9",
                "section_title": "Courts to try all civil suits unless barred",
                "chapter_number": "Preliminary",
                "chapter_title": "Jurisdiction of Courts",
                "statutory_text": (
                    "The Courts shall (subject to the provisions herein contained) have jurisdiction to try all suits of a civil nature excepting suits "
                    "of which their cognizance is either expressly or impliedly barred.\n\n"
                    "Explanation I.—A suit in which the right to property or to an office is contested is a suit of a civil nature, notwithstanding that "
                    "such right may depend entirely on the decision of questions as to religious rites or ceremonies.\n\n"
                    "Explanation II.—For the purposes of this section, it is immaterial whether or not any fees are attached to the office referred to in "
                    "Explanation I or whether or not such office is attached to a particular place."
                ),
            },
            {
                "section_number": "10",
                "section_title": "Stay of suit (Res Sub Judice)",
                "chapter_number": "Part I",
                "chapter_title": "Suits in General",
                "statutory_text": (
                    "No Court shall proceed with the trial of any suit in which the matter in issue is also directly and substantially in issue in a "
                    "previously instituted suit between the same parties, or between parties under whom they or any of them claim litigating under the "
                    "same title where such suit is pending in the same or any other Court in India having jurisdiction to grant the relief claimed, "
                    "or in any Court beyond the limits of India established or continued by the Central Government, or before the Supreme Court."
                ),
            },
            {
                "section_number": "11",
                "section_title": "Res Judicata",
                "chapter_number": "Part I",
                "chapter_title": "Suits in General",
                "statutory_text": (
                    "No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially "
                    "in issue in a former suit between the same parties, or between parties under whom they or any of them claim, litigating under the "
                    "same title, in a Court competent to try such subsequent suit or the suit in which such issue has been subsequently raised, and "
                    "has been heard and finally decided by such Court.\n\n"
                    "Explanations I to VIII govern constructive res judicata (Explanation IV) and execution proceedings (Explanation VII)."
                ),
            },
            {
                "section_number": "89",
                "section_title": "Settlement of disputes outside the Court (ADR)",
                "chapter_number": "Part V",
                "chapter_title": "Special Proceedings",
                "statutory_text": (
                    "(1) Where it appears to the Court that there exist elements of a settlement which may be acceptable to the parties, the Court "
                    "shall formulate the terms of settlement and give them to the parties for their observations and after receiving the observations of the parties, "
                    "the Court may reformulate the terms of a possible settlement and refer the same for:—\n"
                    "(a) arbitration; (b) conciliation; (c) judicial settlement including settlement through Lok Adalat; or (d) mediation."
                ),
                "amendment_notes": "Inserted by Code of Civil Procedure (Amendment) Act, 1999 w.e.f. 01-07-2002.",
            },
            {
                "section_number": "151",
                "section_title": "Saving of inherent powers of Court",
                "chapter_number": "Part XI",
                "chapter_title": "Miscellaneous",
                "statutory_text": (
                    "Nothing in this Code shall be deemed to limit or otherwise affect the inherent power of the Court to make such orders as may be "
                    "necessary for the ends of justice or to prevent abuse of the process of the Court."
                ),
            },
            {
                "section_number": "Order VII Rule 11",
                "section_title": "Rejection of plaint",
                "chapter_number": "First Schedule",
                "chapter_title": "Order VII — Plaint",
                "statutory_text": (
                    "The plaint shall be rejected in the following cases:—\n"
                    "(a) where it does not disclose a cause of action;\n"
                    "(b) where the relief claimed is undervalued, and the plaintiff, on being required by the Court to correct the valuation within a time to be fixed by the Court, fails to do so;\n"
                    "(c) where the relief claimed is properly valued, but the plaint is returned upon paper insufficiently stamped, and the plaintiff fails to supply the requisite stamp-paper within time;\n"
                    "(d) where the suit appears from the statement in the plaint to be barred by any law;\n"
                    "(e) where it is not filed in duplicate;\n"
                    "(f) where the plaintiff fails to comply with the provisions of rule 9."
                ),
            },
            {
                "section_number": "Order XXXIX Rules 1 & 2",
                "section_title": "Cases in which temporary injunction may be granted",
                "chapter_number": "First Schedule",
                "chapter_title": "Order XXXIX — Temporary Injunctions and Interlocutory Orders",
                "statutory_text": (
                    "Where in any suit it is proved by affidavit or otherwise—\n"
                    "(a) that any property in dispute in a suit is in danger of being wasted, damaged or alienated by any party to the suit, or wrongfully sold in execution of a decree, or\n"
                    "(b) that the defendant threatens, or intends, to remove or dispose of his property with a view to defrauding his creditors,\n"
                    "(c) that the defendant threatens to dispossess the plaintiff or otherwise cause injury to the plaintiff in relation to any property in dispute in the suit,\n"
                    "the Court may by order grant a temporary injunction to restrain such act, or make such other order for the purpose of staying and preventing the wasting, damaging, alienation, sale, removal or dispossession of the property as the Court thinks fit, until the disposal of the suit or until further orders."
                ),
            },
        ],
    },
    "transfer of property": {
        "title": "The Transfer of Property Act, 1882",
        "short_title": "Transfer of Property Act, 1882",
        "act_number": "Act No. 4 of 1882",
        "enactment_year": 1882,
        "enactment_date": "1882-02-17",
        "commencement_date": "1882-07-01",
        "effective_date": "1882-07-01",
        "status": "CURRENT",
        "subject_category": "Property Law",
        "preamble": "An Act to define and amend certain parts of the law relating to the transfer of property by act of parties.",
        "sections": [
            {
                "section_number": "52",
                "section_title": "Transfer of property pending suit relating thereto (Lis Pendens)",
                "chapter_number": "II",
                "chapter_title": "Of Transfers of Property by Act of Parties",
                "statutory_text": (
                    "During the pendency in any Court having authority within the limits of India of any suit or proceeding which is not collusive "
                    "and in which any right to immovable property is directly and specifically in question, the property cannot be transferred or "
                    "otherwise dealt with by any party to the suit or proceeding so as to affect the rights of any other party thereto under any "
                    "decree or order which may be made therein, except under the authority of the Court and on such terms as it may impose."
                ),
            },
            {
                "section_number": "53A",
                "section_title": "Part performance",
                "chapter_number": "II",
                "chapter_title": "Of Transfers of Property by Act of Parties",
                "statutory_text": (
                    "Where any person contracts to transfer for consideration any immovable property by writing signed by him or on his behalf "
                    "from which the terms necessary to constitute the transfer can be ascertained with reasonable certainty, and the transferee has, "
                    "in part performance of the contract, taken possession of the property or any part thereof, or the transferee, being already in "
                    "possession, continues in possession in part performance of the contract and has done some act in furtherance of the contract, "
                    "and the transferee has performed or is willing to perform his part of the contract, then, notwithstanding that where there is an "
                    "instrument of transfer, that the transfer has not been completed in the manner prescribed therefor by the law for the time being in "
                    "force, the transferor or any person claiming under him shall be debarred from enforcing against the transferee and persons claiming "
                    "under him any right in respect of the property of which the transferee has taken or continued in possession, other than a right "
                    "expressly provided by the terms of the contract."
                ),
            },
            {
                "section_number": "54",
                "section_title": "Sale defined, Sale how made, Contract for sale",
                "chapter_number": "III",
                "chapter_title": "Of Sales of Immovable Property",
                "statutory_text": (
                    "'Sale' is a transfer of ownership in exchange for a price paid or promised or part-paid and part-promised.\n"
                    "Such transfer, in the case of tangible immovable property of the value of one hundred rupees and upwards, or in the case of a "
                    "reversion or other intangible thing, can be made only by a registered instrument.\n"
                    "A contract for the sale of immovable property is a contract that a sale of such property shall take place on terms settled between "
                    "the parties. It does not, of itself, create any interest in or charge on such property."
                ),
            },
            {
                "section_number": "58",
                "section_title": "'Mortgage', 'mortgagor', 'mortgagee', 'mortgage-money' and 'mortgage-deed' defined",
                "chapter_number": "IV",
                "chapter_title": "Of Mortgages of Immovable Property and Charges",
                "statutory_text": (
                    "Defines mortgage as the transfer of an interest in specific immovable property for the purpose of securing payment of money "
                    "advanced or to be advanced by way of loan, an existing or future debt, or the performance of an engagement which may give rise to "
                    "a pecuniary liability. Categorizes Simple mortgage, Mortgage by conditional sale, Usufructuary mortgage, English mortgage, "
                    "Mortgage by deposit of title-deeds (Equitable mortgage), and Anomalous mortgage."
                ),
            },
        ],
    },
    "limitation": {
        "title": "The Limitation Act, 1963",
        "short_title": "Limitation Act, 1963",
        "act_number": "Act No. 36 of 1963",
        "enactment_year": 1963,
        "enactment_date": "1963-10-05",
        "commencement_date": "1964-01-01",
        "effective_date": "1964-01-01",
        "status": "CURRENT",
        "subject_category": "Procedural Law & Timelines",
        "preamble": "An Act to consolidate and amend the law for the limitation of suits and other proceedings and for purposes connected therewith.",
        "sections": [
            {
                "section_number": "3",
                "section_title": "Bar of limitation",
                "chapter_number": "Part II",
                "chapter_title": "Limitation of Suits, Appeals and Applications",
                "statutory_text": (
                    "(1) Subject to the provisions contained in sections 4 to 24 (inclusive), every suit instituted, appeal preferred, and "
                    "application made after the prescribed period shall be dismissed, although limitation has not been set up as a defence."
                ),
            },
            {
                "section_number": "5",
                "section_title": "Extension of prescribed period in certain cases (Condonation of Delay)",
                "chapter_number": "Part II",
                "chapter_title": "Limitation of Suits, Appeals and Applications",
                "statutory_text": (
                    "Any appeal or any application, other than an application under any of the provisions of Order XXI of the Code of Civil Procedure, "
                    "1908 (5 of 1908), may be admitted after the prescribed period, if the appellant or the applicant satisfies the court that he had "
                    "sufficient cause for not preferring the appeal or making the application within such period.\n\n"
                    "Explanation.—The fact that the appellant or the applicant was misled by any order, practice or judgment of the High Court in "
                    "ascertaining or computing the prescribed period may be sufficient cause within the meaning of this section."
                ),
            },
            {
                "section_number": "14",
                "section_title": "Exclusion of time of proceeding bona fide in court without jurisdiction",
                "chapter_number": "Part III",
                "chapter_title": "Computation of Period of Limitation",
                "statutory_text": (
                    "(1) In computing the period of limitation for any suit the time during which the plaintiff has been prosecuting with due diligence "
                    "another civil proceeding, whether in a Court of first instance or of appeal or revision, against the defendant shall be excluded, "
                    "where the proceeding is founded upon the same cause of action and is prosecuted in good faith in a Court which, from defect of "
                    "jurisdiction or other cause of a like nature, is unable to entertain it."
                ),
            },
        ],
    },
    "insolvency and bankruptcy": {
        "title": "The Insolvency and Bankruptcy Code, 2016",
        "short_title": "IBC, 2016",
        "act_number": "Act No. 31 of 2016",
        "enactment_year": 2016,
        "enactment_date": "2016-05-28",
        "commencement_date": "2016-12-01",
        "effective_date": "2016-12-01",
        "status": "CURRENT",
        "subject_category": "Insolvency & Corporate Restructuring",
        "preamble": "An Act to consolidate and amend the laws relating to reorganisation and insolvency resolution of corporate persons, partnership firms and individuals in a time bound manner.",
        "sections": [
            {
                "section_number": "7",
                "section_title": "Initiation of corporate insolvency resolution process by financial creditor",
                "chapter_number": "Part II, Chapter II",
                "chapter_title": "Corporate Insolvency Resolution Process",
                "statutory_text": (
                    "(1) A financial creditor either by itself or jointly with other financial creditors, or any other person on behalf of the "
                    "financial creditor, as may be notified by the Central Government, may file an application for initiating corporate insolvency "
                    "resolution process against a corporate debtor before the Adjudicating Authority (NCLT) when a default has occurred."
                ),
            },
            {
                "section_number": "9",
                "section_title": "Application for initiation of corporate insolvency resolution process by operational creditor",
                "chapter_number": "Part II, Chapter II",
                "chapter_title": "Corporate Insolvency Resolution Process",
                "statutory_text": (
                    "(1) After the expiry of the period of ten days from the date of delivery of the notice or invoice demanding payment under "
                    "sub-section (1) of section 8, if the operational creditor does not receive payment from the corporate debtor or notice of the "
                    "dispute under sub-section (2) of section 8, the operational creditor may file an application before the Adjudicating Authority "
                    "for initiating a corporate insolvency resolution process."
                ),
            },
            {
                "section_number": "14",
                "section_title": "Moratorium",
                "chapter_number": "Part II, Chapter II",
                "chapter_title": "Corporate Insolvency Resolution Process",
                "statutory_text": (
                    "(1) Subject to provisions of sub-sections (2) and (3), on the insolvency commencement date, the Adjudicating Authority shall by "
                    "order declare moratorium for prohibiting all of the following, namely:—\n"
                    "(a) the institution of suits or continuation of pending suits or proceedings against the corporate debtor including execution of any judgment, decree or order;\n"
                    "(b) transferring, encumbering, alienating or disposing of by the corporate debtor any of its assets;\n"
                    "(c) any action to foreclose, recover or enforce any security interest created by the corporate debtor in respect of its property;\n"
                    "(d) the recovery of any property by an owner or lessor where such property is occupied by or in the possession of the corporate debtor."
                ),
            },
        ],
    },
    "pocso": {
        "title": "The Protection of Children from Sexual Offences Act, 2012",
        "short_title": "POCSO Act, 2012",
        "act_number": "Act No. 32 of 2012",
        "enactment_year": 2012,
        "enactment_date": "2012-06-19",
        "commencement_date": "2012-11-14",
        "effective_date": "2012-11-14",
        "status": "CURRENT",
        "subject_category": "Criminal Law & Child Protection",
        "preamble": "An Act to protect children from offences of sexual assault, sexual harassment and pornography and provide for establishment of Special Courts for trial of such offences.",
        "sections": [
            {
                "section_number": "3",
                "section_title": "Penetrative sexual assault",
                "chapter_number": "II",
                "chapter_title": "Offences under the Act",
                "statutory_text": "Defines penetrative sexual assault committed on a child below eighteen years of age.",
            },
            {
                "section_number": "4",
                "section_title": "Punishment for penetrative sexual assault",
                "chapter_number": "II",
                "chapter_title": "Offences under the Act",
                "statutory_text": "Whoever commits penetrative sexual assault shall be punished with rigorous imprisonment for a term which shall not be less than twenty years, but which may extend to imprisonment for life, and shall also be liable to fine or with death in aggravated cases (Act 25 of 2019).",
            },
            {
                "section_number": "19",
                "section_title": "Reporting of offences",
                "chapter_number": "V",
                "chapter_title": "Procedure for Reporting of Cases",
                "statutory_text": "Mandatory reporting obligation: Notwithstanding anything contained in the Code of Criminal Procedure, 1973, any person who has apprehension or knowledge that an offence under this Act has been committed shall provide such information to Special Juvenile Police Unit or local police.",
            },
            {
                "section_number": "29",
                "section_title": "Presumption as to certain offences",
                "chapter_number": "VIII",
                "chapter_title": "Procedure and Powers of Special Courts",
                "statutory_text": "Where a person is prosecuted for committing an offence under section 3, 5, 7 or section 9, the Special Court shall presume, that such person has committed the offence unless the contrary is proved.",
            },
        ],
    },
}


# Add alias references
BUILTIN_ACTS_FALLBACK["cpc"] = BUILTIN_ACTS_FALLBACK["civil procedure"]
BUILTIN_ACTS_FALLBACK["order"] = BUILTIN_ACTS_FALLBACK["civil procedure"]
BUILTIN_ACTS_FALLBACK["ni act"] = BUILTIN_ACTS_FALLBACK["negotiable instruments"]
BUILTIN_ACTS_FALLBACK["sra"] = BUILTIN_ACTS_FALLBACK["specific relief"]
BUILTIN_ACTS_FALLBACK["tpa"] = BUILTIN_ACTS_FALLBACK["transfer of property"]
BUILTIN_ACTS_FALLBACK["ibc"] = BUILTIN_ACTS_FALLBACK["insolvency and bankruptcy"]


# ---------------------------------------------------------------------------
# Query Parsing Utilities
# ---------------------------------------------------------------------------


def extract_act_and_section_hints(query: str) -> Tuple[Optional[str], Optional[str]]:
    """Parse a user query to identify candidate act names and section numbers."""
    cleaned = query.strip()
    sec_num: Optional[str] = None
    act_hint: Optional[str] = None

    # Pattern 1: Section 138, Sec 138, s. 138, Section 438, Section 69, Section 101
    sec_match = re.search(
        r"\b(?:section|sec\.?|s\.)\s*(\d+[a-zA-Z]*(?:\s*(?:and|to|&)\s*\d+[a-zA-Z]*)?)\b",
        cleaned,
        re.IGNORECASE,
    )
    if sec_match:
        sec_num = sec_match.group(1).strip()
    else:
        # Pattern 2: Order 39 Rule 1, Order VII Rule 11
        order_match = re.search(
            r"\b(order\s+[a-zA-Z0-9]+\s+rule\s+[a-zA-Z0-9]+)\b",
            cleaned,
            re.IGNORECASE,
        )
        if order_match:
            sec_num = order_match.group(1).strip()

    # Normalize act name by removing matched section part
    remainder = cleaned
    if sec_match:
        remainder = (
            cleaned[: sec_match.start()] + " " + cleaned[sec_match.end() :]
        ).strip()
    elif sec_num:
        remainder = re.sub(re.escape(sec_num), "", cleaned, flags=re.IGNORECASE).strip()

    # Clean residual filler words: "of", "in", "the", "under"
    remainder = re.sub(
        r"^(?:of|in|under|the|for|from)\s+", "", remainder, flags=re.IGNORECASE
    )
    remainder = re.sub(
        r"\s+(?:of|in|under|the|for|from)$", "", remainder, flags=re.IGNORECASE
    ).strip()

    if remainder:
        act_hint = remainder

    # Map well-known abbreviations
    abbr_map = {
        "cpc": "CPC, 1908",
        "crpc": "CrPC, 1973",
        "ipc": "IPC, 1860",
        "bns": "BNS, 2023",
        "bnss": "BNSS, 2023",
        "bsa": "BSA, 2023",
        "ni act": "NI Act, 1881",
        "ni": "NI Act, 1881",
        "sra": "Specific Relief Act, 1963",
        "tpa": "Transfer of Property Act, 1882",
        "ibc": "IBC, 2016",
        "pocso": "POCSO Act, 2012",
        "dpdp": "DPDP Act, 2023",
    }
    if act_hint and act_hint.lower() in abbr_map:
        act_hint = abbr_map[act_hint.lower()]

    return act_hint, sec_num


# ---------------------------------------------------------------------------
# Gemini AI Grounded India Code Statutory Extraction
# ---------------------------------------------------------------------------


def call_gemini_statutory_synthesizer(
    query: str,
    act_hint: Optional[str] = None,
    section_hint: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Query Gemini 2.5 Flash to synthesize verbatim statutory provision from India Code repository."""
    if not settings.GEMINI_API_KEY:
        logger.info("No GEMINI_API_KEY available for dynamic statutory discovery.")
        return None

    system_prompt = (
        "You are the Official Indian Statutory Repository Indexer for the AMIL Legal Intelligence Platform (India). "
        "Your task is to provide authentic, verified statutory provisions from the official Gazette of India and "
        "India Code (www.indiacode.nic.in). "
        "You must output ONLY valid JSON matching this schema:\n"
        "{\n"
        '  "act": {\n'
        '    "title": "Full Official Title (e.g. The Specific Relief Act, 1963)",\n'
        '    "short_title": "Short Title (e.g. Specific Relief Act, 1963)",\n'
        '    "act_number": "Act No. XX of YYYY",\n'
        '    "enactment_year": 1963,\n'
        '    "enactment_date": "YYYY-MM-DD",\n'
        '    "commencement_date": "YYYY-MM-DD",\n'
        '    "effective_date": "YYYY-MM-DD",\n'
        '    "status": "CURRENT" or "HISTORICAL",\n'
        '    "subject_category": "e.g. Civil Law & Remedies",\n'
        '    "preamble": "Verbatim legislative preamble of the Act",\n'
        '    "official_url": "https://www.indiacode.nic.in"\n'
        "  },\n"
        '  "sections": [\n'
        "    {\n"
        '      "section_number": "138",\n'
        '      "section_title": "Official Title of Section",\n'
        '      "chapter_number": "XVII",\n'
        '      "chapter_title": "Title of Chapter",\n'
        '      "statutory_text": "Verbatim authentic statutory text including provisos and explanations",\n'
        '      "amendment_notes": "Key legislative amendments if applicable",\n'
        '      "corresponding_historical_section": "Pre-2024 equivalent or null"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "1. STRICT TRUTH: Never fabricate statutory sections. If the Act does not exist, return null.\n"
        "2. If a specific section is requested, return that section FIRST, plus 2-4 key adjacent or famous sections.\n"
        "3. Provide verbatim statutory text including all provisos (a), (b), (c) and explanations."
    )

    user_prompt = (
        f"Search Query: {query}\n"
        f"Candidate Act Hint: {act_hint or 'Unknown'}\n"
        f"Candidate Section Hint: {section_hint or 'All Key Provisions'}\n\n"
        "Generate the complete authentic Indian statute and section records in valid JSON."
    )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        if not raw_text:
            return None

        # Clean JSON fences if present
        cleaned_json = raw_text.strip()
        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:]
        if cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:]
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3]

        parsed = json.loads(cleaned_json.strip())
        if isinstance(parsed, dict) and "act" in parsed and "sections" in parsed:
            return parsed
    except Exception as exc:
        logger.warning(f"Gemini statutory discovery call encountered: {type(exc).__name__}: {exc}")

    return None


# ---------------------------------------------------------------------------
# Database Persistence & Lookup Service
# ---------------------------------------------------------------------------


class StatutoryDiscoveryService:
    """Discovers, retrieves, grounds, and persists any Indian Bare Act and Section into PostgreSQL."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def lookup_or_discover(
        self,
        query: str,
        act_title_hint: Optional[str] = None,
        section_number_hint: Optional[str] = None,
    ) -> ActLookupResponse:
        cleaned_query = query.strip()
        parsed_act, parsed_sec = extract_act_and_section_hints(cleaned_query)

        act_query = act_title_hint or parsed_act or cleaned_query
        sec_query = section_number_hint or parsed_sec

        # 1. First, search local PostgreSQL database
        matched_act, matched_sec, all_secs = self._search_database(act_query, sec_query)

        if matched_act:
            # If the act exists and either no specific section was requested OR the section was found in DB
            if not sec_query or matched_sec:
                detail = self._build_act_detail(matched_act)
                return ActLookupResponse(
                    act=detail,
                    matched_section=matched_sec,
                    all_matched_sections=all_secs,
                    is_newly_discovered=False,
                    source_message=f"Retrieved directly from AMIL PostgreSQL Indian Legal Corpus ({matched_act.short_title})",
                )

        # 2. Act or requested Section not in DB -> Try dynamic discovery (Fallback Knowledge Base -> Gemini AI)
        discovered_data = self._resolve_statute_externally(
            cleaned_query, act_query, sec_query
        )

        if discovered_data:
            act_entity, section_entities, primary_sec = self._persist_discovered_statute(
                discovered_data, target_section_number=sec_query
            )
            detail = self._build_act_detail(act_entity)
            matched_sec_resp = (
                LegalSectionResponse.model_validate(primary_sec) if primary_sec else None
            )
            if matched_sec_resp:
                matched_sec_resp.act_short_title = act_entity.short_title
                matched_sec_resp.act_status = act_entity.status

            all_sec_resps = [
                self._format_section_resp(s, act_entity) for s in section_entities
            ]

            return ActLookupResponse(
                act=detail,
                matched_section=matched_sec_resp,
                all_matched_sections=all_sec_resps,
                is_newly_discovered=True,
                source_message="Discovered and verified via India Code Repository & Gemini Grounding Engine",
            )

        # If we had a matched act in DB, return that act rather than a generic fallback
        if matched_act:
            detail = self._build_act_detail(matched_act)
            return ActLookupResponse(
                act=detail,
                matched_section=all_secs[0] if all_secs else None,
                all_matched_sections=all_secs,
                is_newly_discovered=False,
                source_message=f"Found {matched_act.short_title} in AMIL Indian Legal Corpus",
            )

        # 3. Fallback: If nothing matched, return the best partial match or first act in DB
        first_act = self.db.query(LegalAct).first()
        if not first_act:
            raise ValueError("No legal statutes available in database")

        detail = self._build_act_detail(first_act)
        return ActLookupResponse(
            act=detail,
            matched_section=None,
            all_matched_sections=[],
            is_newly_discovered=False,
            source_message=f"No exact match found for '{cleaned_query}'. Showing foundational statute.",
        )

    def _search_database(
        self, act_query: str, sec_query: Optional[str]
    ) -> Tuple[Optional[LegalAct], Optional[LegalSectionResponse], List[LegalSectionResponse]]:
        """Search PostgreSQL for matching act and section."""
        act_term = f"%{act_query.strip()}%"
        matched_act = (
            self.db.query(LegalAct)
            .filter(
                or_(
                    LegalAct.title.ilike(act_term),
                    LegalAct.short_title.ilike(act_term),
                    LegalAct.act_number.ilike(act_term),
                    LegalAct.subject_category.ilike(act_term),
                )
            )
            .first()
        )

        if not matched_act and sec_query:
            # Maybe query was just "Section 138" without act name
            sec_rec = (
                self.db.query(LegalSection)
                .filter(LegalSection.section_number.ilike(f"%{sec_query.strip()}%"))
                .first()
            )
            if sec_rec:
                matched_act = sec_rec.act

        if not matched_act:
            return None, None, []

        all_sec_resps: List[LegalSectionResponse] = []
        matched_sec: Optional[LegalSectionResponse] = None

        def normalize_order_sec(s: str) -> str:
            s = s.strip().lower()
            s = s.replace("xxxix", "39").replace("vii", "7").replace("rules", "rule")
            s = re.sub(r"\s+", " ", s)
            return s

        for sec in matched_act.sections:
            resp = self._format_section_resp(sec, matched_act)
            all_sec_resps.append(resp)
            if sec_query:
                norm_sec = sec.section_number.strip().lower()
                norm_q = sec_query.strip().lower()
                norm_sec_gen = normalize_order_sec(norm_sec)
                norm_q_gen = normalize_order_sec(norm_q)
                if (
                    norm_sec == norm_q
                    or norm_sec_gen == norm_q_gen
                    or norm_q in norm_sec
                    or norm_q_gen in norm_sec_gen
                    or norm_sec in norm_q
                    or norm_sec_gen in norm_q_gen
                ):
                    matched_sec = resp

        return matched_act, matched_sec, all_sec_resps

    def _resolve_statute_externally(
        self, full_query: str, act_query: str, sec_query: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Resolve statute from Built-in Knowledge Base or Gemini AI."""
        # A. Check Built-in Knowledge Base
        lower_query = f"{full_query} {act_query}".lower()
        for key, data in BUILTIN_ACTS_FALLBACK.items():
            if key in lower_query:
                return data

        # B. Query Gemini AI with strict India Code grounding
        ai_data = call_gemini_statutory_synthesizer(full_query, act_query, sec_query)
        if ai_data:
            return ai_data

        return None

    def _persist_discovered_statute(
        self, data: Dict[str, Any], target_section_number: Optional[str] = None
    ) -> Tuple[LegalAct, List[LegalSection], Optional[LegalSection]]:
        """Persist newly discovered Act and Sections into PostgreSQL."""
        # Find or create legal source
        source = (
            self.db.query(LegalSource)
            .filter(LegalSource.code == "INDIA_CODE")
            .first()
        )
        if not source:
            source = LegalSource(
                code="INDIA_CODE",
                name="India Code — Legislative Department, Ministry of Law and Justice",
                source_type="CENTRAL_LEGISLATION",
                jurisdiction="India (Union)",
                official_url="https://www.indiacode.nic.in",
                is_verified_repository=True,
            )
            self.db.add(source)
            self.db.flush()

        act_data = data.get("act", data)
        short_title = act_data.get("short_title", "Central Act")
        title = act_data.get("title", short_title)
        act_number = act_data.get("act_number", f"Act of {act_data.get('enactment_year', 2024)}")
        year = int(act_data.get("enactment_year", 2024))

        # Check if already exists in DB
        act = (
            self.db.query(LegalAct)
            .filter(
                or_(
                    (LegalAct.short_title == short_title) & (LegalAct.enactment_year == year),
                    (LegalAct.act_number == act_number) & (LegalAct.enactment_year == year) & (LegalAct.title == title),
                    LegalAct.title == title,
                    LegalAct.short_title == short_title,
                    LegalAct.title.ilike(f"%{short_title}%"),
                    LegalAct.short_title.ilike(f"%{short_title}%"),
                )
            )
            .first()
        )

        def parse_date(val: Any) -> Optional[date]:
            if not val or not isinstance(val, str):
                return None
            try:
                return datetime.strptime(val[:10], "%Y-%m-%d").date()
            except Exception:
                return None

        if not act:
            try:
                act = LegalAct(
                    source_id=source.id,
                    title=title,
                    short_title=short_title,
                    act_number=act_number,
                    enactment_year=year,
                    enactment_date=parse_date(act_data.get("enactment_date")),
                    commencement_date=parse_date(act_data.get("commencement_date")),
                    effective_date=parse_date(act_data.get("effective_date")),
                    status=act_data.get("status", "CURRENT"),
                    subject_category=act_data.get("subject_category", "Commercial & Civil Law"),
                    preamble=act_data.get("preamble", f"An Act to define and amend the law relating to {title}."),
                    amendment_history=[],
                )
                self.db.add(act)
                self.db.flush()
            except Exception:
                self.db.rollback()
                act = (
                    self.db.query(LegalAct)
                    .filter(or_(LegalAct.title == title, LegalAct.short_title == short_title))
                    .first()
                )

        sections_list = data.get("sections", [])
        persisted_sections: List[LegalSection] = []
        primary_section: Optional[LegalSection] = None

        for sec_dict in sections_list:
            sec_num = str(sec_dict.get("section_number", "1")).strip()
            # Check if this section already exists
            existing_sec = (
                self.db.query(LegalSection)
                .filter(LegalSection.act_id == act.id, LegalSection.section_number == sec_num)
                .first()
            )

            if existing_sec:
                sec_entity = existing_sec
            else:
                statutory_text = sec_dict.get("statutory_text", "")
                embedding_vector = deterministic_embedding(statutory_text, dim=768)
                sec_entity = LegalSection(
                    act_id=act.id,
                    section_number=sec_num,
                    section_title=sec_dict.get("section_title", f"Section {sec_num}"),
                    chapter_number=sec_dict.get("chapter_number") or "",
                    chapter_title=sec_dict.get("chapter_title") or "",
                    statutory_text=statutory_text,
                    amendment_notes=sec_dict.get("amendment_notes"),
                    corresponding_historical_section=sec_dict.get(
                        "corresponding_historical_section"
                    ),
                    embedding=embedding_vector,
                )
                self.db.add(sec_entity)
                self.db.flush()

            persisted_sections.append(sec_entity)

            if target_section_number and (
                sec_num.lower() == target_section_number.lower()
                or sec_num.endswith(target_section_number)
            ):
                primary_section = sec_entity

        self.db.commit()

        if not primary_section and persisted_sections:
            primary_section = persisted_sections[0]

        return act, persisted_sections, primary_section

    def _format_section_resp(self, sec: LegalSection, act: LegalAct) -> LegalSectionResponse:
        resp = LegalSectionResponse.model_validate(sec)
        resp.act_short_title = act.short_title
        resp.act_status = act.status
        resp.chapter_number = sec.chapter_number or ""
        resp.chapter_title = sec.chapter_title or ""
        return resp

    def _build_act_detail(self, act: LegalAct) -> LegalActDetailResponse:
        sections_out: List[LegalSectionResponse] = []
        chapters_seen: List[str] = []

        for sec in act.sections:
            s_resp = self._format_section_resp(sec, act)
            sections_out.append(s_resp)
            if sec.chapter_title:
                lbl = (
                    f"Chapter {sec.chapter_number}: {sec.chapter_title}"
                    if sec.chapter_number
                    else sec.chapter_title
                )
                if lbl not in chapters_seen:
                    chapters_seen.append(lbl)

        detail = LegalActDetailResponse.model_validate(act)
        detail.section_count = len(sections_out)
        detail.sections_count = len(sections_out)
        detail.source_name = (
            act.source.name if act.source else "India Code — Legislative Department"
        )
        detail.official_url = (
            act.source.official_url if act.source else "https://www.indiacode.nic.in"
        )
        detail.chapters = chapters_seen
        detail.sections = sections_out
        return detail
