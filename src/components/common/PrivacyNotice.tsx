import React from 'react';
import { Lock, Info } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  return (
    <div className="bg-slate-100/80 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 my-6 text-xs text-slate-600 flex items-start gap-3">
      <div className="p-1 rounded-md bg-white border border-slate-200 text-blue-600 shrink-0 mt-0.5">
        <Lock className="w-4 h-4" />
      </div>
      <div>
        <p className="font-semibold text-slate-800 mb-0.5">Compromiso con tu privacidad</p>
        <p className="leading-relaxed">
          Las conversiones de formato se realizan localmente en tu navegador cuando es posible, sin transferir tus archivos a ningún servidor externo. Las imágenes solo se envían de forma segura cuando utilizas la función de <strong>Eliminación de fondo con IA</strong> para ser procesadas y nunca se almacenan permanentemente.
        </p>
      </div>
    </div>
  );
};
