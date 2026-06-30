# 💸 Monetra — Plataforma de Gestión Financiera Automatizada con IA

> **Monetra** es una aplicación de educación y gestión financiera personal automatizada mediante Inteligencia Artificial, diseñada específicamente para jóvenes de 18 a 28 años (estudiantes universitarios y recién egresados) en Colombia. Con una interfaz moderna, visual y dinámica tipo Fintech, busca transformar la relación de la juventud con su dinero.

---

## 👥 Equipo de Desarrollo

Monetra es desarrollado por un equipo multidisciplinario comprometido con la creación de soluciones tecnológicas innovadoras para la educación financiera y la gestión inteligente de recursos personales.

| Integrante | Rol |
|------------|------|
| **Miguel Angel Escobar** | Product Owner / Scrum Master |
| **Alejandro Guerrero Cano** | Desarrollador Frontend |
| **Néstor David Heredia** | Desarrollador Backend / IA |
| **Oscar David Cuaical** | Desarrollador Backend / DevOps |
| **Jhoimar Silva Torres** | Desarrollador Backend |
| **Juan Manuel Vargas Muñoz** | Desarrollador Frontend |
| **Yissy Katherine Posso Perea** | Desarrolladora Frontend |

### 📊 Distribución del Equipo

- 🎯 **Gestión del Proyecto:** 1 integrante
- 💻 **Desarrollo Frontend:** 3 integrantes
- ⚙️ **Desarrollo Backend:** 3 integrantes
- 🤖 **Inteligencia Artificial:** 1 integrante
- 🚀 **DevOps:** 1 integrante

> Este proyecto fue desarrollado aplicando metodologías ágiles, buenas prácticas de ingeniería de software y tecnologías modernas para ofrecer una experiencia financiera inteligente, segura y escalable.

## 🚀 Estado Actual del Proyecto: Fase de Infraestructura y Lógica Core
El proyecto ha completado con éxito la **configuración inicial, arquitectura del monorepo y el motor lógico de autenticación**. 
* **Frontend:** El enrutamiento dinámico está protegido mediante guardas de seguridad en el cliente. Cuenta con un sistema interactivo de Login (tradicional y social con Google), Registro estructurado y recuperación de contraseña, todo maquetado con una estética *Premium Dark Mode*.
* **Backend:** Servidor base en FastAPI levantado con políticas CORS integradas y blindado para interactuar exclusivamente con el entorno de desarrollo local del cliente.

---

## 🛠️ Stack Tecnológico Seleccionado

### Cliente (Frontend)
* **React 18 & Vite:** Entorno de desarrollo ultra rápido y modular.
* **Tailwind CSS v4:** Estilizado moderno, responsivo y de alto impacto visual mediante utilidades nativas.
* **React Router DOM v6:** Gestión de enrutamiento declarativo y protección de accesos.
* **Firebase SDK v10:** Integración nativa con servicios en la nube.

### Servicios e IA (Backend-API)
* **Python 3.11+ & FastAPI:** Framework web asíncrono de alto rendimiento para el procesamiento de peticiones.
* **Google Gemini SDK (google-genai):** Integración nativa para la orquestación del LLM **Gemini 2.5 Flash**.
* **Uvicorn:** Servidor ASGI rápido para producción y desarrollo local.

### Persistencia y Seguridad (BaaS)
* **Firebase Authentication:** Gestión de sesiones segura en tiempo real (OAuth 2.0 con Google y Auth tradicional).
* **Firebase Firestore Database:** Base de datos NoSQL documental orientada a la protección por usuario.

---

## 📂 Arquitectura del Monorepo

El proyecto está estructurado de forma estrictamente modular para separar la interfaz de cliente de los servicios analíticos y de IA en Python, evitando colisiones de dependencias.

