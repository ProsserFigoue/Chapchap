
import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Smartphone, ShieldCheck, CheckCircle2, AlertCircle, QrCode, Keyboard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EvolutionService } from '../services/evolutionService';
import { MockDB } from '../services/db.ts';
import { generateUUID, cn } from '../lib/utils';
import { Instance } from '../types';

interface ConnectProps {
  onNavigate: (page: string) => void;
}

// Helper to format pairing code nicely (e.g. ABCD-1234)
const formatPairingCode = (code: string | null) => {
  if (!code) return '';
  // Remove any non-alphanumeric chars
  const clean = code.replace(/[^a-zA-Z0-9]/g, '');
  
  // Standard WhatsApp Pairing Code is 8 chars
  if (clean.length === 8) {
      return `${clean.slice(0, 4)}-${clean.slice(4)}`.toUpperCase();
  }
  return code;
};

export const Connect: React.FC<ConnectProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [instanceName, setInstanceName] = useState('');
  const [evoInstanceData, setEvoInstanceData] = useState<{ name: string, token: string } | null>(null);
  
  // Method State
  const [method, setMethod] = useState<'qr' | 'pairing'>('qr');
  
  // QR State
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  // Pairing Code State
  const [pairingNumber, setPairingNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Generating QR...");

  // Helper to safely extract QR from create response
  const extractQrFromCreateResponse = (res: any): string | null => {
    if (!res) return null;
    let base64 = res.qrcode?.base64 || res.base64;
    
    // Check nested response object if top level fails
    if (!base64 && res.response) {
      base64 = res.response.qrcode?.base64 || res.response.base64;
    }

    if (base64 && typeof base64 === 'string') {
       return base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
    }
    return null;
  };

  // Step 1: Create Instance
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMessage("Creating instance...");

    const newEvoName = generateUUID();
    const token = generateUUID(); // In real app, secure random hex

    try {
      const res = await EvolutionService.createInstance(newEvoName, token);
      setEvoInstanceData({ name: newEvoName, token });
      setStep(2);
      
      // Optimization: If QR is returned in create response, use it immediately
      const immediateQr = extractQrFromCreateResponse(res);
      if (immediateQr) {
        setQrCode(immediateQr);
        setLoading(false);
      } else {
        // Fallback to manual fetch with a small initial delay if using QR
        // If user switches to Pairing immediately, this timeout might still run but that's fine
        setTimeout(() => fetchQR(newEvoName), 1000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create instance. API may be unreachable.";
      setError(message);
      setLoading(false);
    }
  };

  // Step 2a: Fetch QR with Retry
  const fetchQR = async (evoName: string, retryCount = 0) => {
    // Only set loading if we don't have a QR yet and we aren't displaying a pairing code
    if (!qrCode && method === 'qr') setLoading(true);
    
    try {
      if (retryCount > 0) {
        setStatusMessage(`Initializing connection... (Attempt ${retryCount}/10)`);
      } else {
        setStatusMessage("Generating QR Code...");
      }

      const data = await EvolutionService.connectInstance(evoName);
      setQrCode(data); 
      setLoading(false);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.warn(`Fetch QR Attempt ${retryCount + 1} failed:`, err);
      const message = err instanceof Error ? err.message : "Failed to load QR Code.";
      
      const isNotReady = message.includes("not ready") || message.includes("count: 0");
      const maxRetries = isNotReady ? 10 : 3;

      if (retryCount < maxRetries) {
        setTimeout(() => fetchQR(evoName, retryCount + 1), 2000);
      } else {
        // Only show error if we are still in QR mode
        if (method === 'qr') {
          setError(message);
          setLoading(false);
        }
      }
    }
  };

  // Step 2b: Get Pairing Code
  const handleGetPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evoInstanceData || !pairingNumber) return;

    setLoading(true);
    setError(null);
    setStatusMessage("Generating Pairing Code...");
    
    try {
        const code = await EvolutionService.getPairingCode(evoInstanceData.name, pairingNumber);
        setPairingCode(code);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get pairing code.";
        setError(message);
    } finally {
        setLoading(false);
    }
  };

  const handleMethodChange = (newMethod: 'qr' | 'pairing') => {
    setMethod(newMethod);
    setError(null);
    // If switching back to QR and we don't have one, try fetching
    if (newMethod === 'qr' && !qrCode && evoInstanceData) {
        fetchQR(evoInstanceData.name, 0);
    }
  };

  // Polling for connection status
  useEffect(() => {
    if (step !== 2 || !evoInstanceData) return;

    const interval = setInterval(async () => {
      try {
        const status = await EvolutionService.checkConnectionState(evoInstanceData.name);
        if (status === 'open') {
          // Connected!
          const newInstance: Instance = {
            id: generateUUID(),
            name: instanceName,
            evoInstanceName: evoInstanceData.name,
            evoAuthToken: evoInstanceData.token,
            status: 'open',
            phone: method === 'pairing' ? pairingNumber : undefined, // Store number if we know it
            createdAt: Date.now()
          };
          MockDB.addInstance(newInstance);
          setStep(3);
          clearInterval(interval);
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [step, evoInstanceData, instanceName, method, pairingNumber]);

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4">
      <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="mb-6 pl-0 hover:pl-2 transition-all">
        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
      </Button>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Connect New Device</h1>
        <p className="text-slate-500">Follow the steps to link your WhatsApp Business account.</p>
      </div>

      <Card className="overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 flex">
          <div className={`h-full bg-[#1BD760] transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
        </div>

        <CardContent className="p-8">
          {step === 1 && (
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full mx-auto flex items-center justify-center text-[#1BD760]">
                  <Smartphone size={32} />
                </div>
                <h2 className="text-xl font-semibold">Name your Device</h2>
                <p className="text-sm text-slate-500">Give this connection a friendly name (e.g. "Marketing Support")</p>
              </div>

              <Input 
                label="Instance Name" 
                placeholder="Marketing Team Phone" 
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                required
                autoFocus
              />

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                {loading ? statusMessage : "Continue"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="text-center space-y-6">
              {/* Method Toggles */}
              <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => handleMethodChange('qr')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                    method === 'qr' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <QrCode size={16} /> Scan QR Code
                </button>
                <button
                  type="button"
                  onClick={() => handleMethodChange('pairing')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                    method === 'pairing' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Keyboard size={16} /> Pairing Code
                </button>
              </div>

              {method === 'qr' ? (
                /* QR CODE VIEW */
                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                   <div className="space-y-2">
                     <h2 className="text-xl font-semibold">Scan QR Code</h2>
                     <p className="text-sm text-slate-500">Open WhatsApp > Settings > Linked Devices > Link a Device</p>
                   </div>
                   
                   <div className="relative w-64 h-64 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-200 overflow-hidden">
                    {loading && !qrCode ? (
                      <div className="flex flex-col items-center gap-3 text-slate-400 p-4">
                        <RefreshCw className="animate-spin text-[#1BD760]" size={32} />
                        <div className="text-center">
                            <span className="text-sm font-medium text-slate-700 block mb-1">Setting up...</span>
                            <span className="text-xs text-slate-400 max-w-[180px] block mx-auto leading-relaxed">{statusMessage}</span>
                        </div>
                      </div>
                    ) : qrCode ? (
                      <img src={qrCode} alt="WhatsApp QR" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center w-full">
                          <div className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-2 rounded-lg border border-red-100 max-w-full break-words">
                              {error === "Instance not ready to generate QR" 
                                ? "Instance is taking longer than expected to initialize." 
                                : error || "Failed to load QR Code"}
                          </div>
                          <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => evoInstanceData && fetchQR(evoInstanceData.name, 0)}
                              className="gap-2"
                          >
                              <RefreshCw size={14} /> Try Again
                          </Button>
                      </div>
                    )}
                    {/* Overlay for privacy/security feel */}
                    <div className="absolute inset-0 pointer-events-none border-[6px] border-white/50 rounded-2xl" />
                  </div>
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm animate-pulse">
                    Waiting for scan...
                  </div>
                </div>
              ) : (
                /* PAIRING CODE VIEW */
                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Link with Phone Number</h2>
                        <p className="text-sm text-slate-500">
                            Receive a code to enter in your WhatsApp app.
                        </p>
                    </div>

                    {!pairingCode ? (
                        <form onSubmit={handleGetPairingCode} className="max-w-xs mx-auto space-y-4">
                            <div className="text-left">
                                <Input 
                                    label="WhatsApp Number" 
                                    placeholder="e.g. 254712345678"
                                    value={pairingNumber}
                                    onChange={(e) => setPairingNumber(e.target.value)}
                                    required
                                    className="text-center text-lg tracking-wide"
                                />
                            </div>
                            
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex gap-2 text-left">
                                <AlertCircle size={16} className="shrink-0" /> {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" isLoading={loading}>
                                Get Pairing Code
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200">
                                <div className="text-slate-400 text-xs uppercase tracking-widest mb-2 font-semibold">Pairing Code</div>
                                <div className="text-4xl font-mono font-bold tracking-[0.2em] text-[#1BD760]">
                                    {formatPairingCode(pairingCode)}
                                </div>
                            </div>
                            
                             <div className="bg-slate-50 p-4 rounded-xl text-left space-y-3 border border-slate-100">
                                <h4 className="font-semibold text-slate-900 text-sm">How to connect:</h4>
                                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1.5 ml-1">
                                    <li>Open <strong>WhatsApp</strong> on your phone</li>
                                    <li>Go to <strong>Settings {'>'} Linked Devices</strong></li>
                                    <li>Tap <strong>Link a Device</strong></li>
                                    <li>Tap <strong>"Link with phone number instead"</strong></li>
                                    <li>Enter the code shown above</li>
                                </ol>
                            </div>

                             <Button variant="outline" size="sm" onClick={() => setPairingCode(null)}>
                                Use different number
                            </Button>
                        </div>
                    )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-4">
                <ShieldCheck size={14} /> End-to-end encrypted connection
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center text-[#1BD760] animate-bounce">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Connected Successfully!</h2>
              <p className="text-slate-500">Your instance <strong>{instanceName}</strong> is now live.</p>
              
              <Button onClick={() => onNavigate('dashboard')} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
