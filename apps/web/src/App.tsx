import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './hooks/useApp';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Understand from './pages/Understand';
import Dependencies from './pages/Dependencies';
import Documents from './pages/Documents';
import Tests from './pages/Tests';
import Modernize from './pages/Modernize';
import Risks from './pages/Risks';
import Traceability from './pages/Traceability';
import Assistant from './pages/Assistant';
import Architecture from './pages/Architecture';

function AppShell() {
  const { workbookData } = useApp();

  if (!workbookData) return <Welcome />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/understand" element={<Understand />} />
        <Route path="/dependencies" element={<Dependencies />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/modernize" element={<Modernize />} />
        <Route path="/risks" element={<Risks />} />
        <Route path="/traceability" element={<Traceability />} />
        <Route path="/assistant" element={<Assistant />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}
