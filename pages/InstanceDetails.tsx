import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Calendar, Key, Activity, Smartphone, Wifi, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { MockDB } from '../services/db.ts';
import { EvolutionService } from '../services/evolutionService';
import { Instance } from '../types';
import { cn, formatPhoneNumber } from '../lib/utils';

interface InstanceDetailsProps {
  instanceId: string;
  onNavigate: (page: string) => void;
}

export const InstanceDetails: React.FC<InstanceDetailsProps> = ({ instanceId, onNavigate }) => {
  const [instance, setInstance] = useState<Instance | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInstance();
  }, [instanceId]);

  const loadInstance = () => {
    const allInstances = MockDB.getInstances();
    const found = allInstances.find(i => i.id === instanceId);
    if (found) {
      setInstance(found);
    }
  };

  const handleRefreshStatus = async () => {
    if (!instance) return;
    setRefreshing(true);
    try {
      const status = await EvolutionService.checkConnectionState(instance.evoInstanceName);
      const updated = { ...instance, status };
      MockDB.updateInstanceStatus(instance.id, status);
      setInstance(updated);
    } catch (e) {
      console.error("Status refresh failed", e);
    }
    setRefreshing(false);
  };

  if (!instance) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Instance not found
      </div>
    );
  }

  const formattedDate = instance.createdAt 
    ? new Date(instance.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Unknown';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="pl-0 hover:pl-2 transition-all text-slate-500">
        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{instance.name}</h1>
            <div className={cn(
                "px-2.5 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5",
                instance.status === 'open' ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
              )}>
                <span className={cn("w-2 h-2 rounded-full", instance.status === 'open' ? "bg-green-500" : "bg-orange-400")} />
                {instance.status === 'open' ? 'Live' : 'Offline'}
              </div>
          </div>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">ID: {instance.evoInstanceName}</span>
          </p>
        </div>
        
        <Button variant="outline" onClick={handleRefreshStatus} isLoading={refreshing} className="gap-2">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone size={18} className="text-slate-400" />
                Device Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <div className="text-lg font-medium text-slate-900 mt-0.5">
                  {formatPhoneNumber(instance.phone) || 'N/A'}
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                 <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-slate-400 mt-0.5" />
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created On</label>
                        <div className="text-sm text-slate-700 mt-0.5">{formattedDate}</div>
                    </div>
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                 <div className="flex items-start gap-3">
                    <Key size={18} className="text-slate-400 mt-0.5" />
                    <div className="overflow-hidden w-full">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auth Token</label>
                        <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded mt-1 truncate">
                            {instance.evoAuthToken}
                        </div>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#F3FFF8] to-white border-green-100">
             <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Wifi size={20} className="text-[#1BD760]" />
                    <h3 className="font-semibold text-slate-900">Connection Health</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                    Your instance is currently <strong>{instance.status}</strong>. 
                    {instance.status === 'open' 
                        ? " Messages can be sent and received in real-time." 
                        : " Please check your phone internet connection."}
                </p>
                {instance.status !== 'open' && (
                    <Button size="sm" variant="secondary" className="w-full">Reconnect</Button>
                )}
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity / History */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="h-full min-h-[400px]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity size={18} className="text-slate-400" />
                        Activity Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative pl-4 border-l border-slate-200 space-y-8 my-2">
                        {/* Mock History Data */}
                        <div className="relative">
                            <div className="absolute -left-[21px] w-3 h-3 bg-green-500 rounded-full border-2 border-white ring-1 ring-green-100" />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900">Status Check: Online</span>
                                <span className="text-xs text-slate-400">Just now</span>
                            </div>
                        </div>

                         <div className="relative">
                            <div className="absolute -left-[21px] w-3 h-3 bg-blue-500 rounded-full border-2 border-white ring-1 ring-blue-100" />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900">Message Sent to ...{instance.phone?.slice(-4) || '8888'}</span>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-1 max-w-md">
                                    "Hello! This is a test message from Chapchap."
                                </p>
                                <span className="text-xs text-slate-400 mt-1">Today, 10:42 AM</span>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[21px] w-3 h-3 bg-slate-300 rounded-full border-2 border-white" />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900">Instance Created</span>
                                <span className="text-xs text-slate-400">{formattedDate}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400 italic">
                            Detailed message history requires connecting a webhook or database integration.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
};
