import { useParams, Link, Outlet } from 'react-router-dom';
import { growthAreas } from '../data/growthAreas';
import { Lock, ArrowLeft } from 'lucide-react';

export default function AreaModule() {
    const { areaId } = useParams();
    const area = growthAreas.find(a => a.id === areaId);

    if (!area) {
        return <div style={{ textAlign: 'center', marginTop: 40 }}>Area not found.</div>;
    }

    // If the area is coming soon, render the placeholder
    if (area.status === 'coming-soon') {
        return (
            <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', marginBottom: 32, fontWeight: 600 }}>
                    <ArrowLeft size={18} /> Back to Growth Areas
                </Link>
                <div className="card" style={{ borderStyle: 'dashed', padding: 60 }}>
                    <Lock size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                    <h1 style={{ fontSize: '2.5rem', marginBottom: 12 }}>{area.name}</h1>
                    <div className="badge" style={{ background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>Coming Soon</div>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: 24 }}>
                        {area.description}
                        <br /><br />
                        We are working hard to build this module. Check back later!
                    </p>
                </div>
            </div>
        );
    }

    // If active, render the nested routes (English Dashboard, Practice, etc)
    return <Outlet context={{ area }} />;
}
