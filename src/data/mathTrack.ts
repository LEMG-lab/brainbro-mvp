export interface MathTrackTier {
    id: number;
    name: string;
    description: string;
    skills: string[];
    examples: string[];
}

export const mathTrackTiers: MathTrackTier[] = [
    {
        id: 1,
        name: "Control de Cantidades y Dinero Básico",
        description: "Operaciones fundamentales aplicadas al mundo real. Entiende cómo funcionan los números simples al hacer compras, calcular tiempo y administrar recursos limitados.",
        skills: ["Aritmética básica mental", "Proporciones directas", "Control de impulsos financieros", "Planificación de recursos"],
        examples: ["Presupuestos de videojuegos", "Cambio en la tienda", "Repartir snacks equitativamente"]
    }
];

// Mapping for reference and UI labels
export const mathDomainLabels: Record<string, string> = {
    money: "Dinero & Finanzas",
    school: "Escuela & Productividad",
    games: "Videojuegos & Diversión",
    life: "Vida Diaria",
    coding: "Lógica y Sistemas"
};
