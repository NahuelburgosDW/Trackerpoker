# PokerTracker

App personal de seguimiento de poker — perfil del jugador + panel admin.

## Arrancar

```bash
cd Trackerpoker-main
npm install
npm run dev
```

Abrí **http://localhost:5173** en el navegador.

Sin configurar `.env`, la app usa **datos de demo**. Para datos reales, conectá Google Sheets (abajo).

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Perfil público del jugador |
| `/results` | Resultados |
| `/statistics` | Estadísticas |
| `/admin/login` | Login admin (`admin` / `admin123`) |
| `/admin` | Dashboard (requiere login) |
| `/admin/import` | Importar TXT |
| `/admin/tournaments` | Gestionar torneos |
| `/admin/profile` | Editar perfil |

---

## Conectar Google Sheets (paso a paso)

### 1. Crear el spreadsheet

1. Andá a [Google Sheets](https://sheets.google.com) → **Nuevo**
2. Nombralo `PokerTracker` (o como quieras)

### 2. Instalar el backend (Apps Script)

1. En el Sheet: **Extensiones → Apps Script**
2. Borrá el contenido default y pegá el código de:
   `Trackerpoker-main/google-apps-script/Code.gs`
3. Guardá el proyecto (Ctrl+S)

### 3. Configurar token secreto

1. En Apps Script: **Project Settings** (engranaje) → **Script Properties**
2. Agregá:
   - **Property:** `ADMIN_TOKEN`
   - **Value:** una clave secreta (ej: `mi-clave-super-secreta-123`)

### 4. Crear las pestañas iniciales

1. En Apps Script, seleccioná la función `setupSheet` en el dropdown
2. Clic en **Run** (▶)
3. Autorizá los permisos de Google cuando te lo pida
4. Esto crea las pestañas: `Player`, `Tournaments`, `ImportLog`, `Config`

### 5. Publicar como Web App

1. **Deploy → New deployment**
2. Tipo: **Web app**
3. Configuración:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. **Deploy** → copiá la **URL** (termina en `/exec`)

### 6. Configurar la app

```bash
cd Trackerpoker-main
cp .env.example .env
```

Editá `.env`:

```env
VITE_SHEETS_API_URL=https://script.google.com/macros/s/TU_ID/exec
VITE_SHEETS_ADMIN_TOKEN=mi-clave-super-secreta-123
```

Reiniciá el dev server:

```bash
npm run dev
```

### 7. Verificar

- Abrí el perfil → debería decir **"Conectado a Google Sheets"** arriba
- Entrá al admin → editá el perfil → **Guardar** → revisá que cambie en la pestaña `Player` del Sheet

---

## Estructura del Google Sheet

| Pestaña | Contenido |
|---------|-----------|
| **Player** | Datos del jugador (1 fila) |
| **Tournaments** | Todos los torneos |
| **ImportLog** | Historial de importaciones |
| **Config** | Última sincronización |

### Columnas — Player
`id | nickname | realName | country | countryCode | countryFlag | room | bio | gameTypes | startedAt | createdAt | avatarInitials`

### Columnas — Tournaments
`id | playerId | date | name | buyIn | position | players | prize | gameType`

Podés cargar torneos manualmente en el Sheet o importarlos desde el admin (parser TXT — próximo paso).

---

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Google Sheets via Apps Script
