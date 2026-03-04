/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle2, Link as LinkIcon, Smartphone, Monitor, AlertCircle, FileSpreadsheet, Upload, Download, Palette, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function App() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    clientName: '',
    phrase: '',
    img1: '',
    img2: '',
    color1: '',
    color2: '',
    color3: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [processedData, setProcessedData] = useState<any[][] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPayloads, setPreviewPayloads] = useState<{ desktop: string, mobile: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const path = window.location.pathname;
    
    // Si estamos en la raíz, no hacemos nada
    if (path === '/' || path === '') return;
    
    // Si no es una ruta de API, la tratamos como un slug
    if (!path.startsWith('/api/')) {
      const slug = path.substring(1); // Removemos el '/' inicial
      if (slug) {
        setIsRedirecting(true);
        
        fetch(`/api/links/${slug}`)
          .then(res => {
            if (!res.ok) throw new Error('Enlace no encontrado');
            return res.json();
          })
          .then(data => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            
            // Detección más amplia de dispositivos móviles
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(userAgent);
            
            // Detección por capacidades táctiles (común en móviles/tablets)
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // Detección por tamaño de pantalla (ancho o alto pequeño indica móvil)
            const isSmallScreen = window.innerWidth < 1024 || window.innerHeight < 768;
            
            // Si cumple cualquiera de los criterios, lo tratamos como Mobile/Tablet
            if (isMobileUA || (hasTouch && isSmallScreen)) {
              window.location.href = `https://mobile-propuesta-con-from-completo.vercel.app/#/p/${data.mobilePayload}`;
            } else {
              window.location.href = `https://propuesta-comercial-desktop.vercel.app/?data=${data.desktopPayload}`;
            }
          })
          .catch(err => {
            setError(err.message);
            setIsRedirecting(false);
          });
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createLinkPayloads = (clientName: string, phrase: string, img1: string, img2: string, color1: string, color2: string, color3: string) => {
    const desktopPayload = btoa(JSON.stringify({
      clientName,
      img1: img1 || '',
      img2: img2 || '',
      phrase: phrase || '',
      color1: color1 || '',
      color2: color2 || '',
      color3: color3 || ''
    }));

    // El formulario Mobile espera claves específicas para autocompletarse
    // Cambiamos clientName a companyName ya que se confirmó que funciona para el nombre,
    // manteniendo text, img1, img2, color1, color2, color3 que funcionan para el resto.
    const mobilePayload = btoa(encodeURIComponent(JSON.stringify({
      companyName: clientName || '',
      text: phrase || '',
      img1: img1 || '',
      img2: img2 || '',
      color1: color1 || '',
      color2: color2 || '',
      color3: color3 || ''
    })));

    return { desktopPayload, mobilePayload };
  };

  const handlePreview = () => {
    const { desktopPayload, mobilePayload } = createLinkPayloads(
      formData.clientName,
      formData.phrase,
      formData.img1,
      formData.img2,
      formData.color1,
      formData.color2,
      formData.color3
    );
    setPreviewPayloads({ desktop: desktopPayload, mobile: mobilePayload });
    setShowPreview(true);
  };

  const generateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const { desktopPayload, mobilePayload } = createLinkPayloads(
        formData.clientName,
        formData.phrase,
        formData.img1,
        formData.img2,
        formData.color1,
        formData.color2,
        formData.color3
      );

      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientName: formData.clientName,
          desktopPayload,
          mobilePayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor (${response.status})`);
      }

      const data = await response.json();
      const link = `https://generadorwebpersonalizadolinks.onrender.com/${data.slug}`;
      setGeneratedLink(link);
      setCopied(false);
    } catch (err) {
      console.error(err);
      alert(`Hubo un error al generar el enlace: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        const newData: any[][] = [];
        
        // Add headers if they don't exist or process the first row
        let startIndex = 0;
        if (data.length > 0 && typeof data[0][0] === 'string' && data[0][0].toLowerCase().includes('nombre')) {
          const headerRow = [...data[0]];
          headerRow[4] = 'URL Generada';
          headerRow[5] = 'Mensaje para el Cliente';
          headerRow[6] = 'Color 1';
          headerRow[7] = 'Color 2';
          headerRow[8] = 'Color 3';
          newData.push(headerRow);
          startIndex = 1;
        } else {
          newData.push(['Nombre del Cliente', 'Frase Personalizada', 'URL Imagen 1', 'URL Imagen 2', 'URL Generada', 'Mensaje para el Cliente', 'Color 1', 'Color 2', 'Color 3']);
        }

        for (let i = startIndex; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

          const clientName = row[0] ? String(row[0]) : '';
          const phrase = row[1] ? String(row[1]) : '';
          const img1 = row[2] ? String(row[2]) : '';
          const img2 = row[3] ? String(row[3]) : '';
          // Colors are in columns 7, 8, 9 (indices 6, 7, 8)
          const color1 = row[6] ? String(row[6]) : '';
          const color2 = row[7] ? String(row[7]) : '';
          const color3 = row[8] ? String(row[8]) : '';

          const { desktopPayload, mobilePayload } = createLinkPayloads(clientName, phrase, img1, img2, color1, color2, color3);

          try {
            const response = await fetch('/api/links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientName, desktopPayload, mobilePayload })
            });

            if (!response.ok) throw new Error('Failed');
            
            const resData = await response.json();
            const shortUrl = `https://generadorwebpersonalizadolinks.onrender.com/${resData.slug}`;
            
            // Generate the explicit proposal message
            const message = `¡Hola ${clientName}! En Atenea Growth hemos analizado tu caso y preparamos una propuesta comercial exclusiva para escalar tus resultados. Descúbrela aquí: https://generadorwebpersonalizadolinks.onrender.com/${resData.slug}`;

            const newRow = [...row];
            newRow[4] = shortUrl;
            newRow[5] = message;
            newRow[6] = color1;
            newRow[7] = color2;
            newRow[8] = color3;
            newData.push(newRow);
          } catch (err) {
            console.error(`Error processing row ${i}:`, err);
            const newRow = [...row];
            newRow[4] = 'Error al generar';
            newRow[5] = 'Error al generar';
            newData.push(newRow);
          }
        }

        // Create and set processed data for table preview
        setProcessedData(newData);
        
        alert('¡Archivo procesado con éxito! Puedes ver la tabla abajo.');
      } catch (err) {
        console.error(err);
        alert('Hubo un error al procesar el archivo Excel.');
      } finally {
        setIsProcessingExcel(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-[#0a192f] font-sans p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-4">Enlace Inválido</h1>
          <p className="text-gray-500 mb-8">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-[#0a192f] text-emerald-400 font-bold uppercase tracking-widest py-3 px-6 rounded-xl hover:bg-emerald-500 hover:text-[#0a192f] transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic mb-4">
            Generador de <span className="text-emerald-500">Enlaces</span>
          </h1>
          <p className="text-gray-500 text-lg">
            Crea enlaces inteligentes cortos que redirigen automáticamente a la versión Desktop o Mobile.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-4 font-bold uppercase tracking-widest text-sm transition-colors ${
                activeTab === 'single' 
                  ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              Enlace Individual
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-4 font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'bulk' 
                  ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <FileSpreadsheet size={18} />
              Carga Masiva (Excel)
            </button>
          </div>

          <div className="p-8 md:p-12">
            {activeTab === 'single' ? (
              <form onSubmit={generateLink} className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                    Nombre del Cliente *
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
                    Frase Personalizada *
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
                      URL Imagen 1 <span className="text-gray-300 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="url"
                      name="img1"
                      value={formData.img1}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#0a192f] font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                      placeholder="https://ejemplo.com/img1.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                      URL Imagen 2 <span className="text-gray-300 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="url"
                      name="img2"
                      value={formData.img2}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#0a192f] font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                      placeholder="https://ejemplo.com/img2.jpg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-6">
                  <h4 className="text-sm font-bold text-[#0a192f] mb-4 flex items-center gap-2">
                    <Palette size={16} className="text-emerald-500" />
                    Paleta de Colores <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Color 1 (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          name="color1"
                          value={formData.color1 || '#000000'}
                          onChange={handleInputChange}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          name="color1"
                          value={formData.color1}
                          onChange={handleInputChange}
                          placeholder="#FFFFFF"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0a192f] focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Color 2 (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          name="color2"
                          value={formData.color2 || '#000000'}
                          onChange={handleInputChange}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          name="color2"
                          value={formData.color2}
                          onChange={handleInputChange}
                          placeholder="#FFFFFF"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0a192f] focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Color 3 (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          name="color3"
                          value={formData.color3 || '#000000'}
                          onChange={handleInputChange}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          name="color3"
                          value={formData.color3}
                          onChange={handleInputChange}
                          placeholder="#FFFFFF"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0a192f] focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="bg-[#0a192f] text-emerald-400 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-500 hover:text-[#0a192f] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <LinkIcon size={20} />
                    {isGenerating ? 'Generando...' : 'Generar Enlace Corto'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="bg-white border-2 border-[#0a192f] text-[#0a192f] font-black uppercase tracking-widest py-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={20} />
                    Previsualización
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-8">
                <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl p-10 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm mb-6">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0a192f] mb-2">Sube tu archivo Excel</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    El archivo debe tener las columnas en este orden: <br/>
                    <span className="font-bold">Nombre | Frase | URL Img 1 | URL Img 2 | (Vacío) | (Vacío) | Color 1 | Color 2 | Color 3</span>
                    <br/><span className="text-xs mt-2 block">(Las imágenes y colores son opcionales)</span>
                  </p>
                  
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingExcel}
                    className="bg-emerald-500 text-[#0a192f] font-bold uppercase tracking-widest py-3 px-8 rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessingExcel ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0a192f] border-t-transparent rounded-full animate-spin"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={20} />
                        Seleccionar Archivo
                      </>
                    )}
                  </button>
                </div>

                {processedData ? (
                  <div className="mt-8 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h4 className="font-bold text-[#0a192f]">Resultados Procesados</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setProcessedData(null)}
                          className="bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Limpiar
                        </button>
                        <button
                          onClick={() => {
                            const tableText = processedData.map(row => row.join('\t')).join('\n');
                            navigator.clipboard.writeText(tableText);
                            alert('Datos copiados al portapapeles');
                          }}
                          className="bg-[#0a192f] text-emerald-400 text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-lg hover:bg-emerald-500 hover:text-[#0a192f] transition-colors flex items-center gap-2"
                        >
                          <Copy size={14} />
                          Copiar Tabla
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase font-bold text-[10px] tracking-widest sticky top-0">
                          <tr>
                            {processedData[0].map((header, i) => (
                              <th key={i} className="px-4 py-3">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {processedData.slice(1).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-4 py-3 whitespace-nowrap text-gray-600">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6 text-left">
                    <h4 className="font-bold text-[#0a192f] mb-2 flex items-center gap-2">
                      <Download size={18} className="text-emerald-500" />
                      ¿Qué obtendrás?
                    </h4>
                    <p className="text-sm text-gray-600">
                      Se procesará tu archivo y verás una previsualización de los datos aquí mismo, incluyendo:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                        <strong>URL Generada:</strong> El enlace corto y único para cada cliente.
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                        <strong>Mensaje para el Cliente:</strong> Un texto persuasivo listo para copiar y enviar.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'single' && generatedLink && (
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
                    className="flex-1 bg-white border border-emerald-200 rounded-xl px-4 py-3 text-sm text-gray-600 focus:outline-none font-mono"
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

        {showPreview && previewPayloads && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a192f]/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0a192f]">
                    Previsualización <span className="text-emerald-500">En Tiempo Real</span>
                  </h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                    Cliente: {formData.clientName || 'Sin nombre'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6 bg-gray-100">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[600px]">
                  {/* Desktop Preview */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                      <Monitor size={14} />
                      Versión Desktop
                    </div>
                    <div className="flex-1 bg-white rounded-2xl shadow-inner border border-gray-200 overflow-hidden relative">
                      <iframe 
                        src={`https://propuesta-comercial-desktop.vercel.app/?data=${previewPayloads.desktop}`}
                        className="w-full h-full border-0"
                        title="Desktop Preview"
                      />
                    </div>
                  </div>
                  
                  {/* Mobile Preview */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                      <Smartphone size={14} />
                      Versión Mobile
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="w-[320px] h-full bg-[#0a192f] rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800 relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-2xl z-10"></div>
                        <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                          <iframe 
                            src={`https://mobile-propuesta-con-from-completo-iax6kdhuq.vercel.app/#/p/${previewPayloads.mobile}`}
                            className="w-full h-full border-0"
                            title="Mobile Preview"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 italic">
                  * Esta es una previsualización de cómo el cliente verá la propuesta según su dispositivo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
