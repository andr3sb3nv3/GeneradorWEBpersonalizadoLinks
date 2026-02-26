/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle2, Link as LinkIcon, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    phrase: '',
    img1: '',
    img2: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('d');
    const m = params.get('m');

    if (d && m) {
      setIsRedirecting(true);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        window.location.href = `https://propuesta-comercial-mobile.vercel.app/#/p/${m}`;
      } else {
        window.location.href = `https://propuesta-comercial-desktop.vercel.app/?data=${d}`;
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateLink = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Desktop format: btoa(JSON.stringify({clientName, img1, img2, phrase}))
    const desktopPayload = btoa(JSON.stringify({
      clientName: formData.clientName,
      img1: formData.img1,
      img2: formData.img2,
      phrase: formData.phrase
    }));

    // Mobile format: btoa(encodeURIComponent(JSON.stringify({img1, img2, text})))
    const mobilePayload = btoa(encodeURIComponent(JSON.stringify({
      img1: formData.img1,
      img2: formData.img2,
      text: formData.phrase
    })));

    const link = `${window.location.origin}/?d=${desktopPayload}&m=${mobilePayload}`;
    setGeneratedLink(link);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-[#0a192f] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h1 className="text-2xl font-bold uppercase tracking-widest text-emerald-400 mb-4">Redirigiendo</h1>
        <p className="text-gray-400">Detectando dispositivo para mostrar la mejor versión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-[#0a192f] font-sans selection:bg-emerald-400 selection:text-[#0a192f] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic mb-4">
            Generador de <span className="text-emerald-500">Enlaces</span>
          </h1>
          <p className="text-gray-500 text-lg">
            Crea un único enlace inteligente que redirigirá automáticamente a la versión Desktop o Mobile según el dispositivo del cliente.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 md:p-12">
          <form onSubmit={generateLink} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                Nombre del Cliente
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#0a192f] font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                placeholder="Ej: Inmobiliaria XYZ"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                Frase Personalizada
              </label>
              <textarea
                name="phrase"
                value={formData.phrase}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#0a192f] font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all resize-none"
                placeholder="Escribe un mensaje impactante..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  URL Imagen 1
                </label>
                <input
                  type="url"
                  name="img1"
                  value={formData.img1}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#0a192f] font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                  placeholder="https://ejemplo.com/img1.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  URL Imagen 2
                </label>
                <input
                  type="url"
                  name="img2"
                  value={formData.img2}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#0a192f] font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                  placeholder="https://ejemplo.com/img2.jpg"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0a192f] text-emerald-400 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-500 hover:text-[#0a192f] transition-colors mt-8 flex items-center justify-center gap-2"
            >
              <LinkIcon size={20} />
              Generar Enlace Inteligente
            </button>
          </form>

          {generatedLink && (
            <div className="mt-10 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-emerald-800 font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                ¡Enlace generado con éxito!
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-white border border-emerald-200 rounded-xl px-4 py-3 text-sm text-gray-600 focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-emerald-500 text-[#0a192f] px-6 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-8 text-sm text-emerald-700 font-medium">
                <div className="flex items-center gap-2">
                  <Monitor size={16} />
                  <span>Soporta Desktop</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone size={16} />
                  <span>Soporta Mobile</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
