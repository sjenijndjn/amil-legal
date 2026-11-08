"use client";

import React from "react";
import {
  HelpCircle,
  ShieldCheck,
  BookOpen,
  Scale,
  ExternalLink
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { Badge } from "@/components/ui/Badge";

export default function HelpPage() {
  return (
    <div className="space-y-6 pb-10 max-w-5xl">
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
        <div className="flex items-center gap-2.5 mb-2">
          <HelpCircle className="h-6 w-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-ivory-primary">
            Help, Documentation & Indian Legal Reference Guide
          </h1>
        </div>
        <p className="text-xs text-ivory-secondary">
          {BRAND.fullTitle} • Built for {BRAND.ownerName} • {BRAND.corePrinciple}
        </p>
      </div>

      {/* July 1, 2024 Criminal Law Transition Reference Table */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-ivory-primary flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gold" />
            <span>July 1, 2024 Indian Criminal & Evidence Law Transition Quick-Reference</span>
          </h2>
          <Badge variant="gold">S.O. 848(E) – 850(E)</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-ivory-secondary font-mono uppercase text-[11px]">
                <th className="py-2.5 px-3">New Enacted Sanhita (w.e.f. 01-07-2024)</th>
                <th className="py-2.5 px-3">Repealed Historical Code</th>
                <th className="py-2.5 px-3">Key Section Mapping Example</th>
                <th className="py-2.5 px-3">Savings Clause Provision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-ivory-primary">
              <tr>
                <td className="py-3 px-3 font-semibold text-gold">
                  Bharatiya Nyaya Sanhita, 2023 (BNS)
                </td>
                <td className="py-3 px-3">Indian Penal Code, 1860 (IPC)</td>
                <td className="py-3 px-3 font-mono">
                  s. 318 (Cheating) ← s. 415/420 IPC; s. 103 (Murder) ← s. 302 IPC
                </td>
                <td className="py-3 px-3 font-mono">Section 358(2) BNS</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-gold">
                  Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)
                </td>
                <td className="py-3 px-3">Code of Criminal Procedure, 1973 (CrPC)</td>
                <td className="py-3 px-3 font-mono">
                  s. 173 (Zero/e-FIR) ← s. 154 CrPC; s. 35 (Arrest) ← s. 41/41A CrPC
                </td>
                <td className="py-3 px-3 font-mono">Section 531(2) BNSS</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-gold">
                  Bharatiya Sakshya Adhiniyam, 2023 (BSA)
                </td>
                <td className="py-3 px-3">Indian Evidence Act, 1872 (IEA)</td>
                <td className="py-3 px-3 font-mono">
                  s. 63 (Electronic Records) ← s. 65B IEA; s. 57 ← s. 62 IEA
                </td>
                <td className="py-3 px-3 font-mono">Section 170(2) BSA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7-Part Juris Answer Standard & Official Repositories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-status-success" />
            <h2 className="font-heading text-base font-bold text-ivory-primary">
              The 7-Part Grounded Juris Answer Standard
            </h2>
          </div>
          <p className="text-xs text-ivory-secondary leading-relaxed">
            Every legal consultation in Ask Juris is validated against the database corpus and formatted into 7 traceable sections:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-ivory-primary">
            <li><strong>Direct Answer:</strong> Concise conclusion grounded in Indian law.</li>
            <li><strong>Applicable Legal Provisions:</strong> Current & historical sections.</li>
            <li><strong>Relevant Judgments:</strong> Precedent status & neutral citations.</li>
            <li><strong>Legal Reasoning:</strong> Step-by-step statutory & judicial analysis.</li>
            <li><strong>Source References:</strong> Interactive citation cards with excerpts.</li>
            <li><strong>Important Limitations:</strong> Jurisdiction & factual caveats.</li>
            <li><strong>Verification Date:</strong> Timestamp and repository check.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-gold" />
            <h2 className="font-heading text-base font-bold text-ivory-primary">
              Authorized Official Legal Portals
            </h2>
          </div>
          <p className="text-xs text-ivory-secondary">
            AMIL never scrapes unauthorized third-party websites. All statutory and judicial references link to official Government & Judicial portals:
          </p>
          <div className="space-y-2 pt-1">
            {[
              {
                name: "India Code Digital Repository (Ministry of Law & Justice)",
                url: "https://www.indiacode.nic.in"
              },
              {
                name: "Supreme Court of India — Digital SCR (e-SCR)",
                url: "https://digiscr.sci.gov.in"
              },
              {
                name: "eCourts Services Portal (e-Committee, Supreme Court)",
                url: "https://services.ecourts.gov.in"
              },
              {
                name: "Legislative Department — Constitution of India",
                url: "https://legislative.gov.in"
              }
            ].map((portal) => (
              <a
                key={portal.url}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2.5 text-xs text-ivory-primary hover:border-gold hover:text-gold transition-colors"
              >
                <span>{portal.name}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
