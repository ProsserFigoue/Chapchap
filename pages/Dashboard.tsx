import React, { useEffect, useState } from 'react';
import { Plus, Smartphone, RefreshCw, Send, Trash2, AlertCircle, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { MockDB } from '../services/db.ts';
import { EvolutionService } from '../services/evolutionService';
import { Instance, ConnectionStatus } from '../types';
import { cn, formatPhoneNumber } from '../lib/utils';

interface DashboardProps {
  onNavigate: (page: string, instanceId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Messaging State
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [destNumber, setDestNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    setLoading(true);
    const localInstances = MockDB.getInstances();
    
    // Sync status with API
    const updatedInstances = await Promise.all(localInstances.map(async (inst) => {
      try {
        const status = await EvolutionService.checkConnectionState(inst.evoInstanceName);
        if (status !== inst.status) {
          MockDB.updateInstanceStatus(inst.id, status);
          return { ...inst, status };
        }
      } catch (e) {
        console.warn("Failed to sync status", e);
      }
      return inst;
    }));
    
    setInstances(updatedInstances);
    setLoading(false);
  };

  const handleDelete = async (instance: Instance) => {
    if (!confirm('Are you sure you want to disconnect and delete this instance?')) return;
    try {
      await EvolutionService.logoutInstance(instance.evoInstanceName);
    } catch (e) {
      console.error("Logout failed on API, removing locally");
    }
    MockDB.removeInstance(instance.id);
    loadInstances();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstance || !destNumber || !messageBody) return;
    
    setSending(true);
    try {
      // Format number (simple clean)
      const number = destNumber.replace(/\D/g, '');
      await EvolutionService.sendText(selectedInstance.evoInstanceName, number, messageBody);
      alert('Message sent successfully!');
      setMessageBody('');
    } catch (err) {
      alert('Failed to send message. Check console.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your WhatsApp connections and campaigns.</p>
        </div>
        <Button onClick={() => onNavigate('connect')} className="gap-2 shadow-lg shadow-green-200">
          <Plus size={18} />
          Connect WhatsApp
        </Button>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading instances...</div>
        ) : instances.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Smartphone className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No Devices Connected</h3>
              <p className="text-slate-500 max-w-sm mt-2 mb-6">Connect your first WhatsApp number to start sending messages instantly.</p>
              <Button variant="outline" onClick={() => onNavigate('connect')}>Connect Now</Button>
            </CardContent>
          </Card>
        ) : (
          instances.map((instance) => (
            <Card key={instance.id} className="overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="h-1.5 w-full bg-gradient-to-r from-green-400 to-green-600" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base truncate pr-2">{instance.name}</CardTitle>
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0",
                  instance.status === 'open' ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", instance.status === 'open' ? "bg-green-500 animate-pulse" : "bg-orange-400")} />
                  {instance.status === 'open' ? 'Live' : 'Connecting'}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500 mb-6 flex items-center gap-2">
                  <Smartphone size={14} />
                  {formatPhoneNumber(instance.phone) || 'Waiting for number...'}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => setSelectedInstance(instance)}
                    disabled={instance.status !== 'open'}
                  >
                    Message
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-[#1BD760] hover:bg-green-50"
                    onClick={() => onNavigate('instance-details', instance.id)}
                    title="View Details"
                  >
                    <Info size={16} />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(instance)}
                    title="Delete Instance"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Send Section (Only if an instance is selected) */}
      {selectedInstance && (
        <div className="mt-8 border-t border-slate-200 pt-8 animate-in slide-in-from-bottom-4">
           <Card className="max-w-2xl bg-gradient-to-br from-white to-[#F3FFF8]">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Send size={20} className="text-[#1BD760]" />
                 Quick Send via {selectedInstance.name}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <form onSubmit={handleSendMessage} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <Input 
                        label="Phone Number" 
                        placeholder="e.g. 254712345678" 
                        value={destNumber}
                        onChange={(e) => setDestNumber(e.target.value)}
                        required
                      />
                    </div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-slate-700 mb-1.5 block">Message</label>
                   <textarea 
                      className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1BD760] transition-shadow resize-none"
                      placeholder="Type your message here..."
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      required
                   />
                 </div>
                 <div className="flex justify-end gap-2">
                   <Button type="button" variant="ghost" onClick={() => setSelectedInstance(null)}>Cancel</Button>
                   <Button type="submit" isLoading={sending}>
                     Send Now
                   </Button>
                 </div>
               </form>
             </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
};