/**
 * Phase 16.2: Error Boundary
 * Catches runtime errors with friendly fallback and debug report download.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION, BUILD_DATE } from '../lib/version';
import { getActiveChildId } from '../lib/childStorage';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[BrainBro ErrorBoundary]', error, info);
    }

    buildReport(): string {
        const error = this.state.error;
        const keys = Object.keys(localStorage).filter(k => k.startsWith('brainbro_'));
        const keySummary: Record<string, number> = {};
        keys.forEach(k => { keySummary[k] = (localStorage.getItem(k) || '').length; });

        // Last 3 scores summary (from cognitive sessions)
        let recentScores: any[] = [];
        try {
            const raw = localStorage.getItem('brainbro_cognitive_sessions_v1');
            if (raw) {
                const sessions = JSON.parse(raw);
                recentScores = sessions.slice(0, 3).map((s: any) => ({
                    date: new Date(s.date).toISOString().split('T')[0],
                    accuracy: s.accuracy,
                    calibration: s.calibrationScore,
                }));
            }
        } catch { /* silent */ }

        const report = {
            version: APP_VERSION,
            buildDate: BUILD_DATE,
            childId: getActiveChildId(),
            timestamp: new Date().toISOString(),
            lastErrorMessage: error?.message || 'Unknown error',
            stack: error?.stack?.split('\n').slice(0, 8).join('\n') || null,
            localStorageKeysSummary: keySummary,
            recentScores,
        };

        return JSON.stringify(report, null, 2);
    }

    downloadReport = () => {
        const blob = new Blob([this.buildReport()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainbro-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#e0e0e0', padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: '#f59e0b' }}>Algo salió mal</h1>
                    <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
                        BrainBro encontró un error inesperado. Tus datos están seguros. Recarga la página para continuar.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'rgb(168,85,247)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                            Recargar
                        </button>
                        <button onClick={this.downloadReport} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.4)', background: 'transparent', color: 'rgb(168,85,247)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                            📥 Debug Report
                        </button>
                    </div>
                    <div style={{ marginTop: 24, fontSize: '0.7rem', color: '#555' }}>
                        v{APP_VERSION} · {this.state.error?.message?.slice(0, 80)}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
