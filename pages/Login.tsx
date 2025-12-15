import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { MockDB } from '../services/db.ts';

export const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      MockDB.login(email);
      onLogin();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3FFF8] to-[#F6F2FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#1BD760] rounded-xl flex items-center justify-center text-white mx-auto shadow-lg shadow-green-200">
            <MessageCircle size={28} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to Chapchap</h1>
          <p className="text-slate-500">Sign in to manage your WhatsApp automation.</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                disabled 
              />
              <div className="text-xs text-right text-[#1BD760] cursor-pointer hover:underline font-medium">
                Forgot password?
              </div>
              <Button type="submit" className="w-full h-12 text-base" isLoading={loading}>
                Sign In
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-400">
              Don't have an account? <span className="text-[#1BD760] font-semibold cursor-pointer">Sign up</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};