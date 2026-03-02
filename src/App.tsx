import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import AreaModule from './pages/AreaModule';
import AreaDashboard from './pages/AreaDashboard';
import Practice from './pages/Practice';
import Session from './pages/Session';
import Review from './pages/Review';
import Progress from './pages/Progress';
import Debug from './pages/Debug';
import ParentDashboard from './pages/ParentDashboard';
import TeacherMode from './pages/TeacherMode';
import SmokeTest from './pages/SmokeTest';
import EvidenceTimeline from './pages/EvidenceTimeline';
import ErrorBoundary from './components/ErrorBoundary';
import { ensureDefaultChildMigration } from './lib/childStorage';
import { initLedger } from './lib/ledgerEngine';

// Phase 15.1: Run once to migrate single-profile data to child namespace
ensureDefaultChildMigration();
// Phase 16.5: Initialize daily ledger (backfill + recompute today)
initLedger();

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Dashboard />} />

                        <Route path="/area/:areaId" element={<AreaModule />}>
                            <Route index element={<AreaDashboard />} />
                            <Route path="practice" element={<Practice />} />
                            <Route path="session/:id" element={<Session />} />
                            <Route path="review/:resultId" element={<Review />} />
                            <Route path="progress" element={<Progress />} />
                        </Route>

                        <Route path="/debug" element={<Debug />} />
                        <Route path="/parent" element={<ParentDashboard />} />
                        <Route path="/teacher" element={<TeacherMode />} />
                        <Route path="/smoke" element={<SmokeTest />} />
                        <Route path="/timeline" element={<EvidenceTimeline />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
