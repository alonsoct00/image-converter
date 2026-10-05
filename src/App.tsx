import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { HeroSection } from './components/common/HeroSection';
import { FeaturesSection } from './components/common/FeaturesSection';
import { ConverterView } from './features/converter/ConverterView';
import { BackgroundRemoverView } from './components/background-remover/BackgroundRemoverView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'background-remover'>('converter');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* SaaS Navigation Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Landing Hero */}
        <HeroSection
          onStartConvert={() => {
            setActiveTab('converter');
            const dropzone = document.querySelector('[role="button"]');
            dropzone?.scrollIntoView({ behavior: 'smooth' });
          }}
          onStartAiRemoval={() => {
            setActiveTab('background-remover');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'converter' ? (
            <ConverterView />
          ) : (
            <BackgroundRemoverView />
          )}
        </div>
      </main>

      {/* Value Proposition Features */}
      <FeaturesSection />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Image Converter. Procesamiento local y privado.</p>
          <div className="flex items-center gap-6">
            <span>Soporte: JPG, PNG, WebP, AVIF, TIFF, HEIC, BMP, SVG</span>
            <span>•</span>
            <span>Nano Banana AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
