import React from 'react';
import { ArrowRight, Sparkles, Image as ImageIcon, Shield, Cpu, RefreshCw } from 'lucide-react';

interface HeroSectionProps {
  onStartConvert: () => void;
  onStartAiRemoval: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartConvert,
  onStartAiRemoval,
}) => {
  return (
    <div className="relative overflow-hidden pt-8 pb-10 sm:pt-12 sm:pb-14">
      {/* Background glow decoration */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[350px] bg-gradient-to-tr from-blue-200/40 via-indigo-100/30 to-purple-200/40 blur-3xl opacity-70 pointer-events-none rounded-full"
      />

      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Herramienta profesional de procesamiento de imagen</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-none">
          Convierte tus imágenes <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            en segundos
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Convierte JPG, PNG, WebP, TIFF, HEIC y más directamente en tu navegador. También puedes eliminar fondos con precisión quirúrgica mediante IA.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStartConvert}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/25 transition-all transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <ImageIcon className="w-5 h-5" />
            <span>Convertir imagen</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={onStartAiRemoval}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-medium border border-slate-300/80 shadow-xs hover:border-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>AI Image Enhancement</span>
          </button>
        </div>

        {/* Trust Points */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Sin subir imágenes para conversiones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Procesamiento local ultrarrápido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>Soporte para TIFF, HEIC, AVIF y SVG</span>
          </div>
        </div>
      </div>
    </div>
  );
};
