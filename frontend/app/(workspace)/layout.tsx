"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function WorkspaceLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-ambient-mesh text-ivory-primary">
      {/* Background Ambient Glows & Fluid Meshes */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-70">
        <div className="absolute -top-40 left-1/3 h-[500px] w-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute top-1/2 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute -bottom-40 left-10 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
        {/* Subtle wavy gradient ribbon at bottom matching image */}
        <svg
          className="absolute -bottom-10 left-0 w-full h-64 text-blue-500/10"
          viewBox="0 0 1440 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,192L60,186.7C120,181,240,171,360,181.3C480,192,600,224,720,213.3C840,203,960,149,1080,138.7C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
            fill="url(#ambient-wave)"
          />
          <defs>
            <linearGradient id="ambient-wave" x1="0" y1="0" x2="1440" y2="320" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(37, 99, 235, 0.15)" />
              <stop offset="0.5" stopColor="rgba(99, 102, 241, 0.08)" />
              <stop offset="1" stopColor="rgba(214, 182, 109, 0.05)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Header onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
          <MobileBottomNav onOpenAllModules={() => setMobileOpen(true)} />
        </div>
      </div>
    </div>
  );
}
