const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const VERIFY_SECRET = 'dominosoft_internal_v2_0xDEADBEEF';
const API_URL = 'https://dominosoft.org/api/verify';

const DEMO_DURATION_DAYS = 3;
const DEMO_DURATION_MS = DEMO_DURATION_DAYS * 24 * 60 * 60 * 1000; // 3 jours en millisecondes
const MAX_DEMO_PRODUCTS = 15;
const MAX_DEMO_VENTES = 30;

/**
 * Retourne le chemin complet du fichier de flag d'activation
 * (%LOCALAPPDATA%/elc-app/activator.flag)
 */
function getFlagPath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return path.join(app.getPath('userData'), 'activator.flag');
  }
  return path.join(localAppData, 'elc-app', 'activator.flag');
}

/**
 * Retourne le chemin du fichier de suivi de la période d'essai (mode démo)
 * (%LOCALAPPDATA%/elc-app/demo.flag)
 */
function getDemoFilePath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return path.join(app.getPath('userData'), 'demo.flag');
  }
  return path.join(localAppData, 'elc-app', 'demo.flag');
}

/**
 * Vérifie si le logiciel est activé avec une clé officielle Dominosoft
 */
function checkActivationStatus() {
  try {
    const flagPath = getFlagPath();
    if (!flagPath || !fs.existsSync(flagPath)) {
      return { activated: false };
    }

    const raw = fs.readFileSync(flagPath, 'utf8');
    const data = JSON.parse(raw);

    if (data && data.activated === true) {
      return {
        activated: true,
        key: data.key || '',
        token: data.token || '',
        software: data.software || '',
        client: data.client || '',
        activatedAt: data.activatedAt || null
      };
    }
  } catch (err) {
    console.error('[Dominosoft Activation] Erreur lecture flag:', err);
  }
  return { activated: false };
}

/**
 * Récupère ou initialise l'état du mode Démo (3 jours, max 15 produits, max 30 ventes)
 */
function getDemoInfo() {
  const activation = checkActivationStatus();
  if (activation.activated) {
    return {
      isActivated: true,
      isDemo: false,
      expired: false,
      daysLeft: null,
      hoursLeft: null,
      maxProducts: Infinity,
      maxVentes: Infinity
    };
  }

  const demoPath = getDemoFilePath();
  const dir = path.dirname(demoPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }

  let demoData = null;
  if (fs.existsSync(demoPath)) {
    try {
      demoData = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
    } catch (e) {}
  }

  const now = Date.now();
  if (!demoData || !demoData.startedAt) {
    demoData = {
      startedAt: now,
      expiresAt: now + DEMO_DURATION_MS,
      durationDays: DEMO_DURATION_DAYS,
      maxProducts: MAX_DEMO_PRODUCTS,
      maxVentes: MAX_DEMO_VENTES
    };
    try {
      fs.writeFileSync(demoPath, JSON.stringify(demoData, null, 2), 'utf8');
      console.log('[Mode Démo] ✅ Initialisation de la période d\'essai de 3 jours:', demoData);
    } catch (e) {
      console.error('[Mode Démo] Erreur création demo.flag:', e);
    }
  }

  // Protection contre le recul d'horloge du système (> 2 minutes de recul)
  let isExpired = now >= demoData.expiresAt;
  if (now < demoData.startedAt - 120000) {
    isExpired = true;
  }

  const timeLeftMs = Math.max(0, demoData.expiresAt - now);
  const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));
  const hoursLeft = Math.ceil(timeLeftMs / (60 * 60 * 1000));

  return {
    isActivated: false,
    isDemo: true,
    expired: isExpired,
    startedAt: demoData.startedAt,
    expiresAt: demoData.expiresAt,
    durationDays: DEMO_DURATION_DAYS,
    timeLeftMs,
    daysLeft,
    hoursLeft,
    maxProducts: MAX_DEMO_PRODUCTS,
    maxVentes: MAX_DEMO_VENTES
  };
}

/**
 * Contrôle la création de produits selon le statut de licence/démo
 */
function checkProductLimit(db) {
  const activation = checkActivationStatus();
  if (activation.activated) {
    return { allowed: true };
  }

  const demo = getDemoInfo();
  if (demo.expired) {
    return {
      allowed: false,
      error: 'La période d\'essai de 3 jours est terminée. L\'activation obligatoire du logiciel est requise pour ajouter des produits.'
    };
  }

  try {
    if (db) {
      const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE status != "deleted"').get().c;
      if (count >= demo.maxProducts) {
        return {
          allowed: false,
          error: `Limite du mode démo atteinte : vous ne pouvez pas créer plus de ${demo.maxProducts} produits. Veuillez activer la licence complète Dominosoft.`
        };
      }
    }
  } catch (err) {
    console.error('Erreur vérification limite produits:', err);
  }

  return { allowed: true };
}

/**
 * Contrôle l'enregistrement des ventes selon le statut de licence/démo
 */
