export interface GrowthArea {
    id: string;
    name: string;
    status: 'active' | 'coming-soon';
    description?: string;
}

export const growthAreas: GrowthArea[] = [
    { id: "english", name: "English", status: "active", description: "Train your ear. Expand your vocab." },
    { id: "math", name: "Math", status: "active", description: "Logic, algebra, and problem solving." },
    { id: "vocabulary", name: "Vocabulary", status: "active", description: "Build your word arsenal." },
    { id: "writing", name: "Writing", status: "active", description: "Argumentación y escritura crítica." },
    { id: "thinking", name: "Critical Thinking", status: "active", description: "Learn how to analyze and form arguments." },
    { id: "spanish", name: "Spanish", status: "coming-soon", description: "Entrena tu español." },
    { id: "projects", name: "Projects", status: "coming-soon", description: "Build real things from scratch." },
    { id: "life", name: "Life Skills", status: "coming-soon", description: "Taxes, communication, and emotional intelligence." }
];
