'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SubgruposPage() {
  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex items-center gap-4">
        <Link href="/cadastros" className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-brand-blue">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Subgrupo</h1>
          <p className="text-brand-blue/60 font-medium">Subdivisões dos grupos.</p>
        </div>
      </div>
      <div className="bg-slate-50/50 border border-brand-border rounded-[32px] p-8 text-center text-brand-text-main/40 font-black uppercase italic">
        Módulo em desenvolvimento
      </div>
    </div>
  );
}
