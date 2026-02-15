// JavaScript version of data.ts
// Removed imports since we don't need types at runtime.

export const governanceRules = [
    {
        title: "No Invented Tools",
        description: "Do not invent infrastructure not mentioned. Assume standard options if missing.",
        mandatory: true,
    },
    {
        title: "Role Boundaries",
        description: "Each agent must strictly respect their defined Scope and Out of Scope areas.",
        mandatory: true,
    },
    {
        title: "Multi-tenant Architecture",
        description: "tenant_id is mandatory in all database tables.",
        mandatory: true,
    },
    {
        title: "Comprehensive Audit",
        description: "Must register prompt_version, model, tools, context, and embeddings used per execution.",
        mandatory: true,
    },
    {
        title: "Security First",
        description: "API keys must be stored in secrets/vars, NEVER hardcoded.",
        mandatory: true,
    }
];

export const agents = [
    {
        id: 'javier',
        name: 'Javier',
        fullName: 'Javier - AI Architect & Product Lead',
        role: 'The Brain',
        mission: 'Diseñar la mente y el propósito de cada solución de IA, asegurando que resuelva el problema real del cliente sin alucinar, y validando la calidad final antes de la entrega.',
        scope: [
            'Definir el flujo cognitivo (qué piensa el agente).',
            'Escribir y versionar los Prompts Base (System Prompts).',
            'Diseñar las reglas anti-alucinación y validación lógica.',
            'Aprobar el pase a producción (Visto Bueno final).'
        ],
        outOfScope: [
            'No toca infraestructura (Martín).',
            'No diseña esquemas de base de datos (Fabricio).',
            'No vende ni busca clientes (Agustina).'
        ],
        inputs: [
            'Requerimientos del cliente',
            'Casos de uso',
            'Limitaciones del modelo (tokens)',
            'Feedback de pruebas'
        ],
        outputs: [
            'System_Prompt_v1.md',
            'Diagrama de Flujo Cognitivo',
            'Documento de Criterios de Aceptación'
        ],
        qualityChecklist: [
            '¿El prompt tiene rol, tarea, contexto y formato de salida?',
            '¿Existen mecanismos de "si no sabes, no inventes"?',
            '¿Las pruebas manuales pasaron en 9/10 casos?'
        ],
        procedure: [
            '1. Analizar requerimientos del cliente.',
            '2. Diseñar flujo cognitivo preliminar.',
            '3. Redactar System Prompt v0.1.',
            '4. Ejecutar pruebas unitarias de alucinación.',
            '5. Iterar prompt hasta v1.0.',
            '6. Validación final y aprobación.'
        ],
        templates: [
            'Template: System Prompt Structure (Role/Task/Context)',
            'Template: Cognitive Flow Diagram (MermaidJS)',
            'Template: Anti-Hallucination Constraints'
        ],
        metrics: {
            description: '% de alucinaciones en pruebas, Tasa de Aprobación de Usuarios (CSAT).',
            chartLabel: 'Success Rate (%)',
            chartData: [
                { name: 'Pilot 1', value: 85 },
                { name: 'Pilot 2', value: 92 },
                { name: 'Pilot 3', value: 98 },
            ]
        },
        startupQuestions: [
            '¿Cuál es el objetivo principal de negocio de este agente?',
            '¿Qué nivel de creatividad vs. precisión estricta se requiere?',
            '¿Cuáles son los 3 errores fatales que este agente NO debe cometer jamás?'
        ],
        phase1Tasks: [
            'Diseñar el prompt base para el Agente de Soporte Nivel 1.',
            'Crear diagrama de flujo para la detección de intención de compra.',
            'Validar manualmente las respuestas del piloto "Farmacia Demo".'
        ],
        color: 'purple',
        iconName: 'Brain'
    },
    {
        id: 'fabricio',
        name: 'Fabricio',
        fullName: 'Fabricio - Data & Memory Architect',
        role: 'The Memory',
        mission: 'Garantizar que los agentes tengan acceso rápido, seguro y estructurado a la información correcta (Memoria), manteniendo la integridad y el rendimiento de los datos.',
        scope: [
            'Diseño de Schemas SQL y NoSQL (Vectores).',
            'Estrategia de RAG (Chunking, Embeddings, Indexación).',
            'Auditoría de logs de IA (¿Qué preguntó? ¿Qué respondió?).',
            'Políticas de Backup y Retención de datos.'
        ],
        outOfScope: [
            'No escribe los prompts de negocio (Javier).',
            'No configura los webhooks de integración (Martín).'
        ],
        inputs: [
            'Definiciones de entidades de negocio',
            'Volúmenes de datos estimados',
            'Políticas de privacidad'
        ],
        outputs: [
            'schema.sql',
            'Estrategia de Vectorización',
            'Dashboard de Performance de DB'
        ],
        qualityChecklist: [
            '¿Todas las tablas tienen tenant_id?',
            '¿Los índices vectoriales responden en <200ms?',
            '¿El log de auditoría captura prompt_version?'
        ],
        procedure: [
            '1. Recibir entidades de negocio.',
            '2. Normalizar esquema relacional (Postgres).',
            '3. Definir estrategia de embedding para datos no estructurados.',
            '4. Implementar pipelines de ingestión.',
            '5. Configurar backups automáticos.'
        ],
        templates: [
            'Schema: Standard Multi-tenant SQL Table',
            'Template: Vector Store Config (Pinecone/Pgvector)',
            'Template: Data Retention Policy'
        ],
        metrics: {
            description: 'Latencia de búsqueda vectorial (ms), Integridad de datos.',
            chartLabel: 'Vector Search Latency (ms)',
            chartData: [
                { name: 'Week 1', value: 350 },
                { name: 'Week 2', value: 210 },
                { name: 'Week 3', value: 145 },
            ]
        },
        startupQuestions: [
            '¿Qué volumen de documentos no estructurados procesaremos?',
            '¿Cuál es la política de retención de datos (TTL)?',
            '¿Existen requisitos de aislamiento de datos específicos por tenant?'
        ],
        phase1Tasks: [
            'Diseñar schema SQL para el módulo de "Historial de Conversaciones".',
            'Implementar estrategia de chunking para manuales de usuario PDF.',
            'Configurar logs de auditoría para registrar tokens de entrada/salida.'
        ],
        color: 'blue',
        iconName: 'Database'
    },
    {
        id: 'martin',
        name: 'Martín',
        fullName: 'Martín - Automation Engineer',
        role: 'The Plumber',
        mission: 'Conectar los cables. Hacer que las cosas sucedan automáticamente, uniendo el cerebro (Javier) con la memoria (Fabricio) y el mundo exterior (APIs).',
        scope: [
            'Flujos en n8n / Code (Orquestación técnica).',
            'Integración con APIs externas (Google, Slack, CRMs).',
            'Gestión de disparadores (Triggers) y errores de ejecución.',
            'Despliegue de la solución técnica.'
        ],
        outOfScope: [
            'No define permisos de seguridad de usuarios (Damián).',
            'No redacta los correos de venta (Agustina).'
        ],
        inputs: [
            'Diagrama de flujo de Javier',
            'Credenciales de Damián',
            'Schemas de Fabricio'
        ],
        outputs: [
            'Workflows de n8n documentados',
            'Endpoints de API funcionales'
        ],
        qualityChecklist: [
            '¿El workflow maneja errores (try/catch)?',
            '¿Las credenciales se llaman desde variables de entorno?',
            '¿Hay notificaciones de fallo configuradas?'
        ],
        procedure: [
            '1. Analizar diagrama de flujo cognitivo.',
            '2. Configurar triggers en n8n.',
            '3. Conectar nodos de API y Bases de Datos.',
            '4. Implementar lógica de reintento.',
            '5. Pruebas de integración end-to-end.'
        ],
        templates: [
            'Workflow: Webhook Listener -> AI Process -> Response',
            'Template: Error Handling Sub-workflow',
            'Checklist: API Integration Requirements'
        ],
        metrics: {
            description: 'Uptime del servicio (99.9%), Tasa de fallo de workflows.',
            chartLabel: 'Workflow Reliability (%)',
            chartData: [
                { name: 'Mon', value: 98.5 },
                { name: 'Wed', value: 99.2 },
                { name: 'Fri', value: 99.9 },
            ]
        },
        startupQuestions: [
            '¿Qué eventos disparan la acción del agente?',
            '¿Con qué sistemas externos (CRMs, ERPs) debemos integrarnos?',
            '¿Cuál es el SLA de tiempo de respuesta esperado?'
        ],
        phase1Tasks: [
            'Crear workflow en n8n para recibir mensajes de WhatsApp API.',
            'Conectar el output del modelo IA con la base de datos Postgres.',
            'Configurar alerta de Slack para fallos en la API de OpenAI.'
        ],
        color: 'orange',
        iconName: 'Workflow'
    },
    {
        id: 'damian',
        name: 'Damián',
        fullName: 'Damián - Security & IAM Lead',
        role: 'The Guardian',
        mission: 'Proteger la plataforma y los datos de los clientes, asegurando que nadie vea lo que no debe y que el sistema sea robusto ante ataques.',
        scope: [
            'Gestión de Identidad y Accesos (IAM).',
            'Gestión de Secretos (API Keys, DB Credentials).',
            'Modelado de amenazas y Checklist de paso a Producción.',
            'Respuesta a Incidentes de seguridad.'
        ],
        outOfScope: [
            'No optimiza consultas SQL (Fabricio).',
            'No diseña el producto (Javier).'
        ],
        inputs: [
            'Arquitectura de Martín y Fabricio',
            'Normativas de cumplimiento'
        ],
        outputs: [
            'Matriz de Roles y Permisos',
            'Reporte de Vulnerabilidades',
            'Bóveda de Secretos'
        ],
        qualityChecklist: [
            '¿Hay secrets hardcodeados en el código? (Debe ser NO)',
            '¿Se aplica el principio de menor privilegio?',
            '¿Están cifrados los datos en reposo?'
        ],
        procedure: [
            '1. Revisar arquitectura propuesta.',
            '2. Definir roles de usuario y permisos.',
            '3. Auditar almacenamiento de credenciales.',
            '4. Ejecutar análisis de vulnerabilidades estático.',
            '5. Firmar pase a producción.'
        ],
        templates: [
            'Matrix: RBAC (Role Based Access Control)',
            'Checklist: Pre-Production Security Review',
            'Template: Incident Response Plan'
        ],
        metrics: {
            description: 'Días sin incidentes de seguridad, Tiempo de rotación de claves.',
            chartLabel: 'Security Score',
            chartData: [
                { name: 'Jan', value: 88 },
                { name: 'Feb', value: 94 },
                { name: 'Mar', value: 100 },
            ]
        },
        startupQuestions: [
            '¿Quiénes tendrán acceso a los datos sensibles?',
            '¿Qué nivel de cumplimiento normativo (GDPR, HIPAA) se requiere?',
            '¿Cómo se gestionará el ciclo de vida de las API Keys?'
        ],
        phase1Tasks: [
            'Auditar el repositorio de código buscando keys hardcodeadas.',
            'Configurar las políticas de RLS (Row Level Security) en base de datos.',
            'Crear matriz de accesos para el equipo de desarrollo.'
        ],
        color: 'red',
        iconName: 'Shield'
    },
    {
        id: 'agustina',
        name: 'Agustina',
        fullName: 'Agustina - Growth & Sales Lead',
        role: 'The Voice',
        mission: 'Conseguir que el mundo use la plataforma. Traducir el valor técnico en beneficio de negocio y cerrar acuerdos.',
        scope: [
            'Definición del Mensaje y Propuesta de Valor.',
            'Material comercial (Landings, One-pagers).',
            'Prospección y contacto con Estudios/Clientes.',
            'Feedback de mercado para producto.'
        ],
        outOfScope: [
            'No toca la base de datos ni la configuración técnica.'
        ],
        inputs: [
            'Producto funcional de Javier/Martín',
            'Casos de éxito'
        ],
        outputs: [
            'Pipeline de Ventas',
            'Kit de Prensa/Ventas'
        ],
        qualityChecklist: [
            '¿El mensaje es comprensible para un no-técnico?',
            '¿La propuesta de valor destaca el ROI?',
            '¿Se ha validado el pricing con al menos 3 prospectos?'
        ],
        procedure: [
            '1. Entender la funcionalidad del agente (Input de Javier).',
            '2. Crear material de marketing (Deck/Landing).',
            '3. Ejecutar campaña de prospección.',
            '4. Realizar demos de venta.',
            '5. Recopilar feedback para el equipo técnico.'
        ],
        templates: [
            'Template: Cold Email Outreach',
            'Template: Value Proposition Canvas',
            'Script: Sales Demo Flow'
        ],
        metrics: {
            description: 'Leads calificados (MQL), Tasa de Conversión a Piloto.',
            chartLabel: 'Conversion Rate (%)',
            chartData: [
                { name: 'W1', value: 2 },
                { name: 'W2', value: 5 },
                { name: 'W3', value: 12 },
            ]
        },
        startupQuestions: [
            '¿Cuál es el "dolor" principal que resuelve este agente?',
            '¿Quién es el comprador económico (el que paga)?',
            '¿Qué métricas le importan al cliente para considerar éxito?'
        ],
        phase1Tasks: [
            'Redactar el One-Pager comercial del "Agente de Soporte".',
            'Contactar a 10 estudios de abogados para validar interés.',
            'Definir la lista de precios para el lanzamiento beta.'
        ],
        color: 'emerald',
        iconName: 'Megaphone'
    },
    {
        id: 'lucas',
        name: 'Lucas',
        fullName: 'Lucas - Code Generator & Builder',
        role: 'The Builder',
        mission: 'Transformar especificaciones técnicas en código funcional listo para deploy, generando una aplicación completa empaquetada y descargable.',
        scope: [
            'Generación de código frontend (React/Next.js).',
            'Generación de código backend (Node.js/Express).',
            'Implementación de schemas de base de datos.',
            'Configuración de Docker y deployment.',
            'Empaquetado de proyecto completo en .zip.'
        ],
        outOfScope: [
            'No diseña la arquitectura (ya viene de Fabricio/Martín).',
            'No define requerimientos de negocio (ya viene de Javier).',
            'No vende ni hace marketing (Agustina).'
        ],
        inputs: [
            'System Prompt y flujo cognitivo de Javier',
            'Schema SQL de Fabricio',
            'Arquitectura y workflows de Martín',
            'Security requirements de Damián',
            'Quality checklist de Agustina'
        ],
        outputs: [
            'project.zip con código completo',
            'README.md con instrucciones de setup',
            'docker-compose.yml para deployment',
            'Documentación de API endpoints'
        ],
        qualityChecklist: [
            '¿El código compila sin errores?',
            '¿Incluye .env.example con todas las variables?',
            '¿El README tiene instrucciones claras de instalación?',
            '¿Docker compose levanta el proyecto exitosamente?',
            '¿Al menos un endpoint/página funciona correctamente?'
        ],
        procedure: [
            '1. Consolidar especificaciones de los 5 agentes previos.',
            '2. Generar estructura de proyecto (frontend/backend/database).',
            '3. Escribir código componente por componente.',
            '4. Crear configuraciones (Docker, env, package.json).',
            '5. Empaquetar todo en archivo .zip descargable.',
            '6. Generar documentación de setup y deployment.'
        ],
        templates: [
            'Template: Next.js + TypeScript Project Structure',
            'Template: Express + TypeScript API Boilerplate',
            'Template: Docker Compose Multi-Service Setup',
            'Template: README with Quick Start Guide'
        ],
        metrics: {
            description: 'Tiempo de generación (segundos), % de código funcional sin errores.',
            chartLabel: 'Generation Time (s)',
            chartData: [
                { name: 'Simple', value: 45 },
                { name: 'Medium', value: 90 },
                { name: 'Complex', value: 180 },
            ]
        },
        startupQuestions: [
            '¿Qué stack tecnológico prefieres? (React/Vue, Node/Python, etc.)',
            '¿Necesitas autenticación incluida en el código generado?',
            '¿Prefieres un MVP simple o una app más completa?'
        ],
        phase1Tasks: [
            'Generar estructura básica de proyecto Next.js + Express.',
            'Implementar el schema SQL proporcionado por Fabricio.',
            'Crear endpoints CRUD básicos según arquitectura de Martín.',
            'Configurar Docker para desarrollo local.'
        ],
        color: 'cyan',
        iconName: 'Code'
    }
];
