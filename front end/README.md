# Amazon SEO Optimizer - Frontend

Dashboard Angular para optimización de listados SEO en Amazon.

## Configuración local

```bash
npm install
ng serve
```

## Deploy en Netlify

### 1. Actualizar URL del backend

Editar `src/environments/environment.prod.ts` con la URL real de Render.

### 2. Subir a GitHub

```bash
git init
git add .
git commit -m "Frontend Angular"
git remote add origin https://github.com/TU_USUARIO/amazon-seo-frontend.git
git push -u origin main
```

### 3. Deploy en Netlify

1. Ir a netlify.com → Add new site → Import from GitHub
2. Build command: `npm run build -- --configuration production`
3. Publish directory: `dist/amazon-seo-frontend/browser`
4. Deploy site

### 4. Actualizar CORS en Render

Agregar `FRONTEND_URL` con la URL de Netlify en las variables de entorno de Render.
