import { SessionData } from '../types';

export const sessions: SessionData[] = [
    {
        id: 's1',
        topic: 'Video Games',
        difficulty: 1,
        text: "Video games are very popular today. Many teenagers play them after school. Some games are on phones, and some are on big consoles. Playing games with friends online is a great way to relax. However, it is important to finish homework first. Games can help you learn problem-solving skills too.",
        questions: [
            { q: "Who plays video games after school?", options: ["Teachers", "Many teenagers", "Parents", "Nobody"], correct: "Many teenagers", explanation_es: "'Teenagers' significa adolescentes." },
            { q: "Where can you play some games?", options: ["Only on phones", "Only on consoles", "On phones and consoles", "On paper"], correct: "On phones and consoles", explanation_es: "El texto menciona 'phones' y 'consoles'." },
            { q: "Why is playing with friends online good?", options: ["It is boring", "It is a great way to relax", "It makes you angry", "You lose money"], correct: "It is a great way to relax", explanation_es: "'Relax' significa relajarse." },
            { q: "What should you do before playing?", options: ["Sleep", "Finish homework", "Eat dinner", "Clean your room"], correct: "Finish homework", explanation_es: "'Finish homework first' significa terminar la tarea primero." },
            { q: "What skills can games help you learn?", options: ["Cooking", "Problem-solving", "Driving", "Swimming"], correct: "Problem-solving", explanation_es: "Resolución de problemas." }
        ],
        vocabLearned: [
            { word: "Teenagers", meaning_es: "Adolescentes", example_en: "Teenagers play games." },
            { word: "Consoles", meaning_es: "Consolas", example_en: "I play on my console." },
            { word: "Relax", meaning_es: "Relajarse", example_en: "I want to relax." },
            { word: "Problem-solving", meaning_es: "Resolución de problemas", example_en: "It improves problem-solving." },
            { word: "Skills", meaning_es: "Habilidades", example_en: "I have good skills." }
        ],
        coachTip: "¡Ojo con la palabra 'Homework'! En inglés es incontable, no digas 'homeworks'."
    },
    {
        id: 's2',
        topic: 'School Life',
        difficulty: 2,
        text: "High school can be challenging but exciting. You meet new people and learn new subjects. Sometimes, there is a lot of homework. If you manage your time well, you can still hang out with friends. Joining clubs or sports teams can make school much more fun.",
        questions: [
            { q: "How can high school be?", options: ["Boring", "Challenging but exciting", "Very easy", "Sad"], correct: "Challenging but exciting", explanation_es: "Desafiante pero emocionante." },
            { q: "What happens sometimes?", options: ["No homework", "Lot of homework", "You sleep all day", "You fail"], correct: "Lot of homework", explanation_es: "A veces hay mucha tarea." },
            { q: "How can you still hang out with friends?", options: ["By skipping school", "If you manage your time well", "By crying", "By doing nothing"], correct: "If you manage your time well", explanation_es: "Manejando bien tu tiempo." },
            { q: "What makes school more fun?", options: ["Joining clubs or sports", "Staying home", "Doing more homework", "Sleeping in class"], correct: "Joining clubs or sports", explanation_es: "Unirte a clubes o deportes." },
            { q: "What do you do in high school?", options: ["Forget everything", "Meet new people and learn", "Play all day", "Just eat"], correct: "Meet new people and learn", explanation_es: "Conocer gente y aprender." }
        ],
        vocabLearned: [
            { word: "Challenging", meaning_es: "Desafiante", example_en: "Math is challenging." },
            { word: "Exciting", meaning_es: "Emocionante", example_en: "The game was exciting." },
            { word: "Manage", meaning_es: "Manejar/Administrar", example_en: "Manage your time." },
            { word: "Hang out", meaning_es: "Pasar el rato", example_en: "I hang out with friends." }
        ],
        coachTip: "Recuerda que 'Exciting' es para cosas emocionantes y 'Excited' es como te sientes tú (emocionado)."
    },
    {
        id: 's3',
        topic: 'Sports',
        difficulty: 2,
        text: "Playing a sport keeps you healthy and active. Whether you like soccer, basketball, or swimming, moving your body is important. Being part of a team teaches you how to cooperate with others. Remember to always drink water after a match.",
        questions: [
            { q: "What does playing a sport do?", options: ["Makes you lazy", "Keeps you healthy", "Makes you sad", "None"], correct: "Keeps you healthy", explanation_es: "Te mantiene saludable." },
            { q: "What teaches you cooperation?", options: ["Sleeping", "Being part of a team", "Eating", "Watching TV"], correct: "Being part of a team", explanation_es: "Ser parte de un equipo te enseña a cooperar." },
            { q: "What is important?", options: ["Moving your body", "Never moving", "Eating sugar", "Playing games"], correct: "Moving your body", explanation_es: "Mover tu cuerpo es importante." },
            { q: "What sports are mentioned?", options: ["Soccer, basketball, swimming", "Tennis", "Golf", "Baseball"], correct: "Soccer, basketball, swimming", explanation_es: "Fútbol, baloncesto, natación." },
            { q: "What should you do after a match?", options: ["Drink soda", "Drink water", "Cry", "Sleep forever"], correct: "Drink water", explanation_es: "Beber agua." }
        ],
        vocabLearned: [
            { word: "Healthy", meaning_es: "Saludable", example_en: "Eat healthy food." },
            { word: "Cooperate", meaning_es: "Cooperar", example_en: "We must cooperate." },
            { word: "Match", meaning_es: "Partido", example_en: "We won the match." }
        ],
        coachTip: "En deportes usamos 'play' para deportes de pelota (play soccer) pero 'go' para actividades con -ing (go swimming)."
    },
    {
        id: 's4',
        topic: 'Tech & Gadgets',
        difficulty: 3,
        text: "Smartphones have changed the way we communicate. Instead of calling, many people prefer sending text messages or voice notes. Social media apps keep us connected, but they can also be overwhelming. It is a good idea to limit your screen time.",
        questions: [
            { q: "What changed how we communicate?", options: ["Books", "Smartphones", "Pencils", "Cars"], correct: "Smartphones", explanation_es: "Los teléfonos inteligentes." },
            { q: "What do people prefer to do instead of calling?", options: ["Send text messages", "Write letters", "Shout", "Ignore"], correct: "Send text messages", explanation_es: "Enviar mensajes de texto." },
            { q: "What can social media apps be?", options: ["Perfect", "Overwhelming", "Always great", "Boring"], correct: "Overwhelming", explanation_es: "Abrumadoras." },
            { q: "What is a good idea?", options: ["Never sleep", "Limit screen time", "Throw the phone", "Call everyone"], correct: "Limit screen time", explanation_es: "Limitar el tiempo de pantalla." },
            { q: "Do social media apps keep us connected?", options: ["Yes", "No", "Maybe", "Only sometimes"], correct: "Yes", explanation_es: "Sí, nos mantienen conectados." }
        ],
        vocabLearned: [
            { word: "Instead", meaning_es: "En lugar de", example_en: "I want tea instead." },
            { word: "Overwhelming", meaning_es: "Abrumador", example_en: "The noise was overwhelming." },
            { word: "Screen time", meaning_es: "Tiempo de pantalla", example_en: "Limit your screen time." }
        ],
        coachTip: "Cuidado con 'Actually', no significa actualmente, significa 'en realidad'. 'Currently' es actualmente."
    },
    {
        id: 's5',
        topic: 'Friends and Social',
        difficulty: 1,
        text: "Having a good friend is wonderful. A true friend listens to you when you are sad. You can share your secrets and laugh together. To keep a friendship strong, you should be honest and supportive. Friends make bad days better.",
        questions: [
            { q: "What is wonderful?", options: ["Being alone", "Having a good friend", "Eating", "Sleeping"], correct: "Having a good friend", explanation_es: "Tener un buen amigo." },
            { q: "What does a true friend do when you are sad?", options: ["Listens to you", "Laughs", "Runs away", "Yells"], correct: "Listens to you", explanation_es: "Te escucha." },
            { q: "What can you share with a friend?", options: ["Secrets", "Nothing", "Just food", "Money"], correct: "Secrets", explanation_es: "Secretos." },
            { q: "How do you keep a friendship strong?", options: ["Be honest and supportive", "Lie", "Be mean", "Never talk"], correct: "Be honest and supportive", explanation_es: "Sé honesto y apoya." },
            { q: "What do friends do to bad days?", options: ["Make them worse", "Make them better", "Nothing", "Make them longer"], correct: "Make them better", explanation_es: "Los hacen mejores." }
        ],
        vocabLearned: [
            { word: "Wonderful", meaning_es: "Maravilloso", example_en: "It is a wonderful day." },
            { word: "Share", meaning_es: "Compartir", example_en: "Share your toys." },
            { word: "Supportive", meaning_es: "Que apoya/Solidario", example_en: "My friend is supportive." }
        ],
        coachTip: "Acuérdate: 'Fun' es divertido, 'Funny' es gracioso (te hace reír)."
    },
    {
        id: 's6',
        topic: 'Travel',
        difficulty: 3,
        text: "Traveling abroad opens your mind to new cultures and languages. Trying local food is an amazing part of any trip. You might get lost because you don't know the streets, but that can lead to an unexpected adventure. Packing light makes the journey much easier.",
        questions: [
            { q: "What does traveling abroad do?", options: ["Closes doors", "Opens your mind", "Makes you tired", "Costs nothing"], correct: "Opens your mind", explanation_es: "Abre tu mente." },
            { q: "What is an amazing part of a trip?", options: ["Waiting", "Trying local food", "Losing bags", "Crying"], correct: "Trying local food", explanation_es: "Probar comida local." },
            { q: "Why might you get lost?", options: ["You are blind", "You don't know the streets", "You have no map", "It is dark"], correct: "You don't know the streets", explanation_es: "No conoces las calles." },
            { q: "What can getting lost lead to?", options: ["An unexpected adventure", "Danger", "Anger", "Boredom"], correct: "An unexpected adventure", explanation_es: "Una aventura inesperada." },
            { q: "What makes the journey easier?", options: ["Packing heavy", "Packing light", "No bags", "Many bags"], correct: "Packing light", explanation_es: "Empacar ligero." }
        ],
        vocabLearned: [
            { word: "Abroad", meaning_es: "En el extranjero", example_en: "I want to study abroad." },
            { word: "Journey", meaning_es: "Viaje/Trayecto", example_en: "Enjoy the journey." },
            { word: "Unexpected", meaning_es: "Inesperado", example_en: "An unexpected surprise." }
        ],
        coachTip: "Decimos 'travel' como verbo general (I like to travel) y 'trip' como sustantivo para viajes cortos (I took a trip)."
    },
    {
        id: 's7',
        topic: 'Music Festivals',
        difficulty: 4,
        text: "Attending a music festival is a thrilling experience for many youths. The energy of the crowd and the live performances create unforgettable memories. However, the tickets are often expensive and the weather can be unpredictable. Remember to wear comfortable shoes because you will be standing for hours.",
        questions: [
            { q: "What kind of experience is a festival?", options: ["Boring", "Thrilling", "Quiet", "Sad"], correct: "Thrilling", explanation_es: "Emocionante/Apasionante." },
            { q: "What creates unforgettable memories?", options: ["The energy and live performances", "The tickets", "The weather", "The food"], correct: "The energy and live performances", explanation_es: "La energía y las actuaciones." },
            { q: "What is often expensive?", options: ["Water", "Tickets", "Shoes", "Food"], correct: "Tickets", explanation_es: "Las entradas o boletos." },
            { q: "Why wear comfortable shoes?", options: ["Because it looks good", "You will be standing for hours", "To run fast", "To jump"], correct: "You will be standing for hours", explanation_es: "Estarás de pie por horas." },
            { q: "How can the weather be?", options: ["Always sunny", "Unpredictable", "Always raining", "Cold"], correct: "Unpredictable", explanation_es: "Impredecible." }
        ],
        vocabLearned: [
            { word: "Thrilling", meaning_es: "Apasionante/Emocionante", example_en: "A thrilling ride." },
            { word: "Unforgettable", meaning_es: "Inolvidable", example_en: "An unforgettable night." },
            { word: "Unpredictable", meaning_es: "Impredecible", example_en: "Unpredictable weather." }
        ],
        coachTip: "La palabra 'Crowd' (multitud) suele usarse en singular, aunque hable de mucha gente: The crowd is crazy."
    },
    {
        id: 's8',
        topic: 'Future Careers',
        difficulty: 4,
        text: "Choosing a career path is a significant decision. Some students want to become software engineers, while others prefer the arts or healthcare. It is essential to choose something you are passionate about, but also consider job availability. Seeking advice from a mentor can provide useful guidance.",
        questions: [
            { q: "What is a significant decision?", options: ["What to eat", "Choosing a career path", "Buying a phone", "Sleeping"], correct: "Choosing a career path", explanation_es: "Elegir un camino profesional." },
            { q: "What fields are mentioned?", options: ["Farming", "Software, arts, healthcare", "Cooking", "Driving"], correct: "Software, arts, healthcare", explanation_es: "Ingeniería de software, artes y salud." },
            { q: "What is essential to choose?", options: ["Something boring", "Something you are passionate about", "Something easy", "Something expensive"], correct: "Something you are passionate about", explanation_es: "Algo que te apasione." },
            { q: "What else should you consider?", options: ["Only money", "Job availability", "Colors", "Nothing"], correct: "Job availability", explanation_es: "La disponibilidad de empleos." },
            { q: "Who can provide useful guidance?", options: ["A mentor", "A pet", "A baby", "A stranger"], correct: "A mentor", explanation_es: "Un mentor u orientador." }
        ],
        vocabLearned: [
            { word: "Career", meaning_es: "Carrera profesional", example_en: "A career in IT." },
            { word: "Healthcare", meaning_es: "Atención médica/Salud", example_en: "She works in healthcare." },
            { word: "Guidance", meaning_es: "Orientación/Guía", example_en: "I need your guidance." }
        ],
        coachTip: "'Career' no es tu carrera en la universidad (eso es degree), es toda tu vida laboral."
    },
    {
        id: 's9',
        topic: 'Environment',
        difficulty: 5,
        text: "Environmental awareness is crucial for the survival of our planet. Recycling plastic and reducing waste are small steps that make a huge impact. Many young activists are advocating for renewable energy sources. To protect endangered species, we must preserve their natural habitats.",
        questions: [
            { q: "What is crucial for the planet?", options: ["Money", "Environmental awareness", "Cars", "Factories"], correct: "Environmental awareness", explanation_es: "Conciencia ambiental." },
            { q: "What are small steps that make a huge impact?", options: ["Recycling and reducing waste", "Littering", "Burning plastic", "Buying more"], correct: "Recycling and reducing waste", explanation_es: "Reciclar y reducir desperdicios." },
            { q: "What are activists advocating for?", options: ["Fossil fuels", "Renewable energy", "More plastic", "Less water"], correct: "Renewable energy", explanation_es: "Energía renovable." },
            { q: "To protect endangered species, we must preserve...", options: ["Zoos", "Natural habitats", "Cities", "Cages"], correct: "Natural habitats", explanation_es: "Sus hábitats naturales." },
            { q: "Are only old people activists?", options: ["Yes", "No, many young activists exist", "Text doesn't say", "Maybe"], correct: "No, many young activists exist", explanation_es: "Muchos activistas jóvenes." }
        ],
        vocabLearned: [
            { word: "Awareness", meaning_es: "Conciencia", example_en: "Raise awareness." },
            { word: "Advocating", meaning_es: "Abogando/Defendiendo", example_en: "Advocating for rights." },
            { word: "Endangered", meaning_es: "En peligro de extinción", example_en: "Endangered animals." }
        ],
        coachTip: "'Waste' significa desperdicio o basura, pero como verbo significa malgastar: Don't waste time."
    },
    {
        id: 's10',
        topic: 'Mental Health',
        difficulty: 5,
        text: "Mental health is just as important as physical health. Feeling anxious or stressed is normal, especially during exams. Talking to a professional or a trusted adult can relieve some of the burden. Practicing mindfulness and maintaining a balanced diet also contribute to overall well-being.",
        questions: [
            { q: "Mental health is just as important as...", options: ["Physical health", "Money", "Grades", "Games"], correct: "Physical health", explanation_es: "Salud física." },
            { q: "When is feeling anxious normal?", options: ["Never", "During exams", "Always", "When eating"], correct: "During exams", explanation_es: "Durante los exámenes." },
            { q: "Who can you talk to?", options: ["A wall", "Professional or trusted adult", "A tree", "Strangers"], correct: "Professional or trusted adult", explanation_es: "Profesional o adulto de confianza." },
            { q: "What can relieve the burden?", options: ["Talking", "Shouting", "Hiding", "Ignoring"], correct: "Talking", explanation_es: "Hablar." },
            { q: "What else contributes to well-being?", options: ["Mindfulness and balanced diet", "Eating junk food", "Not sleeping", "Worrying"], correct: "Mindfulness and balanced diet", explanation_es: "Atención plena y dieta equilibrada." }
        ],
        vocabLearned: [
            { word: "Anxious", meaning_es: "Ansioso", example_en: "I feel anxious." },
            { word: "Burden", meaning_es: "Carga/Peso", example_en: "A heavy burden." },
            { word: "Well-being", meaning_es: "Bienestar", example_en: "Overall well-being." },
            { word: "Mindfulness", meaning_es: "Atención plena", example_en: "Practice mindfulness." }
        ],
        coachTip: "'Anxious' se pronuncia Ank-shus, no digas anx-i-ous con todas las letras."
    },
    {
        id: 'math1',
        areaId: 'math',
        topic: 'Algebra Básica',
        difficulty: 1,
        text: "Vamos a resolver una ecuación lineal sencilla paso a paso. Recuerda despejar la X moviendo los términos al otro lado con la operación contraria.",
        questions: [
            {
                id: "mq1",
                type: "math_steps",
                prompt_en: "Solve for x",
                prompt_es: "Resuelve para x",
                problem: "3x + 5 = 14",
                expectedAnswer: "3",
                stepHints_es: ["Primero, resta 5 a ambos lados", "Luego, divide entre 3"],
                tags: ["algebra"],
                why_it_matters_es: "El álgebra permite encontrar valores desconocidos usando pistas.",
                real_world_application_es: "Calcular cuánto dinero falta para comprar algo si ya tienes una parte ahorrada.",
                future_value_es: "Base esencial para programación, física y finanzas avanzadas.",
                mental_skill_built_es: "Pensamiento abstracto y resolución de incognitas secuencial.",
                tier: 1,
                domain: "school"
            }
        ],
        vocabLearned: [],
        coachTip: "En álgebra, lo que haces de un lado de la igualdad, debes hacerlo del otro."
    },
    {
        id: 'math2',
        areaId: 'math',
        topic: 'Fracciones',
        difficulty: 2,
        text: "Simplificar fracciones significa dividirlas hasta que no se puedan hacer más pequeñas.",
        questions: [
            {
                id: "mq2",
                type: "math_steps",
                prompt_en: "Simplify the fraction",
                prompt_es: "Simplifica la fracción",
                problem: "12 / 18",
                expectedAnswer: "2/3",
                stepHints_es: ["Encuentra un divisor común para 12 y 18", "Prueba dividiendo entre 6"],
                tags: ["fractions"],
                why_it_matters_es: "Las proporciones se usan en cocina, construcción y descuentos.",
                real_world_application_es: "Ajustar una receta de comida para menos personas o entender un descuento del 66%.",
                future_value_es: "Imprescindible para probabilidad y estadística de datos corporativos.",
                mental_skill_built_es: "Identificar relaciones de escala profunda.",
                tier: 1,
                domain: "life"
            }
        ],
        vocabLearned: [],
        coachTip: "Siempre busca el máximo común divisor para simplificar más rápido."
    },
    {
        id: 'math3',
        areaId: 'math',
        topic: 'Problemas de Palabras',
        difficulty: 1,
        text: "A veces las matemáticas vienen escondidas en texto. Lee atentamente.",
        questions: [
            {
                id: "mq3",
                type: "math_steps",
                prompt_en: "Word problem",
                prompt_es: "Problema escrito",
                problem: "Si 3 boletos cuestan 150, ¿cuánto cuesta 1 boleto?",
                expectedAnswer: "50",
                stepHints_es: ["Divide el costo total entre la cantidad de boletos"],
                tags: ["word_problem"],
                why_it_matters_es: "Evita que te estafen al comprar en volumen.",
                real_world_application_es: "Saber exactamente si el paquete 'familiar' es realmente más barato que el individual.",
                future_value_es: "Análisis de precios unitarios y rentabilidad en negocios.",
                mental_skill_built_es: "Lógica de distribución equitativa.",
                tier: 1,
                domain: "money"
            }
        ],
        vocabLearned: [],
        coachTip: "Una regla de tres simple te ayuda a resolver la mayoría de estos problemas."
    }
,
    {
        id: 'math_t1_01',
        areaId: 'math',
        topic: 'Suscripción de juegos',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_1",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 1: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "school"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_02',
        areaId: 'math',
        topic: 'Ahorros mensuales',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_2",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 2: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "games"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_03',
        areaId: 'math',
        topic: 'Snacks compartidos',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_3",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 3: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "life"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_04',
        areaId: 'math',
        topic: 'Tiempo de pantalla',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_4",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 4: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "coding"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_05',
        areaId: 'math',
        topic: 'Calculando daño',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_5",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 5: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "money"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_06',
        areaId: 'math',
        topic: 'Monedas de juego',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_6",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 6: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "school"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_07',
        areaId: 'math',
        topic: 'Descuento tienda',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_7",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 7: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "games"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_08',
        areaId: 'math',
        topic: 'Coleccionables',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_8",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 8: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "life"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_09',
        areaId: 'math',
        topic: 'Puntos exp.',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_9",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 9: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "coding"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_10',
        areaId: 'math',
        topic: 'Ingresos extra',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_10",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 10: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "money"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_11',
        areaId: 'math',
        topic: 'Precio unitario',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_11",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 11: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "school"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_12',
        areaId: 'math',
        topic: 'Repartición eq.',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_12",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 12: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "games"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_13',
        areaId: 'math',
        topic: 'Velocidad de red',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_13",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 13: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "life"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_14',
        areaId: 'math',
        topic: 'Almacenamiento',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_14",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 14: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "coding"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_15',
        areaId: 'math',
        topic: 'Distancia mapa',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_15",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 15: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "money"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_16',
        areaId: 'math',
        topic: 'Combustible nave',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_16",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 16: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "school"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_17',
        areaId: 'math',
        topic: 'Gasto hormiga',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_17",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 17: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "games"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_18',
        areaId: 'math',
        topic: 'Ahorro meta',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_18",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 18: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "life"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_19',
        areaId: 'math',
        topic: 'Pago grupal',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_19",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 19: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "coding"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    },
    {
        id: 'math_t1_20',
        areaId: 'math',
        topic: 'Comida rápida',
        difficulty: 1,
        text: "Situación real: Tienes que tomar una decisión basada en los números reales de esta situación.",
        questions: [
            {
                id: "mq_t1_20",
                type: "math_steps",
                prompt_en: "Calculate the value",
                prompt_es: "Calcula el resultado",
                problem: "Problema de demostración 20: calcular la proporción o el costo total en base a 5 unidades a $12 cada una.",
                expectedAnswer: "60",
                stepHints_es: ["Multiplica las unidades por el costo"],
                tags: ["arithmetic", "word_problem"],
                why_it_matters_es: "Comprender gastos te da control de tu dinero.",
                real_world_application_es: "Decidir si te alcanza para pagar estas unidades hoy.",
                future_value_es: "Fundamental para la administración financiera adulta.",
                mental_skill_built_es: "Precisión aritmética.",
                tier: 1,
                domain: "money"
            }
        ],
        vocabLearned: [],
        coachTip: "Asegúrate de alinear las unidades al multiplicar."
    }
];