```text
monetra-app/
├── .gitignore               # Exclusiones globales de Git (node_modules, venv, .env)
├── README.md                # Documentación institucional de la app
│
├── backend-api/             # SERVICIOS DE INTELIGENCIA ARTIFICIAL Y OCR
│   ├── main.py              # Punto de entrada FastAPI y políticas CORS
│   ├── requirements.txt     # Dependencias del entorno virtual de Python
│   ├── .env.example         # Plantilla de credenciales de IA (Gemini API)
│   ├── routers/             # Endpoints / Controladores de la API
│   │   ├── __init__.py
│   │   ├── ai_router.py     # Servicios de asesoría financiera con LLM
│   │   └── ocr_router.py    # Procesamiento y escaneo de facturas/recibos
│   └── services/            # Lógica de negocio e integraciones de IA
│       ├── __init__.py
│       ├── gemini_service.py
│       └── ocr_service.py
│
└── frontend/                # INTERFAZ DE USUARIO (FINTECH CLIENT)
    ├── .env.local.example   # Plantilla de variables de entorno de Firebase
    ├── vite.config.js       # Configuración de empaquetado y plugins de Tailwind v4
    └── src/
        ├── main.jsx         # Punto de entrada de renderizado de React
        ├── App.jsx          # Enrutador central y proveedor de contexto global
        ├── index.css        # Directivas globales de Tailwind CSS
        ├── firebase/
        │   └── config.js    # Inicialización centralizada de Firebase Web SDK
        ├── context/
        │   └── AuthContext.jsx # Estado global y listeners en tiempo real de sesión
        ├── hooks/
        │   └── useAuth.js   # Custom Hook de consumo rápido para el equipo
        ├── components/
        │   ├── layout/
        │   │   └── Navbar.jsx  # Barra de navegación responsiva con submenú de perfil
        │   └── ui/
        │       └── ProtectedRoute.jsx # Guarda de seguridad contra accesos no autenticados
        └── views/           # Vistas / Pantallas del ecosistema
            ├── auth/
            │   ├── LoginView.jsx    # Login integrado + Modal de recuperación
            │   └── RegisterView.jsx # Captura y persistencia de usuarios
            └── dashboard/
                └── DashboardView.jsx # Panel principal e interfaces de módulos dinámicos
```

## 🛡️ Políticas de Seguridad y Datos (Firestore)

Para asegurar el aislamiento de la información financiera de los usuarios en el MVP, las Reglas de Seguridad de Firestore han sido configuradas bajo un modelo de arquitectura de privilegios mínimos:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuario está estrictamente aislado en su ID único de Firebase Auth
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## ⚙️ Instrucciones de Instalación y Despliegue Local

Sigue estos pasos para clonar y ejecutar el entorno completo en tu máquina de desarrollo.

### 1. Clonar el repositorio

```bash
git clone <URL_DE_TU_REPOSITORIO_GITHUB>
cd monetra-app
```

### 2. Configuración y Despliegue del Frontend (React + Vite)

```bash
# Navegar al directorio del cliente
cd frontend

# Instalar dependencias del package.json
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con las llaves provistas por la consola de Firebase

# Levantar el servidor de desarrollo
npm run dev
```

La aplicación cliente se desplegará de forma local en:

```text
http://localhost:5173
```

### 3. Configuración y Despliegue del Backend API (FastAPI) -> (Próximamente)

Abre una nueva terminal en la raíz del proyecto:

```bash
# Navegar al directorio del backend
cd backend-api

# Crear el entorno virtual de Python
python -m venv venv

# Activar el entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar los paquetes técnicos requeridos
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Nota: Edita el archivo .env e introduce tu GEMINI_API_KEY de Google AI Studio

# Correr la API con recarga automática en desarrollo
uvicorn main:app --reload
```

La API del backend e interactivos de documentación automática de endpoints (Swagger UI) estarán disponibles en:

**Servidor base (Próximamente):**

```text
http://localhost:8000
```

**Documentación interactiva (Próximamente):**

```text
http://localhost:8000/docs
```

## 🗺️ Roadmap de Implementación

- [x] Arquitectura de Monorepo y árbol de directorios limpio.
- [x] Inicialización segura de Firebase SDK y variables VITE_.
- [x] Motor global de Autenticación, persistencia e inyección de datos en Firestore.
- [x] Enrutamiento protegido por cliente (ProtectedRoute) e interfaz Fintech responsiva.
- [ ] Conexión del backend FastAPI con la lógica del servicio OCR.
- [ ] Desarrollo de endpoints para análisis predictivo con Gemini 2.5 Flash (google-genai).
- [ ] Maquetación final de los módulos interactivos de Gastos y Metas de Ahorro.