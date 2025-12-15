import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Connect } from './pages/Connect';
import { InstanceDetails } from './pages/InstanceDetails';
import { MockDB } from './services/db.ts';

type Page = 'login' | 'dashboard' | 'connect' | 'instance-details';

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    // Check initial auth state
    const user = MockDB.getUser();
    if (user) {
      setIsAuth(true);
      setCurrentPage('dashboard');
    }
  }, []);

  const handleLogin = () => {
    setIsAuth(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    MockDB.logout();
    setIsAuth(false);
    setCurrentPage('login');
  };

  const navigate = (page: string, instanceId?: string) => {
    if (instanceId) {
        setActiveInstanceId(instanceId);
    }
    setCurrentPage(page as Page);
  };

  // Simple Router
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'connect':
        return <Connect onNavigate={navigate} />;
      case 'instance-details':
        if (!activeInstanceId) return <Dashboard onNavigate={navigate} />;
        return <InstanceDetails instanceId={activeInstanceId} onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  if (!isAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout onLogout={handleLogout} currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
};

export default App;