# Configurazione Google OAuth in Strapi - Guida Dettagliata

## ⚠️ IMPORTANTE: Configurazione Backend Strapi

Il login con Google funziona correttamente nel frontend, ma Strapi deve essere configurato per accettare l'autenticazione Google e restituire il JWT.

## 1. Accedi al Pannello Admin di Strapi

1. Apri il browser e vai su: `http://localhost:1337/admin`
2. Effettua il login con le tue credenziali admin

## 2. Configura il Provider Google

### Passo 1: Vai alle impostazioni dei Provider

1. Nel menu laterale, clicca su **Settings** (Impostazioni)
2. Nella sezione **USERS & PERMISSIONS PLUGIN**, clicca su **Providers**
3. Troverai una lista di provider OAuth disponibili

### Passo 2: Configura Google Provider

1. Clicca su **Google** nella lista dei provider
2. Vedrai un form di configurazione con i seguenti campi:

#### ✅ Campi da compilare:

**Enable:**
- ☑️ Seleziona la checkbox per abilitare il provider Google

**Client ID:**
```
251971593167-p16qgvg1uvk1h15oeje2set06k8lujcf.apps.googleusercontent.com
```

**Client Secret:**
```
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t
```

**The redirect URL to your front-end app:**
```
http://localhost:3000/api/auth/callback/google
```

**⚠️ NOTA IMPORTANTE:** Questo campo indica a Strapi dove reindirizzare l'utente dopo il login, MA non è l'URL di callback che Strapi usa per ricevere i dati da Google.

3. Clicca su **Save** in alto a destra

## 3. Verifica la Configurazione

Dopo aver salvato, verifica che:

1. Il provider Google sia **Enabled** (checkbox selezionata)
2. I campi Client ID e Client Secret siano compilati correttamente
3. L'URL di redirect sia corretto

## 4. Test della Configurazione

### Test 1: Endpoint di Callback Strapi

Apri il browser e visita (sostituendo `YOUR_ACCESS_TOKEN` con un token valido):
```
http://localhost:1337/api/auth/google/callback?access_token=YOUR_ACCESS_TOKEN
```

**Risposta attesa:**
- ❌ Se il provider NON è configurato: Errore 400 o 500
- ✅ Se il provider è configurato: JSON con `jwt` e `user`

### Test 2: Login Completo dal Frontend

1. Vai su `http://localhost:3000/login`
2. Clicca su **Accedi con Google**
3. Completa l'autenticazione con Google
4. Controlla i log del browser (F12 → Console)

**Log attesi nel browser:**
```
JWT callback - token: { ... }
JWT callback - user: { ... }
JWT callback - account: { provider: "google", access_token: "..." }
Login con Google - access_token: ya29.a0...
Chiamata a Strapi: http://localhost:1337/api/auth/google/callback?access_token=...
Strapi response status: 200
Strapi response data: { jwt: "...", user: { ... } }
JWT di Strapi ottenuto con successo
```

**Se vedi errori:**
```
Strapi response status: 400
Errore risposta Strapi: { ... }
```
→ Il provider Google non è configurato correttamente in Strapi

## 5. Risoluzione Problemi Comuni

### Errore: "Provider not found" o Status 400

**Causa:** Il provider Google non è abilitato in Strapi

**Soluzione:**
1. Torna al pannello admin Strapi
2. Settings → Providers → Google
3. Verifica che la checkbox "Enable" sia selezionata
4. Salva di nuovo

### Errore: "Invalid credentials" o "Invalid token"

**Causa:** Client ID o Client Secret non corrispondono

**Soluzione:**
1. Verifica che Client ID e Client Secret in Strapi corrispondano a quelli di Google Cloud Console
2. Copia di nuovo i valori da Google Cloud Console
3. Incollali in Strapi (attenzione a spazi extra)
4. Salva

### Errore: "JWT mancante nella sessione"

**Causa:** Strapi non restituisce il JWT o la chiamata a Strapi fallisce

**Soluzione:**
1. Controlla i log del browser per vedere la risposta di Strapi
2. Verifica che Strapi sia raggiungibile su `http://localhost:1337`
3. Verifica che `NEXT_PUBLIC_STRAPI_API_URL` in `.env` sia corretto
4. Riavvia sia Strapi che Next.js

### Errore: "redirect_uri_mismatch"

**Causa:** Gli URL configurati non corrispondono

**Soluzione:**
Verifica che in **Google Cloud Console** → **Credentials** → **OAuth 2.0 Client ID**:

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
```

**NON** usare l'URL di Strapi (`http://localhost:1337/...`) come redirect URI in Google Cloud Console.

## 6. Configurazione Ruolo Predefinito

Per i nuovi utenti che si registrano con Google, devi configurare il ruolo predefinito:

1. In Strapi, vai su **Settings** → **Roles** (sotto Users & Permissions Plugin)
2. Clicca su **Authenticated**
3. Nella sezione **Permissions**, abilita i permessi necessari per i nuovi utenti
4. Clicca su **Save**

## 7. Verifica Finale

Dopo aver configurato tutto:

1. Riavvia Strapi:
   ```bash
   cd backend
   npm run develop
   ```

2. Riavvia Next.js:
   ```bash
   cd frontend
   npm run dev
   ```

3. Prova di nuovo il login con Google

4. Controlla i log del browser:
   - Dovresti vedere "JWT di Strapi ottenuto con successo"
   - NON dovresti vedere "JWT mancante nella sessione"

## 8. Screenshot della Configurazione Corretta

La configurazione in Strapi → Settings → Providers → Google dovrebbe essere:

```
┌─────────────────────────────────────────┐
│ Google Provider Configuration           │
├─────────────────────────────────────────┤
│ ☑️ Enable                               │
│                                          │
│ Client ID:                              │
│ 251971593167-p16qgvg1uvk1h15oeje2set... │
│                                          │
│ Client Secret:                          │
│ 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t   │
│                                          │
│ The redirect URL to your front-end app: │
│ http://localhost:3000/api/auth/callback/│
│ google                                   │
│                                          │
│              [Save]                      │
└─────────────────────────────────────────┘
```

## 9. Note Importanti

- ⚠️ **Strapi DEVE essere in esecuzione** su `http://localhost:1337`
- ⚠️ Il provider Google **DEVE essere abilitato** (checkbox selezionata)
- ⚠️ Dopo ogni modifica in Strapi, **salva** le impostazioni
- ⚠️ I **Client ID e Secret** devono corrispondere a quelli di Google Cloud Console
- ⚠️ L'URL di callback in Google Cloud Console deve essere `http://localhost:3000/api/auth/callback/google`

---

**Ultimo aggiornamento:** 19 ottobre 2025
