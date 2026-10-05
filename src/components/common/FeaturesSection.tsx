import React from 'react';
import { Zap, ShieldCheck, Sparkles, FolderArchive, Layers, CheckCircle2 } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Zap,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80',
      title: 'Conversión rápida',
      description: 'Convierte imágenes entre múltiples formatos modernos como WebP, AVIF, PNG, JPG, TIFF y BMP en milisegundos.',
    },
    {
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      title: 'Privacidad total',
      description: 'Tus fotos se procesan directamente en la memoria de tu navegador mediante Canvas y WebCodecs. Cero almacenamiento externo.',
    },
    {
      icon: Sparkles,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
      title: 'Background Removal con IA',
      description: 'Elimina fondos complejos de personas, productos y animales con IA de alta precisión para obtener PNG transparentes listos.',
    },
    {
      icon: FolderArchive,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80',
      title: 'Conversión por lotes',
      description: 'Sube decenas de archivos a la vez, personaliza opciones para cada uno o para todos, y descarga todo en un único archivo ZIP.',
    },
  ];

  return (
    <section className="py-12 border-t border-slate-200/70 bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Todo lo que necesitas en una sola herramienta
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Diseñada con los estándares de un SaaS moderno, sin suscripciones ni límites artificiales de archivo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${feature.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{feature.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sin pérdida innecesaria</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