function checkVenteLimit(db) {
  const activation = checkActivationStatus();
  if (activation.activated) {
    return { allowed: true };
  }

  const demo = getDemoInfo();
  if (demo.expired) {
    return {
      allowed: false,
      error: 'La période d\'essai de 3 jours est terminée. L\'activation obligatoire du logiciel est requise pour enregistrer des ventes.'
    };
  }

  try {
    if (db) {
      const count = db.prepare('SELECT COUNT(*) as c FROM ventes').get().c;
      if (count >= demo.maxVentes) {
        return {
          allowed: false,
          error: `Limite du mode démo atteinte : vous ne pouvez pas enregistrer plus de ${demo.maxVentes} ventes. Veuillez activer la licence complète Dominosoft.`
        };
      }
    }
  } catch (err) {
    console.error('Erreur vérification limite ventes:', err);
  }

  return { allowed: true };
}

/**
 * Étape 1 : Récupérer le timestamp exact du serveur Dominosoft
 */
function getDominosoftTimestamp() {
  return new Promise((resolve) => {
    const probe = https.request(
      'https://dominosoft.org/',
      { method: 'HEAD', rejectUnauthorized: false },
      (res) => {
        const dateHeader = res.headers['date'];
        if (dateHeader) {
          const serverTs = Math.floor(new Date(dateHeader).getTime() / 1000);
          resolve(serverTs);
        } else {
          resolve(Math.floor(Date.now() / 1000));
        }
        res.resume();
      }
    );
    probe.on('error', () => resolve(Math.floor(Date.now() / 1000)));
    probe.setTimeout(5000, () => {
      probe.destroy();
      resolve(Math.floor(Date.now() / 1000));
    });
    probe.end();
  });
}

/**
 * Étape 2 : Vérifier et activer la clé auprès de l'API Dominosoft
 */
async function verifyDominosoftKey(licenseKey) {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { success: false, error: 'Veuillez saisir une clé d\'activation.' };
  }

  const key = licenseKey.trim();
  if (!key) {
    return { success: false, error: 'La clé d\'activation ne peut pas être vide.' };
  }

  // 1. Obtenir le timestamp exact
  const ts = await getDominosoftTimestamp();

  // 2. Signer le message avec HMAC-SHA256
  const message = `${key}:${ts}`;
  const sig = crypto.createHmac('sha256', VERIFY_SECRET).update(message).digest('hex');

  // 3. Encoder le payload en Base64
  const rawPayload = { k: key, ts: ts, sig: sig };
  const base64Payload = Buffer.from(JSON.stringify(rawPayload)).toString('base64');
  const body = JSON.stringify({
    payload: base64Payload,
    meta: { v: 1 }
  });

  // 4. Envoyer la requête POST à l'API Dominosoft
  return new Promise((resolve) => {
    const req = https.request(
      API_URL,
      {
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'ElcApp/1.0',
          'Accept': 'application/json'
        }
      },
      (res) => {
        let chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(responseBody);
          } catch (e) {}

          const isValid = json && (json.status === 'ok' || json.status === 'valid' || !!json.token);
          let reason = '';
          if (json) {
            if (json.reason) reason = json.reason;
            else if (json.message) reason = json.message;
            else if (json.error) reason = json.error;
            else if (json.status === 'invalid') reason = 'Clé d\'activation invalide ou introuvable.';
            else if (json.status === 'expired') reason = 'Cette clé d\'activation a expiré.';
            else if (json.status === 'revoked') reason = 'Cette clé d\'activation a été révoquée.';
          } else {
            reason = responseBody;
          }

          if (isValid) {
            // 5. Enregistrer le flag d'activation local
            try {
              const flagPath = getFlagPath();
              const dirPath = path.dirname(flagPath);
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
              }

              const flagData = JSON.stringify({
                activated: true,
                key: key,
                token: json.token || '',
                software: json.software || '',
                client: json.client || '',
                activatedAt: Date.now()
              }, null, 2);

              fs.writeFileSync(flagPath, flagData, 'utf8');
              console.log('[Dominosoft Activation] ✅ Flag d\'activation enregistré avec succès dans:', flagPath);
            } catch (fsErr) {
              console.error('[Dominosoft Activation] ⚠️ Erreur lors de l\'enregistrement du flag:', fsErr);
            }

            resolve({
              success: true,
              client: json.client || '',
              software: json.software || '',
              token: json.token || ''
            });
          } else {
            console.warn('[Dominosoft Activation] ❌ Échec de vérification:', reason || `Code HTTP ${res.statusCode}`);
            resolve({
              success: false,
              error: reason || `Erreur d'activation (Code HTTP ${res.statusCode})`
            });
          }
        });
      }
    );

    req.on('error', (e) => {
      console.error('[Dominosoft Activation] ❌ Erreur réseau:', e.message);
      resolve({ success: false, error: `Erreur réseau : ${e.message}` });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, error: 'Le serveur Dominosoft ne répond pas (Timeout 15s)' });
    });

    req.write(body);
    req.end();
  });
}

/**
 * Redémarre l'application après activation
 */
function relaunchApp() {
  try {
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error('Erreur redémarrage:', err);
  }
}

module.exports = {
  checkActivationStatus,
  getDemoInfo,
  checkProductLimit,
  checkVenteLimit,
  verifyDominosoftKey,
  getDominosoftTimestamp,
  relaunchApp,
  getFlagPath,
  getDemoFilePath,
  MAX_DEMO_PRODUCTS,
  MAX_DEMO_VENTES,
  DEMO_DURATION_DAYS
};
