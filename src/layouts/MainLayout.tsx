import { Outlet, Link, useLocation } from 'react-router-dom';
import { getAccent, saveAccent } from '../lib/storage';
import { useState } from 'react';
import { Brain } from 'lucide-react';
import TopBar from '../components/TopBar';
import { AnimatePresence, motion } from 'framer-motion';

export default function MainLayout() {
    const [accent, setAccent] = useState(getAccent());
    const location = useLocation();

    const handleAccentChange = (a: string) => {
        setAccent(a);
        saveAccent(a);
    };

    const isActive = (path: string) => location.pathname === path ? { color: 'var(--primary)' } : {};

    return (
        <div className="app-shell">
            <TopBar />
            <nav className="top-nav">
                <div className="nav-brand">
                    <Link to="/"><Brain /> BrainBro</Link>
                </div>
                <div className="nav-links">
                    <Link to="/" style={isActive('/')}>Dashboard</Link>
                    <Link to="/area/english/practice" style={isActive('/area/english/practice')}>Practice</Link>
                    <Link to="/area/english/progress" style={isActive('/area/english/progress')}>Progress</Link>
                    {import.meta.env.DEV && (
                        <Link to="/debug" style={isActive('/debug')}>Debug</Link>
                    )}
                </div>
                <div className="nav-controls">
                    <select value={accent} onChange={e => handleAccentChange(e.target.value)}>
                        <option value="en-US">🇺🇸 EN-US</option>
                        <option value="en-GB">🇬🇧 EN-GB</option>
                    </select>
                </div>
            </nav>
            <main className="main-content">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <Outlet context={{ accent }} />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
