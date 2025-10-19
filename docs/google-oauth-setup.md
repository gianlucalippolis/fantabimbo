# Configurazione Google OAuth per Fantanome

Questa guida spiega come configurare l'autenticazione tramite Google OAuth per l'applicazione Fantanome.

## 1. Prerequisiti

- Account Google
- Accesso alla [Google Cloud Console](https://console.cloud.google.com/)
- Strapi backend già configurato e funzionante

## 2. Configurazione Google Cloud Console

### 2.1 Creare un nuovo progetto (o selezionarne uno esistente)

1. Vai su https://console.cloud.google.com/
2. Clicca su **Select a project** → **New Project**
3. Inserisci il nome del progetto (es. "Fantanome")
4. Clicca su **Create**

### 2.2 Abilitare l'API Google+

1. Nel menu laterale, vai su **APIs & Services** → **Library**
2. Cerca "Google+ API"
3. Clicca su **Enable**

### 2.3 Configurare OAuth Consent Screen

1. Nel menu laterale, vai su **APIs & Services** → **OAuth consent screen**
2. Seleziona **External** (o Internal se è un'app aziendale)
3. Clicca su **Create**
4. Compila i campi obbligatori:
   - **App name**: Fantanome
   - **User support email**: la tua email
   - **Developer contact information**: la tua email
5. Clicca su **Save and Continue**
6. In **Scopes**, clicca su **Add or Remove Scopes** e aggiungi:
   - `userinfo.email`
   - `userinfo.profile`
7. Clicca su **Save and Continue**
8. In **Test users** (se sei in modalità Testing), aggiungi le email degli utenti autorizzati
9. Clicca su **Save and Continue**

### 2.4 Creare le credenziali OAuth

1. Nel menu laterale, vai su **APIs & Services** → **Credentials**
2. Clicca su **Create Credentials** → **OAuth client ID**
3. Seleziona **Application type**: **Web application**
4. Inserisci un nome (es. "Fantanome Web Client")
5. In **Authorized JavaScript origins**, aggiungi:
   - `http://localhost:3000` (per sviluppo)
   - `https://tuodominio.com` (per produzione)
6. In **Authorized redirect URIs**, aggiungi:
   - `http://localhost:3000/api/auth/callback/google` (per sviluppo)
   - `https://tuodominio.com/api/auth/callback/google` (per produzione)
7. Clicca su **Create**
8. **Salva** il **Client ID** e il **Client Secret**

## 3. Configurazione Strapi Backend

### 3.1 Installare il plugin Google OAuth (se non già installato)

Il plugin Google OAuth è già incluso di default in Strapi.

### 3.2 Configurare il provider Google in Strapi

1. Accedi al pannello admin di Strapi (es. `http://localhost:1337/admin`)
2. Vai su **Settings** → **Users & Permissions Plugin** → **Providers**
3. Clicca su **Google**
4. Abilita il provider selezionando **Enable**
5. Inserisci le credenziali:
   - **Client ID**: il Client ID ottenuto da Google Cloud Console
   - **Client Secret**: il Client Secret ottenuto da Google Cloud Console
   - **The redirect URL to your front-end app**: `http://localhost:3000/api/auth/callback/google`
6. Clicca su **Save**

### 3.3 Configurare il ruolo predefinito per i nuovi utenti

1. In Strapi, vai su **Settings** → **Users & Permissions Plugin** → **Roles**
2. Clicca su **Authenticated**
3. Verifica che i permessi necessari siano abilitati per gli utenti autenticati
4. Clicca su **Save**

## 4. Configurazione Frontend (Next.js)

### 4.1 Configurare le variabili d'ambiente

Nel file `.env.local` (crea il file se non esiste):

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-una-chiave-segreta-qui
```

Per generare `NEXTAUTH_SECRET`, esegui:

```bash
openssl rand -base64 32
```

### 4.2 Verificare la configurazione

Il codice è già configurato in:
- `/frontend/src/lib/auth.ts` - Configurazione NextAuth con Google Provider
- `/frontend/src/app/login/page.tsx` - Pagina di login con pulsante Google
- `/frontend/src/components/icons/GoogleIcon.tsx` - Icona Google

## 5. Test del Login

### 5.1 Avviare l'applicazione

```bash
# Terminal 1: Backend Strapi
cd backend
npm run develop

# Terminal 2: Frontend Next.js
cd frontend
npm run dev
```

### 5.2 Testare il login

1. Apri http://localhost:3000/login
2. Clicca su **Accedi con Google**
3. Seleziona il tuo account Google
4. Autorizza l'applicazione
5. Dovresti essere reindirizzato alla dashboard

### 5.3 Verificare l'utente in Strapi

1. Accedi al pannello admin di Strapi
2. Vai su **Content Manager** → **User** (sotto Users & Permissions)
3. Dovresti vedere il nuovo utente creato con l'account Google

## 6. Troubleshooting

### Errore: "redirect_uri_mismatch"

- Verifica che gli **Authorized redirect URIs** in Google Cloud Console corrispondano esattamente a:
  - `http://localhost:3000/api/auth/callback/google` (sviluppo)
  - `https://tuodominio.com/api/auth/callback/google` (produzione)

### Errore: "Access blocked: This app's request is invalid"

- Verifica che l'**OAuth Consent Screen** sia configurato correttamente
- Assicurati che gli scope `userinfo.email` e `userinfo.profile` siano abilitati

### L'utente non viene creato in Strapi

- Verifica che il provider Google sia abilitato in Strapi
- Verifica che il **Client ID** e **Client Secret** siano corretti
- Controlla i log di Strapi per eventuali errori

### Errore: "Impossibile collegare l'account Google"

- Verifica che Strapi sia raggiungibile
- Controlla i log del browser (Console) per errori dettagliati
- Verifica che `NEXT_PUBLIC_STRAPI_API_URL` sia configurato correttamente

## 7. Produzione

### 7.1 Configurare gli URL di produzione

1. In Google Cloud Console, aggiungi gli URL di produzione in **Authorized redirect URIs**
2. In Strapi, aggiorna la **redirect URL** con l'URL di produzione
3. Nel frontend, aggiorna le variabili d'ambiente:
   - `NEXTAUTH_URL=https://tuodominio.com`
   - `NEXT_PUBLIC_SITE_URL=https://tuodominio.com`

### 7.2 Pubblicare l'app OAuth

Se hai configurato l'app in modalità **Testing**, solo gli utenti aggiunti in **Test users** potranno accedere. Per rendere l'app disponibile a tutti:

1. Vai su **OAuth consent screen**
2. Clicca su **Publish App**
3. Conferma la pubblicazione

**Nota**: Google potrebbe richiedere una verifica dell'applicazione se richiedi scope sensibili.

## 8. Risorse Utili

- [Google Cloud Console](https://console.cloud.google.com/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Strapi Google OAuth Documentation](https://docs.strapi.io/dev-docs/plugins/users-permissions#google)

---

**Data ultima modifica**: 19 ottobre 2025
