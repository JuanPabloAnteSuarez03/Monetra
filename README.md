# 💸 Monetra — Plataforma de Gestión Financiera Automatizada con IA

> **Monetra** es una aplicación de educación y gestión financiera personal automatizada mediante Inteligencia Artificial, diseñada específicamente para jóvenes de 18 a 28 años (estudiantes universitarios y recién egresados) en Colombia. Con una interfaz moderna, visual y dinámica tipo Fintech, busca transformar la relación de la juventud con su dinero.

> Este proyecto fue desarrollado aplicando metodologías ágiles, buenas prácticas de ingeniería de software y tecnologías modernas para ofrecer una experiencia financiera inteligente, segura y escalable.

## 🚀 Estado Actual del Proyecto: Scaffold Inicial

El proyecto ha completado con éxito la **configuración inicial, arquitectura del monorepo, dockerización e integración de CI/CD, sin incluir aún los módulos de Inteligencia Artificial**.

- **Frontend:** Scaffold inicial con React 18, Vite y Tailwind v4. Sistema de enrutamiento y plantillas de Auth.
- **Backend:** Servidor base en FastAPI levantado con políticas CORS integradas y endpoints de health check básicos.

---

## 🛠️ Stack Tecnológico Seleccionado

### Cliente (Frontend)

- **React 18 & Vite:** Entorno de desarrollo rápido y modular.
- **Tailwind CSS v4:** Estilizado moderno y responsivo.
- **Firebase Auth:** Autenticación.
- **Vitest:** Pruebas unitarias y de integración.

### Servicios (Backend-API)

- **Python 3.11+ & FastAPI:** Framework web asíncrono.
- **Uvicorn:** Servidor ASGI rápido para producción y desarrollo local.
- **Pytest:** Testing de la API.

---

## 📂 Arquitectura del Monorepo

```text
monetra-app/
├── backend-api/             # API en FastAPI
│   ├── main.py              # Punto de entrada y configuración CORS
│   ├── tests/               # Pruebas con pytest
│   ├── Dockerfile           # Imagen Docker para el backend
│   └── routers/ & services/ # Vacíos (para futura IA)
│
├── frontend/                # Aplicación Web (React+Vite)
│   ├── src/                 # Código fuente
│   ├── Dockerfile           # Imagen de producción (Nginx)
│   └── Dockerfile.dev       # Imagen para desarrollo (Vite)
│
├── docker-compose.yml       # Orquestación para Producción
├── docker-compose.dev.yml   # Orquestación para Desarrollo Local
├── Makefile                 # Comandos de utilidad (make up, make up-dev)
└── .github/workflows/ci.yml # Integración Continua Unificada
```

## 🛡️ Políticas de Seguridad y Datos (Firestore)

Para asegurar el aislamiento de la información financiera de los usuarios, las Reglas de Seguridad de Firestore (planificadas) seguirán un modelo de privilegios mínimos:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## ⚙️ Instrucciones de Instalación y Despliegue Local

### Opción Recomendada: Uso de Docker y Makefile

El proyecto cuenta con un `Makefile` en la raíz para facilitar el uso de Docker Compose:

```bash
# Levantar el entorno completo en modo DESARROLLO (hot-reload en Vite y Uvicorn)
make up-dev

# Levantar el entorno completo en modo PRODUCCIÓN
make up

# Detener los contenedores
make down

# Ver logs en vivo
make logs
```

### Puertos en Uso

| Servicio | Entorno | Puerto |
|----------|---------|--------|
| Frontend | Local (Vite) | `5173` |
| Backend  | Local (API) | `8000` |
| Frontend | Docker Prod (Nginx)| `3100` |

## 🗺️ Roadmap de Implementación

- [x] Scaffold inicial de frontend (Vite/React/Tailwind) y backend (FastAPI).
- [x] Dockerización de entornos (Dev y Prod).
- [x] Pipeline CI/CD Unificado en GitHub Actions.
- [ ] Integración completa de Firebase Auth y protección de rutas.
- [ ] Conexión del backend FastAPI con la lógica del servicio OCR.
- [ ] Desarrollo de endpoints para análisis predictivo con Gemini 2.5 Flash (google-genai).
