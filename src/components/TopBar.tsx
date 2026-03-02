import { useState } from 'react';
import { Trophy, Flame, Users } from 'lucide-react';
import { getXp, getStreak, getOnboarding } from '../lib/storage';
import { getRegistry, setActiveChild, addChild } from '../lib/childStorage';
import { motion } from 'framer-motion';

export default function TopBar() {
    const xp = getXp();
    const streak = getStreak();
    const onboarding = getOnboarding();
    const registry = getRegistry();
    const activeChild = registry.children.find(c => c.id === registry.activeChildId);

    const [showSwitcher, setShowSwitcher] = useState(false);

    const currentLevel = Math.floor(xp.total / 200) + 1;
    const currentLevelXp = xp.total % 200;
    const progressPercent = (currentLevelXp / 200) * 100;
    const circumference = 2 * Math.PI * 18;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    const handleSwitch = (childId: string) => {
        setActiveChild(childId);
        setShowSwitcher(false);
        window.location.reload();
    };

    const handleAdd = () => {
        const name = prompt('Name for new child:');
        if (name && name.trim()) {
            const child = addChild(name.trim());
            setActiveChild(child.id);
            window.location.reload();
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
            padding: '16px 32px',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
            {/* Child Switcher */}
            <div style={{ position: 'relative' }}>
                <button onClick={() => setShowSwitcher(!showSwitcher)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Users size={14} color="var(--accent-primary)" />
                    {activeChild?.name || 'Child'}
                </button>
                {showSwitcher && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 200 }}>
                        {registry.children.map(c => (
                            <div key={c.id} onClick={() => handleSwitch(c.id)} style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: c.id === registry.activeChildId ? 800 : 500, color: c.id === registry.activeChildId ? 'var(--accent-primary)' : 'var(--text-main)', background: c.id === registry.activeChildId ? 'rgba(168,85,247,0.1)' : 'transparent' }}>
                                {c.name} {c.id === registry.activeChildId ? '✓' : ''}
                            </div>
                        ))}
                        <div onClick={handleAdd} style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', marginTop: 4, borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 700 }}>+ Add Child</div>
                    </div>
                )}
            </div>

            {/* Level Ring */}
            <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                    <circle cx="22" cy="22" r="18" fill="transparent" stroke="var(--border)" strokeWidth="4" />
                    <motion.circle
                        cx="22" cy="22" r="18" fill="transparent"
                        stroke="var(--accent-primary)"
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }}
                    />
                </svg>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'var(--surface)', borderRadius: '50%', color: 'var(--accent-primary)', fontWeight: 900, fontSize: '0.85rem' }}>
                    {currentLevel}
                </div>
            </div>

            {/* XP Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, maxWidth: 400 }}>
                <div style={{ height: 14, background: 'var(--surface)', borderRadius: 8, flex: 1, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, type: "spring", damping: 20 }}
                        style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--accent-primary), #c084fc)',
                            boxShadow: '0 0 15px var(--accent-glow)',
                            borderRadius: '0 8px 8px 0',
                            position: 'relative'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'lightSweep 2s infinite' }} />
                    </motion.div>
                </div>
                <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 800, minWidth: 80 }}>{currentLevelXp} / 200</span>
            </div>

            {/* Streak & XP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: streak.current > 0 ? 'var(--warning)' : 'var(--border)', fontWeight: 900, fontSize: '1.2rem', textShadow: streak.current > 0 ? '0 0 15px rgba(245, 158, 11, 0.5)' : 'none' }}>
                    <Flame size={24} fill={streak.current > 0 ? "currentColor" : "none"} />
                    <span>{streak.current}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', fontWeight: 900, fontSize: '1.2rem', position: 'relative' }}>
                    <Trophy size={20} color="var(--success)" style={{ filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))' }} />
                    <span>{xp.total} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>XP</span></span>
                    {!onboarding.completed && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 12, width: 200, background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--accent-primary)', boxShadow: '0 0 20px var(--accent-glow)', fontSize: '0.9rem', color: 'var(--text-main)', textAlign: 'center', animation: 'bounce 2s infinite' }}>
                            <div style={{ position: 'absolute', top: -6, right: 24, width: 12, height: 12, background: 'var(--bg-secondary)', borderTop: '1px solid var(--accent-primary)', borderLeft: '1px solid var(--accent-primary)', transform: 'rotate(45deg)' }} />
                            Earn XP and build streaks to level up!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
