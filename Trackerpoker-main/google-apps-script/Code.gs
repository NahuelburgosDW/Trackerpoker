/**
 * PokerTracker — Google Sheets backend (Sheet MAESTRO)
 *
 * SETUP REGISTRO DE USUARIOS:
 * 1. Este script va en TU Google Sheet maestro (base de datos de usuarios)
 * 2. Extensions → Apps Script → pegá este código completo
 * 3. Ejecutá setupRegistry() una vez (crea pestaña "Users")
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copiá la URL /exec en VITE_REGISTRY_SCRIPT_URL del .env
 *
 * La pestaña Users guarda: id | email | displayName | passwordHash | slug | pokerSheetId | pokerSheetUrl | createdAt
 */

var SHEETS = {
  USERS: 'Users',
  PLAYER: 'Player',
  TOURNAMENTS: 'Tournaments',
  IMPORT_LOG: 'ImportLog',
  CONFIG: 'Config',
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'data';

  if (action === 'data') {
    return jsonResponse({
      ok: true,
      player: readPlayer_(),
      tournaments: readTournaments_(),
      importLogs: readImportLogs_(),
      meta: readMeta_(),
    });
  }

  if (action === 'health') {
    return jsonResponse({ ok: true, status: 'connected' });
  }

  if (action === 'registryHealth') {
    var usersSheet = getSheet_(SHEETS.USERS);
    var count = 0;
    if (usersSheet && usersSheet.getLastRow() > 1) {
      count = usersSheet.getLastRow() - 1;
    }
    return jsonResponse({
      ok: true,
      registry: true,
      usersTab: Boolean(usersSheet),
      usersCount: count,
      version: 2,
      features: ['registerAccount', 'login', 'linkPokerSheet'],
    });
  }

  if (action === 'lookupUser') {
    var user = null;
    if (e.parameter.slug) user = findUserBySlug_(e.parameter.slug);
    if (!user && e.parameter.email) user = findUserByEmail_(e.parameter.email);
    if (user) user = toPublicUser_(user);
    return jsonResponse({ ok: true, user: user });
  }

  if (action === 'listUsers') {
    var users = readUsers_().map(toPublicUser_);
    return jsonResponse({ ok: true, users: users });
  }

  if (action === 'registerAccount') {
    var reg = registerAccount_({
      email: e.parameter.email,
      password: e.parameter.password,
      slug: e.parameter.slug,
    });
    if (!reg.ok) return jsonResponse(reg, 400);
    return jsonResponse(reg);
  }

  if (action === 'login') {
    var loginResult = login_(
      e.parameter.identifier || e.parameter.email || '',
      e.parameter.password || ''
    );
    if (!loginResult.ok) return jsonResponse(loginResult, 401);
    return jsonResponse(loginResult);
  }

  if (action === 'linkPokerSheet') {
    var linkResult = linkPokerSheet_(
      e.parameter.userId,
      e.parameter.pokerSheetId,
      e.parameter.pokerSheetUrl || ''
    );
    if (!linkResult.ok) return jsonResponse(linkResult, 400);
    return jsonResponse(linkResult);
  }

  // Legacy
  if (action === 'registerUser') {
    var legacyPayload = {
      email: e.parameter.email,
      displayName: e.parameter.displayName,
      password: e.parameter.password || 'legacy',
      slug: e.parameter.slug,
      pokerSheetId: e.parameter.pokerSheetId || '',
      pokerSheetUrl: e.parameter.pokerSheetUrl || '',
    };
    var legacyResult = registerAccount_(legacyPayload);
    if (!legacyResult.ok) return jsonResponse(legacyResult, 400);
    return jsonResponse(legacyResult);
  }

  return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
  }

  var action = body.action;

  // Registro / login público (sin token admin)
  if (action === 'registerAccount') {
    var regPost = registerAccount_(body);
    if (!regPost.ok) return jsonResponse(regPost, 400);
    return jsonResponse(regPost);
  }

  if (action === 'login') {
    var loginPost = login_(body.identifier || body.email || '', body.password || '');
    if (!loginPost.ok) return jsonResponse(loginPost, 401);
    return jsonResponse(loginPost);
  }

  if (action === 'linkPokerSheet') {
    var linkPost = linkPokerSheet_(body.userId, body.pokerSheetId, body.pokerSheetUrl || '');
    if (!linkPost.ok) return jsonResponse(linkPost, 400);
    return jsonResponse(linkPost);
  }

  if (action === 'registerUser') {
    var result = registerAccount_(body.user || body);
    if (!result.ok) return jsonResponse(result, 400);
    return jsonResponse(result);
  }

  var token = getAdminToken_(e);
  if (!tokenValid_(token)) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (action === 'updatePlayer') {
    writePlayer_(body.player);
    touchSync_();
    return jsonResponse({ ok: true, player: readPlayer_() });
  }

  if (action === 'upsertTournaments') {
    var result = upsertTournaments_(body.tournaments || []);
    touchSync_();
    return jsonResponse({ ok: true, result: result });
  }

  if (action === 'deleteTournament') {
    deleteTournament_(body.id);
    touchSync_();
    return jsonResponse({ ok: true });
  }

  if (action === 'logImport') {
    appendImportLog_(body.log);
    touchSync_();
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
}

