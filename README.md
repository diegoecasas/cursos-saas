# Cursos SaaS

Plataforma minimalista para publicar cursos cortos, con evidencia detrás de cada
decisión.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **Node.js 24**
- **Anthropic Claude Haiku 4.5** para el docente digital de cada curso
- Hosting: **Vercel** (auto-deploy en cada push a `main`)

## Estructura

```
app/
├── page.tsx                                    # landing
├── cursos/
│   ├── page.tsx                                # catálogo
│   └── [slug]/
│       ├── page.tsx                            # detalle del curso
│       ├── lecciones/[num]/page.tsx            # visor de lección (iframe)
│       ├── chat/page.tsx                       # docente digital
│       └── seguimiento/page.tsx                # diario del alumno
├── api/chat/[slug]/route.ts                    # stream de Claude Haiku 4.5
├── components/{Header,Footer}.tsx
└── globals.css

content/courses.ts                              # metadatos + índice de cursos
public/course-content/<slug>/                   # HTML autocontenido de las lecciones
lib/
├── courseContext.ts                            # extrae texto plano del HTML
├── systemPrompt.ts                             # prompt hardened con guardrails
└── journal.ts                                  # helpers de seguimiento (client)
```

Cada lección es un HTML **autocontenido** con CSP estricta, servido tal cual
desde `public/course-content/`. El shell SaaS lo enmarca en un `<iframe>` con las
mismas garantías de aislamiento.

## Desarrollo

```bash
npm install
cp .env.example .env.local          # y pegá tu ANTHROPIC_API_KEY
npm run dev                         # http://localhost:3000
```

## Despliegue

Push a `main` → Vercel construye y publica en producción.
Variables de entorno: `ANTHROPIC_API_KEY` (Sensitive, en Production/Preview/Development).

## Añadir un curso

1. Copiá el contenido HTML a `public/course-content/<slug>/lessons/` y `assets/`.
2. Añadí una entrada al array `courses` en `content/courses.ts`.
3. `npm run dev` para verificar en local.
4. `git push`. Vercel se encarga del resto.
