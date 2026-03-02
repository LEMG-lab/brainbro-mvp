const fs = require('fs');

const file = '/Users/lemg/.gemini/antigravity/scratch/BrainBro/src/data/sessions.ts';
let data = fs.readFileSync(file, 'utf8');

const t1Sessions = [];
const domains = ['money', 'school', 'games', 'life', 'coding'];
const topics = ['Suscripción de juegos', 'Ahorros mensuales', 'Snacks compartidos', 'Tiempo de pantalla', 'Calculando daño', 'Monedas de juego', 'Descuento tienda', 'Coleccionables', 'Puntos exp.', 'Ingresos extra', 'Precio unitario', 'Repartición eq.', 'Velocidad de red', 'Almacenamiento', 'Distancia mapa', 'Combustible nave', 'Gasto hormiga', 'Ahorro meta', 'Pago grupal', 'Comida rápida'];

for (let i = 1; i <= 20; i++) {
    const domain = domains[i % 5];
    t1Sessions.push(`    {
        id: 'math_t1_${i.toString().padStart(2, '0')}',
        areaId: 'math',
        topic: '${topics[i - 1]}',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_${i}",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración ${i}: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "${domain}"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    }`);
}

const injection = t1Sessions.join(',\n') + '\n];';
data = data.replace('];', ',\n' + injection);

fs.writeFileSync(file, data);
console.log("Injected 20 sessions");