// ─── Read ────────────────────────────────────────────────────────────────────

function readPlayer_() {
  var sheet = getSheet_(SHEETS.PLAYER);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var row = sheet.getRange(2, 1, 1, 12).getValues()[0];
  return {
    id: String(row[0] || 'player-1'),
    nickname: String(row[1] || ''),
    realName: String(row[2] || ''),
    country: String(row[3] || ''),
    countryCode: String(row[4] || ''),
    countryFlag: String(row[5] || ''),
    room: String(row[6] || ''),
    bio: String(row[7] || ''),
    gameTypes: String(row[8] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    startedAt: formatDate_(row[9]),
    createdAt: formatDate_(row[10]),
    avatarInitials: String(row[11] || ''),
  };
}

function readTournaments_() {
  var sheet = getSheet_(SHEETS.TOURNAMENTS);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  return rows
    .filter(function (row) { return row[0]; })
    .map(function (row) {
      return {
        id: String(row[0]),
        playerId: String(row[1] || 'player-1'),
        date: formatDate_(row[2]),
        name: String(row[3] || ''),
        buyIn: Number(row[4]) || 0,
        position: Number(row[5]) || 0,
        players: Number(row[6]) || 0,
        prize: Number(row[7]) || 0,
        gameType: String(row[8] || 'MTT'),
      };
    })
    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
}

function readImportLogs_() {
  var sheet = getSheet_(SHEETS.IMPORT_LOG);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return rows
    .filter(function (row) { return row[0]; })
    .map(function (row) {
      return {
        id: String(row[0]),
        fileName: String(row[1] || ''),
        processedAt: formatDate_(row[2]),
        found: Number(row[3]) || 0,
        newCount: Number(row[4]) || 0,
        duplicates: Number(row[5]) || 0,
        errors: Number(row[6]) || 0,
        status: String(row[7] || 'success'),
      };
    })
    .sort(function (a, b) { return new Date(b.processedAt) - new Date(a.processedAt); });
}

function readMeta_() {
  var sheet = getSheet_(SHEETS.CONFIG);
  var meta = { connected: true, lastSync: null };
  if (!sheet || sheet.getLastRow() < 2) return meta;

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  rows.forEach(function (row) {
    if (row[0] === 'lastSync') meta.lastSync = formatDate_(row[1]);
  });
  return meta;
}

// ─── Write ───────────────────────────────────────────────────────────────────

function writePlayer_(player) {
  var sheet = getSheet_(SHEETS.PLAYER);
  ensurePlayerHeaders_(sheet);
  sheet.getRange(2, 1, 1, 12).setValues([[
    player.id || 'player-1',
    player.nickname || '',
    player.realName || '',
    player.country || '',
    player.countryCode || '',
    player.countryFlag || '',
    player.room || '',
    player.bio || '',
    (player.gameTypes || []).join(', '),
    player.startedAt || '',
    player.createdAt || new Date().toISOString(),
    player.avatarInitials || '',
  ]]);
}

function upsertTournaments_(tournaments) {
  var sheet = getSheet_(SHEETS.TOURNAMENTS);
  ensureTournamentHeaders_(sheet);

  var existing = readTournaments_();
  var existingIds = {};
  existing.forEach(function (t) { existingIds[t.id] = true; });

  var newCount = 0;
  var duplicates = 0;

  tournaments.forEach(function (t) {
    if (existingIds[t.id]) {
      duplicates++;
      return;
    }
    sheet.appendRow([
      t.id,
      t.playerId || 'player-1',
      t.date,
      t.name,
      t.buyIn,
      t.position,
      t.players,
      t.prize,
      t.gameType,
    ]);
    existingIds[t.id] = true;
    newCount++;
  });

  return { found: tournaments.length, newCount: newCount, duplicates: duplicates, errors: 0 };
}

function deleteTournament_(id) {
  var sheet = getSheet_(SHEETS.TOURNAMENTS);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function appendImportLog_(log) {
  var sheet = getSheet_(SHEETS.IMPORT_LOG);
  ensureImportLogHeaders_(sheet);
  sheet.appendRow([
    log.id || Utilities.getUuid(),
    log.fileName || '',
    log.processedAt || new Date().toISOString(),
    log.found || 0,
    log.newCount || 0,
    log.duplicates || 0,
    log.errors || 0,
    log.status || 'success',
  ]);
}

function touchSync_() {
  var sheet = getSheet_(SHEETS.CONFIG);
  if (!sheet) return;
  ensureConfigHeaders_(sheet);
  var now = new Date().toISOString();
  var data = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'lastSync') {
      sheet.getRange(i + 1, 2).setValue(now);
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow(['lastSync', now]);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function formatDate_(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function jsonResponse(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAdminToken_(e) {
  if (e.parameter && e.parameter.token) return e.parameter.token;
  if (e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      if (body.token) return body.token;
    } catch (err) { /* ignore */ }
  }
  return '';
}

function tokenValid_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  return expected && token === expected;
}

function ensurePlayerHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'nickname', 'realName', 'country', 'countryCode', 'countryFlag', 'room', 'bio', 'gameTypes', 'startedAt', 'createdAt', 'avatarInitials']);
  }
}

function ensureTournamentHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'playerId', 'date', 'name', 'buyIn', 'position', 'players', 'prize', 'gameType']);
  }
}

function ensureImportLogHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'fileName', 'processedAt', 'found', 'newCount', 'duplicates', 'errors', 'status']);
  }
}

function ensureConfigHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['key', 'value']);
  }
}

/** Ejecutá una vez para crear la pestaña Users (base de datos de jugadores) */
function setupRegistry() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) sheet = ss.insertSheet(SHEETS.USERS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'email', 'displayName', 'passwordHash', 'slug', 'pokerSheetId', 'pokerSheetUrl', 'createdAt']);
  }
  Logger.log('Registry Users tab ready');
}

function hashPassword_(password) {
  var salt = PropertiesService.getScriptProperties().getProperty('AUTH_SALT');
  if (!salt) {
    salt = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('AUTH_SALT', salt);
  }
  var raw = salt + ':' + password;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function verifyPassword_(password, hash) {
  if (!hash) return false;
  return hashPassword_(password) === hash;
}

function readUsers_() {
  var sheet = getSheet_(SHEETS.USERS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return rows.filter(function (r) { return r[0]; }).map(rowToUser_);
}

function rowToUser_(row) {
  return {
    id: String(row[0]),
    email: String(row[1] || ''),
    displayName: String(row[2] || ''),
    passwordHash: String(row[3] || ''),
    slug: String(row[4] || ''),
    pokerSheetId: String(row[5] || ''),
    pokerSheetUrl: String(row[6] || ''),
    createdAt: String(row[7] || ''),
  };
}

function toPublicUser_(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.slug,
    slug: user.slug,
    pokerSheetId: user.pokerSheetId || '',
    pokerSheetUrl: user.pokerSheetUrl || '',
    createdAt: user.createdAt,
  };
}

function findUserBySlug_(slug) {
  var users = readUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].slug === slug) return users[i];
  }
  return null;
}

function findUserByGoogleId_(googleId) {
  return null;
}

function findUserByEmail_(email) {
  var users = readUsers_();
  var normalized = String(email).trim().toLowerCase();
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].email).toLowerCase() === normalized) return users[i];
  }
  return null;
}

function findUserByIdentifier_(identifier) {
  if (!identifier) return null;
  var email = String(identifier).trim().toLowerCase();
  var byEmail = findUserByEmail_(email);
  if (byEmail) return byEmail;
  var slug = String(identifier).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return findUserBySlug_(slug);
}

