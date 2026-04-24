# Portal del Chofer · Bigticket

Maqueta navegable del portal del chofer. Lista para deploy en Vercel.

---

## 🚀 Cómo subirlo a Vercel en 5 minutos

### Opción A — Vía web (más fácil, sin instalar nada)

1. **Descomprime este paquete** en una carpeta de tu computador.

2. **Sube la carpeta a GitHub** (o GitLab / Bitbucket):
   - Crea un repo nuevo en https://github.com/new (nombre sugerido: `driver-bigticket`)
   - Sigue las instrucciones para subir el proyecto (o arrastra la carpeta a GitHub Desktop)

3. **Conecta Vercel con el repo**:
   - Entra a https://vercel.com y haz login (puedes usar tu cuenta de GitHub)
   - Click en **"Add New"** → **"Project"**
   - Elige el repo `driver-bigticket`
   - Vercel detecta automáticamente que es Vite. NO cambies nada.
   - Click **"Deploy"**

4. **Listo.** En 30 segundos tendrás una URL pública tipo:
   ```
   https://driver-bigticket.vercel.app
   ```

5. **Comparte la URL** por WhatsApp, correo, donde sea. Se ve perfecto en celular y en desktop.

---

### Opción B — Vía CLI (si ya tienes Vercel CLI)

```bash
# 1. Descomprimir y entrar a la carpeta
cd driver-bigticket

# 2. Instalar dependencias
npm install

# 3. Probar local (opcional)
npm run dev
# Abrir http://localhost:3000

# 4. Deploy a producción
npx vercel --prod
```

---

## 📱 Probar en el celular

Una vez deployada, abre la URL en tu celular. **Para instalarla como app** (icono en pantalla de inicio):

**iPhone (Safari):**
1. Abre la URL en Safari
2. Toca el botón de compartir (cuadrado con flecha ↑)
3. Baja y elige **"Agregar a pantalla de inicio"**
4. Se instala como app independiente, con icono naranja "B"

**Android (Chrome):**
1. Abre la URL en Chrome
2. Toca el menú ⋮ arriba a la derecha
3. Elige **"Instalar aplicación"** o **"Agregar a pantalla de inicio"**
4. Se instala como app nativa, aparece en el cajón de apps

Una vez instalada, se abre en pantalla completa (sin barra de navegador) como una app nativa.

---

## 🛠️ Estructura del proyecto

```
driver-bigticket/
├── index.html              # HTML base + meta tags PWA
├── package.json            # Dependencias (React + Vite)
├── vite.config.js          # Config de Vite
├── vercel.json             # Config de Vercel
├── public/
│   └── manifest.json       # Manifest PWA (para instalar como app)
└── src/
    ├── main.jsx            # Entry point de React
    └── DriverApp.jsx       # La maqueta completa (todas las 8 pantallas)
```

---

## 🔑 Datos demo

El login ya viene pre-llenado. Usa:

- **Correo:** `rogelio.hernandez@bigticket.mx`
- **Contraseña:** cualquier cosa (`demo123`)

Simplemente toca "Iniciar sesión" y entras al portal.

---

## ⚠️ Importante: qué hace y qué NO hace esta maqueta

**Funciona de verdad:**
- ✅ Navegación completa entre las 8 pantallas
- ✅ Chat con Biggi (IA real, conectada a Claude API)
- ✅ Todos los componentes visuales, animaciones, transiciones
- ✅ El cambio de rango (Semana/Mes/Total) en el Home
- ✅ Abrir el detalle completo de cada jornada tocándola
- ✅ Instalación como PWA en celular

**NO está conectada todavía:**
- ❌ No valida el login contra Supabase (cualquier contraseña entra)
- ❌ Los datos son mock (el driver Rogelio Hernández y sus 5 jornadas)
- ❌ El botón "Reportar diferencia" muestra un alert placeholder (se implementa en la siguiente iteración)
- ❌ No sube documentos (el botón muestra un alert)

Todo esto se conecta cuando pasemos de maqueta a app real.

---

## 🎨 Colores institucionales usados

| Color       | Hex      | Uso                          |
|-------------|----------|------------------------------|
| Azul logo   | `#002F5D`| Fondo del login, marca       |
| Azul nav    | `#1a3a6b`| Headers, navegación          |
| Naranja     | `#F47B20`| CTAs, acciones principales   |
| Verde       | `#2d7a4f`| Premios NS, éxito, aprobado  |
| Rojo        | `#c0392b`| Multas NS, errores, rechazado|

---

## 📝 Próximos pasos

- [ ] Probar la maqueta con 2–3 choferes reales y recoger feedback
- [ ] Recibir respuestas del cuestionario de tarifario (Administración)
- [ ] Implementar formulario de reclamos (parte 2)
- [ ] Conectar con Supabase Auth para login real
- [ ] Reemplazar datos mock por queries reales a Supabase
- [ ] Versión desktop responsive (sidebar lateral)

---

Construido con ❤️ para Bigticket.
