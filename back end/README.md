# Amazon SEO Optimizer - Backend API

API REST con Express.js y MongoDB para el sistema de optimización SEO de Amazon.

## Requisitos previos

- Node.js 18+
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) (gratis)
- Cuenta en [Render](https://render.com) (gratis)

## Configuración local

```bash
npm install
cp .env.example .env
# Editar .env con tus valores reales
npm start
```

## Deploy en Render

### Paso 1: Crear base de datos MongoDB Atlas

1. Ir a [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Crear cuenta gratuita
3. Crear un cluster (M0 Free tier)
4. En **Database Access**: crear usuario con password
5. En **Network Access**: agregar `0.0.0.0/0` (permitir desde cualquier IP)
6. En **Database** → **Connect** → **Connect your application**: copiar el string de conexión
7. Reemplazar `<password>` con tu password real

### Paso 2: Subir a GitHub

```bash
git init
git add .
git commit -m "Backend API"
git remote add origin https://github.com/TU_USUARIO/amazon-seo-backend.git
git push -u origin main
```

### Paso 3: Deploy en Render

1. Ir a [render.com](https://render.com) y crear cuenta
2. Click **New** → **Web Service**
3. Conectar tu repositorio de GitHub
4. Configurar:
   - **Name**: `amazon-seo-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. En **Environment Variables** agregar:
   - `MONGO_URI` = tu string de MongoDB Atlas
   - `JWT_SECRET` = una clave secreta larga y aleatoria
   - `FRONTEND_URL` = la URL de tu frontend en Netlify (la agregas después)
6. Click **Create Web Service**
7. Esperar que termine el deploy (~2-3 minutos)
8. Copiar la URL generada (ej: `https://amazon-seo-api.onrender.com`)

### Paso 4: Verificar

Abrir en el navegador:
```
https://amazon-seo-api.onrender.com/
```
Debe responder: `{"message":"Amazon SEO API funcionando correctamente","status":"ok"}`

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Registro |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Usuario actual |
| POST | /api/listings/upload | Subir Excel listings |
| GET | /api/listings | Obtener listings |
| GET | /api/listings/categories | Categorías |
| GET | /api/listings/stats | Métricas agregadas |
| DELETE | /api/listings | Borrar listings |
| POST | /api/keywords/upload | Subir Excel keywords |
| GET | /api/keywords | Obtener keywords |
| GET | /api/keywords/top | Top keywords |
| GET | /api/keywords/opportunities | Oportunidades |
| DELETE | /api/keywords | Borrar keywords |