function registerAccount_(data) {
  if (!data || !data.email || !data.password || !data.slug) {
    return { ok: false, error: 'Email, contraseña y usuario son obligatorios' };
  }

  if (String(data.password).length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  var slug = String(data.slug).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!slug) return { ok: false, error: 'Usuario inválido (solo letras, números y guiones)' };

  var email = String(data.email).trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) {
    return { ok: false, error: 'Email inválido' };
  }

  if (findUserByEmail_(email)) {
    return { ok: false, error: 'Este email ya está registrado' };
  }
  if (findUserBySlug_(slug)) {
    return { ok: false, error: 'Este usuario (@' + slug + ') ya está en uso' };
  }

  var sheet = getSheet_(SHEETS.USERS);
  if (!sheet) {
    setupRegistry();
    sheet = getSheet_(SHEETS.USERS);
  }

  var id = Utilities.getUuid();
  var createdAt = new Date().toISOString();
  var pokerSheetId = data.pokerSheetId ? String(data.pokerSheetId) : '';
  var pokerSheetUrl = data.pokerSheetUrl ? String(data.pokerSheetUrl) : '';

  sheet.appendRow([
    id,
    email,
    slug,
    hashPassword_(String(data.password)),
    slug,
    pokerSheetId,
    pokerSheetUrl,
    createdAt,
  ]);

  return {
    ok: true,
    user: toPublicUser_({
      id: id,
      email: email,
      displayName: slug,
      passwordHash: '',
      slug: slug,
      pokerSheetId: pokerSheetId,
      pokerSheetUrl: pokerSheetUrl,
      createdAt: createdAt,
    }),
  };
}

function login_(identifier, password) {
  if (!identifier || !password) {
    return { ok: false, error: 'Usuario y contraseña son obligatorios' };
  }

  var user = findUserByIdentifier_(identifier);
  if (!user || !verifyPassword_(password, user.passwordHash)) {
    return { ok: false, error: 'Usuario o contraseña incorrectos' };
  }

  return { ok: true, user: toPublicUser_(user) };
}

function linkPokerSheet_(userId, pokerSheetId, pokerSheetUrl) {
  if (!userId || !pokerSheetId) {
    return { ok: false, error: 'Falta userId o link del Sheet' };
  }

  var sheet = getSheet_(SHEETS.USERS);
  if (!sheet) return { ok: false, error: 'Registry no inicializado' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      sheet.getRange(i + 1, 6).setValue(String(pokerSheetId));
      sheet.getRange(i + 1, 7).setValue(pokerSheetUrl || '');
      var user = rowToUser_(sheet.getRange(i + 1, 1, 1, 8).getValues()[0]);
      return { ok: true, user: toPublicUser_(user) };
    }
  }

  return { ok: false, error: 'Usuario no encontrado' };
}

function registerUser_(user) {
  return registerAccount_({
    email: user.email,
    password: user.password || 'changeme1',
    slug: user.slug,
    pokerSheetId: user.pokerSheetId,
    pokerSheetUrl: user.pokerSheetUrl,
  });
}

/** Ejecutá una vez desde el editor para crear las pestañas iniciales */
function setupSheet() {
  setupRegistry();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [SHEETS.PLAYER, SHEETS.TOURNAMENTS, SHEETS.IMPORT_LOG, SHEETS.CONFIG].forEach(function (name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });

  writePlayer_({
    id: 'player-1',
    nickname: 'Jugador',
    realName: 'Demo Player',
    country: 'Argentina',
    countryCode: 'AR',
    countryFlag: '🇦🇷',
    room: 'GGPoker',
    bio: 'MTT & Spin & Gold Player',
    gameTypes: ['MTT', 'Spin & Gold'],
    startedAt: '2024-03-14',
    createdAt: new Date().toISOString(),
    avatarInitials: 'JP',
  });

  touchSync_();
  Logger.log('Sheet setup complete');
}

/**
 * Registro manual de prueba — ejecutá desde el editor (Run ▶)
 * Editá los valores abajo, corré la función, mirá la pestaña Users.
 */
function registerTestUser() {
  setupRegistry();
  var result = registerAccount_({
    email: 'tu-email@gmail.com',
    password: 'demo1234',
    slug: 'demo',
    pokerSheetId: '1VA-fLXpqY12A6rdFiE6Y3x1KWRoNpy8qdkAI67jOTz4',
    pokerSheetUrl: 'https://docs.google.com/spreadsheets/d/1VA-fLXpqY12A6rdFiE6Y3x1KWRoNpy8qdkAI67jOTz4/edit',
  });
  Logger.log(JSON.stringify(result));
}
