import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, CheckCircle } from 'lucide-react';

const AMBIGUITY_PROMPTS = [
    {
        id: 'ethics_homework',
        prompt_es: 'Tu mejor amigo te pide copiar tu tarea de matemáticas. Si le dices que no, podría enojarse. Si le dices que sí, ambos podrían tener problemas. ¿Qué harías y por qué?',
        prompt_short: 'Ética: Copiar tarea',
    },
    {
        id: 'decision_uncertainty',
        prompt_es: 'Tienes un examen importante mañana pero tu equipo favorito juega la final hoy. No sabes si el examen será fácil o difícil. Solo tienes 2 horas libres. ¿Cómo decides qué hacer?',
        prompt_short: 'Decisión bajo incertidumbre',
    },
    {
        id: 'tradeoff_money',
        prompt_es: 'Tienes $500 de tu mesada. Puedes comprar unos audífonos que quieres ya, o ahorrar 3 meses más para comprar algo mejor. Un amigo dice que los audífonos podrían agotarse. ¿Qué haces y qué factores consideras?',
        prompt_short: 'Tradeoff: Gastar vs Ahorrar',
    },
];

function getTodayPrompt(): typeof AMBIGUITY_PROMPTS[0] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return AMBIGUITY_PROMPTS[dayOfYear % AMBIGUITY_PROMPTS.length];
}

interface AmbiguityCaseProps {
    onSubmit: (answer: string, promptId: string) => void;
    submitted: boolean;
    score?: number;
}

export default function AmbiguityCase({ onSubmit, submitted, score }: AmbiguityCaseProps) {
    const [answer, setAnswer] = useState('');
    const todayPrompt = getTodayPrompt();
    const isValid = answer.trim().length >= 30;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: 20,
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 12,
                marginTop: 24,
            }}
        >
            <div style={{
                fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <HelpCircle size={18} /> AMBIGUITY CASE
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>
                No hay respuesta correcta. Se evalúa la calidad de tu razonamiento.
            </p>
            <p style={{ color: 'var(--text-main)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 16 }}>
                {todayPrompt.prompt_es}
            </p>

            {!submitted ? (
                <>
                    <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Escribe tu razonamiento completo (mín 30 caracteres)..."
                        style={{
                            width: '100%', minHeight: 80, padding: 12, borderRadius: 8,
                            background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)',
                            border: '1px solid var(--border)', fontSize: '0.95rem', resize: 'vertical',
                            marginBottom: 12,
                        }}
                    />
                    {answer.length > 0 && !isValid && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: 8 }}>
                            Necesitas al menos 30 caracteres ({answer.trim().length}/30)
                        </div>
                    )}
                    <button
                        className="btn"
                        disabled={!isValid}
                        onClick={() => onSubmit(answer.trim(), todayPrompt.id)}
                        style={{
                            width: 'auto', padding: '10px 24px', fontSize: '0.9rem',
                            background: isValid ? 'var(--warning)' : 'rgba(255,255,255,0.05)',
                            color: isValid ? '#000' : 'var(--text-muted)', fontWeight: 800,
                        }}
                    >
                        Submit Reasoning
                    </button>
                </>
            ) : (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 16, background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 10, color: 'var(--success)', border: '1px solid var(--success)',
                }}>
                    <CheckCircle size={22} />
                    <div>
                        <strong style={{ display: 'block' }}>Razonamiento registrado</strong>
                        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                            Calidad: {score !== undefined ? `${score}/5` : 'Evaluando...'} ✓
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
