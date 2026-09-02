# Cursos SaaS

Plataforma minimalista para publicar cursos cortos, con evidencia detrás de cada
decisión. Desplegable a Vercel y Fly.io desde la misma base de código.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **Node.js 24**

## Estructura

```
app/
├── page.tsx                                    # landing
├── cursos/
│   ├── page.tsx                                # catálogo
│   └── [slug]/
│       ├── page.tsx                            # detalle del curso
│       └── lecciones/[num]/page.tsx            # visor (iframe)
├── components/{Header,Footer}.tsx
└── globals.css

content/courses.ts                              # metadatos + índice de cursos
public/course-content/<slug>/                   # HTML autocontenido de las lecciones
```

Cada lección es un HTML **autocontenido** con CSP estricta, servido tal cual desde
`public/course-content/`. El shell SaaS lo enmarca en un `<iframe>` con las mismas
garantías de aislamiento.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:3000
```

## Despliegue

### Vercel

```bash
vercel                # primer deploy (preview)
vercel --prod         # promover a producción
```

### Fly.io

```bash
flyctl launch --no-deploy    # crea la app, respeta fly.toml y el Dockerfile
flyctl deploy                # build + deploy
```

## Añadir un curso

1. Copia el contenido HTML a `public/course-content/<slug>/lessons/` y `assets/`.
2. Añade una entrada al array `courses` en `content/courses.ts`.
3. `npm run dev` para verificar en local.
4. Commit + push. Vercel despliega solo desde `main`; Fly requiere `flyctl deploy`.
