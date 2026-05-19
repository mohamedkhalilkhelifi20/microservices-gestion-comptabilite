# Description des Bases de Données

> La plateforme utilise deux technologies de stockage distinctes, choisies selon la nature
> des données gérées par chaque microservice.
>
> | Service | Technologie | Type | Persistance |
> |---------|-------------|------|-------------|
> | MS1 — Identity | SQLite 3 | Relationnel | ✅ Sur disque |
> | MS2 — Document | RxDB (in-memory) | NoSQL Document | ❌ En mémoire |
> | MS3 — Analytics | RxDB (in-memory) | NoSQL Document | ❌ En mémoire |

---

## Table des matières

1. [MS1 — SQLite](#1-ms1--sqlite)
   - [Justification du choix](#11-justification-du-choix)
   - [Configuration & initialisation](#12-configuration--initialisation)
   - [Schéma complet](#13-schéma-complet)
   - [Contraintes d'intégrité](#14-contraintes-dintégrité)
   - [Requêtes principales](#15-requêtes-principales)
2. [MS2 — RxDB](#2-ms2--rxdb)
   - [Justification du choix](#21-justification-du-choix)
   - [Configuration & initialisation](#22-configuration--initialisation)
   - [Schéma des collections](#23-schéma-des-collections)
   - [Opérations principales](#24-opérations-principales)
3. [MS3 — RxDB](#3-ms3--rxdb)
   - [Justification du choix](#31-justification-du-choix)
   - [Configuration & initialisation](#32-configuration--initialisation)
   - [Schéma des collections](#33-schéma-des-collections)
   - [Opérations principales](#34-opérations-principales)
4. [Comparaison des deux technologies](#4-comparaison-des-deux-technologies)

---

## 1. MS1 — SQLite

**Fichier de base de données :** `ms1_identity.sqlite`  
**Localisation :** répertoire racine du service MS1  
**Driver Node.js :** `sqlite` + `sqlite3`  
**Version SQLite :** 3.x

---

### 1.1 Justification du choix

MS1 gère les entités identitaires de la plateforme : cabinets, comptables, clients et
assignations. Ces entités ont trois caractéristiques qui orientent naturellement vers
une base de données **relationnelle** :

**Relations strictes entre entités**

Un `Comptable` appartient obligatoirement à un `Cabinet`. Un `Client` appartient
obligatoirement à un `Cabinet`. Une `Assignation` lie obligatoirement un `Comptable`
à un `Client`. Ces relations ne sont pas optionnelles — elles font partie de la
définition même des entités. SQLite exprime ces contraintes nativement avec des
`FOREIGN KEY`, et les fait respecter au niveau de la base de données, pas uniquement
dans le code applicatif.

**Besoin de transactions ACID**

La création d'une assignation doit être atomique : soit elle réussit complètement,
soit elle échoue complètement. SQLite garantit cette propriété par défaut. Si
l'insertion échoue à mi-chemin (panne réseau, contrainte violée), le rollback est
automatique et la base reste dans un état cohérent.

**Persistance obligatoire**

Les données identitaires (qui est quel comptable, à quel cabinet appartient quel client,
quelles assignations sont actives) doivent survivre aux redémarrages du service. SQLite
écrit sur disque nativement, sans serveur externe. Le fichier `.sqlite` est embarqué
dans le processus Node.js.

**Volume modéré et lectures fréquentes**

MS1 stocke des données de référence qui changent peu mais sont consultées très
fréquemment — MS2 interroge MS1 à chaque création de facture ou déclaration pour
vérifier l'existence du client, du comptable et de leur assignation. SQLite est
optimisé pour ce profil de charge : peu d'écritures, beaucoup de lectures.

---

### 1.2 Configuration & initialisation

SQLite est initialisé au démarrage de MS1 via un **singleton** : la base n'est ouverte
qu'une seule fois, et la même instance est réutilisée pour toutes les requêtes suivantes.

```javascript
// Pattern singleton utilisé dans database.js
let dbInstance = null;

async function initDatabase() {
    if (dbInstance) return dbInstance;  // Instance déjà créée → la retourner

    dbInstance = await open({
        filename: path.join(__dirname, 'ms1_identity.sqlite'),
        driver:   sqlite3.Database,
    });

    await dbInstance.run('PRAGMA foreign_keys = ON');  // Activer les clés étrangères
    // Création des tables si elles n'existent pas...

    return dbInstance;
}
```

**Points importants :**

- `PRAGMA foreign_keys = ON` : SQLite désactive les clés étrangères par défaut.
  Cette commande les active explicitement à chaque connexion — sans elle, les
  contraintes `FOREIGN KEY` seraient ignorées silencieusement.
- `CREATE TABLE IF NOT EXISTS` : les tables ne sont créées que si elles n'existent
  pas encore. Au redémarrage du service, les données existantes sont conservées.
- Le fichier `.sqlite` est créé automatiquement s'il n'existe pas.

---

### 1.3 Schéma complet

#### Table `cabinets`

```sql
CREATE TABLE IF NOT EXISTS cabinets (
    id         TEXT PRIMARY KEY,        -- UUID v4 généré par l'application
    nom        TEXT NOT NULL,           -- Nom du cabinet (obligatoire)
    adresse    TEXT,                    -- Adresse physique (optionnel)
    email      TEXT UNIQUE NOT NULL,    -- Email unique du cabinet
    telephone  TEXT,                    -- Numéro de téléphone (optionnel)
    created_at TEXT NOT NULL            -- Date de création ISO 8601
);
```

**Colonnes détaillées**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 généré par `uuid.v4()` |
| `nom` | TEXT | NOT NULL | Nom du cabinet |
| `adresse` | TEXT | — | Adresse physique, peut être NULL |
| `email` | TEXT | UNIQUE NOT NULL | Email unique — une tentative d'insertion avec un email existant retourne une erreur `SQLITE_CONSTRAINT` |
| `telephone` | TEXT | — | Numéro de téléphone, peut être NULL |
| `created_at` | TEXT | NOT NULL | Timestamp ISO 8601 : `2025-01-15T10:30:00.000Z` |

---

#### Table `comptables`

```sql
CREATE TABLE IF NOT EXISTS comptables (
    id             TEXT PRIMARY KEY,        -- UUID v4
    nom            TEXT NOT NULL,
    email          TEXT UNIQUE NOT NULL,
    telephone      TEXT,
    specialite     TEXT NOT NULL,           -- fiscal | audit | paie | juridique
    cabinet_id     TEXT NOT NULL,           -- Référence vers cabinets.id
    ordre_ordinal  TEXT,                    -- Numéro ordre experts-comptables
    numero_licence TEXT,                    -- Numéro de licence professionnelle
    created_at     TEXT NOT NULL,
    FOREIGN KEY (cabinet_id) REFERENCES cabinets(id)
);
```

**Colonnes détaillées**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `nom` | TEXT | NOT NULL | Nom complet du comptable |
| `email` | TEXT | UNIQUE NOT NULL | Email unique |
| `telephone` | TEXT | — | Optionnel |
| `specialite` | TEXT | NOT NULL | Domaine : `fiscal` `audit` `paie` `juridique` |
| `cabinet_id` | TEXT | NOT NULL + FK | Référence vers `cabinets.id` — le cabinet doit exister |
| `ordre_ordinal` | TEXT | — | Numéro d'inscription à l'ordre des experts-comptables |
| `numero_licence` | TEXT | — | Numéro de licence professionnelle |
| `created_at` | TEXT | NOT NULL | Timestamp ISO 8601 |

**Contrainte clé étrangère :**
`FOREIGN KEY (cabinet_id) REFERENCES cabinets(id)` — impossible de créer un comptable
avec un `cabinet_id` qui n'existe pas dans la table `cabinets`.

---

#### Table `clients`

```sql
CREATE TABLE IF NOT EXISTS clients (
    id               TEXT PRIMARY KEY,
    nom              TEXT NOT NULL,
    email            TEXT UNIQUE NOT NULL,
    telephone        TEXT,
    type             TEXT NOT NULL,         -- societe | patente | personne_physique
    matricule_fiscal TEXT,                  -- Identifiant fiscal tunisien
    cabinet_id       TEXT NOT NULL,
    adresse          TEXT,
    created_at       TEXT NOT NULL,
    FOREIGN KEY (cabinet_id) REFERENCES cabinets(id)
);
```

**Colonnes détaillées**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `nom` | TEXT | NOT NULL | Nom de l'entreprise ou du professionnel |
| `email` | TEXT | UNIQUE NOT NULL | Email unique |
| `telephone` | TEXT | — | Optionnel |
| `type` | TEXT | NOT NULL | Nature juridique : `societe` `patente` `personne_physique` |
| `matricule_fiscal` | TEXT | — | Identifiant fiscal tunisien — optionnel à la création |
| `cabinet_id` | TEXT | NOT NULL + FK | Référence vers `cabinets.id` |
| `adresse` | TEXT | — | Optionnel |
| `created_at` | TEXT | NOT NULL | Timestamp ISO 8601 |

---

#### Table `comptable_client` (Assignations)

```sql
CREATE TABLE IF NOT EXISTS comptable_client (
    id           TEXT PRIMARY KEY,
    comptable_id TEXT NOT NULL,
    client_id    TEXT NOT NULL,
    specialite   TEXT NOT NULL,             -- Spécialité de l'assignation
    date_debut   TEXT NOT NULL,             -- Date de début ISO 8601
    statut       TEXT NOT NULL DEFAULT 'actif',  -- actif | inactif
    FOREIGN KEY (comptable_id) REFERENCES comptables(id),
    FOREIGN KEY (client_id)    REFERENCES clients(id),
    UNIQUE (comptable_id, client_id, specialite)
);
```

**Colonnes détaillées**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `comptable_id` | TEXT | NOT NULL + FK | Référence vers `comptables.id` |
| `client_id` | TEXT | NOT NULL + FK | Référence vers `clients.id` |
| `specialite` | TEXT | NOT NULL | Spécialité de l'assignation |
| `date_debut` | TEXT | NOT NULL | Date de début de l'assignation ISO 8601 |
| `statut` | TEXT | NOT NULL DEFAULT 'actif' | État : `actif` ou `inactif` |

**Contraintes clés étrangères :**
- `FOREIGN KEY (comptable_id) REFERENCES comptables(id)` — le comptable doit exister.
- `FOREIGN KEY (client_id) REFERENCES clients(id)` — le client doit exister.

**Contrainte d'unicité métier :**
`UNIQUE (comptable_id, client_id, specialite)` — un même comptable ne peut pas être
assigné deux fois au même client pour la même spécialité. L'opération utilise
`INSERT OR REPLACE` pour gérer le cas d'une réassignation.

---

### 1.4 Contraintes d'intégrité

Le schéma de MS1 garantit les règles suivantes au niveau de la base de données,
indépendamment du code applicatif :

| Contrainte | Table | Effet |
|------------|-------|-------|
| `PRIMARY KEY` | Toutes | Unicité et indexation automatique des IDs |
| `NOT NULL` | Champs obligatoires | Rejet de tout enregistrement incomplet |
| `UNIQUE` sur `email` | `cabinets`, `comptables`, `clients` | Impossibilité de créer deux entités avec le même email |
| `FOREIGN KEY cabinet_id` | `comptables`, `clients` | Impossibilité de créer un comptable ou client sans cabinet existant |
| `FOREIGN KEY comptable_id` | `comptable_client` | Impossibilité d'assigner un comptable inexistant |
| `FOREIGN KEY client_id` | `comptable_client` | Impossibilité d'assigner un client inexistant |
| `UNIQUE (comptable_id, client_id, specialite)` | `comptable_client` | Pas de doublon d'assignation pour le même triplet |

---

### 1.5 Requêtes principales

#### Création d'un cabinet

```sql
INSERT INTO cabinets (id, nom, adresse, email, telephone, created_at)
VALUES (?, ?, ?, ?, ?, ?);
```

#### Récupération d'un comptable avec son cabinet

```sql
SELECT c.*, cab.nom AS cabinet_nom
FROM comptables c
LEFT JOIN cabinets cab ON c.cabinet_id = cab.id
WHERE c.id = ?;
```

La colonne `cabinet_nom` est obtenue via `LEFT JOIN` et renvoyée directement dans la
réponse gRPC — le client n'a pas besoin d'effectuer une deuxième requête pour obtenir
le nom du cabinet.

#### Récupération d'un client avec son cabinet

```sql
SELECT cl.*, cab.nom AS cabinet_nom
FROM clients cl
LEFT JOIN cabinets cab ON cl.cabinet_id = cab.id
WHERE cl.id = ?;
```

#### Vérification d'une assignation active (appelée par MS2)

```sql
SELECT cc.*, c.nom AS comptable_nom, c.email AS comptable_email
FROM comptable_client cc
LEFT JOIN comptables c ON cc.comptable_id = c.id
WHERE cc.client_id = ? AND cc.statut = 'actif'
ORDER BY cc.date_debut DESC;
```

MS2 utilise ce résultat pour vérifier qu'une assignation active existe entre le client
et le comptable avant de créer une facture ou une déclaration.

#### Création d'une assignation (upsert)

```sql
INSERT OR REPLACE INTO comptable_client
(id, comptable_id, client_id, specialite, date_debut, statut)
VALUES (?, ?, ?, ?, ?, ?);
```

`INSERT OR REPLACE` : si un enregistrement avec le même triplet
`(comptable_id, client_id, specialite)` existe déjà (grâce à la contrainte `UNIQUE`),
il est remplacé par le nouvel enregistrement. Cela permet de réactiver une assignation
précédemment désactivée.

---

## 2. MS2 — RxDB

**Nom de la base :** `ms2_documents`  
**Storage :** `getRxStorageMemory()` — données en mémoire vive  
**Validation :** `wrappedValidateAjvStorage` — validation JSON Schema via AJV  
**Collections :** `factures`, `declarations`  
**Driver Node.js :** `rxdb` v15.x

---

### 2.1 Justification du choix

MS2 gère des **documents comptables** : factures et déclarations. Ces documents ont des
caractéristiques très différentes des entités relationnelles de MS1 :

**Documents autonomes et auto-contenus**

Une facture contient toutes ses informations directement : `client_nom` est dénormalisé
dans le document, les montants `tva_montant` et `montant_ttc` sont calculés et stockés.
Il n'y a pas besoin de JOIN pour afficher une facture complète — elle est un document
autonome. Ce modèle est naturellement NoSQL.

**Schéma semi-flexible avec champs conditionnels**

Les champs `signature_hash`, `signed_by` et `signed_at` n'ont de valeur que quand la
facture est signée. En SQLite, ces colonnes seraient NULL la plupart du temps. Avec RxDB
et JSON Schema, ces champs ont une valeur par défaut vide `""` et sont complétés
uniquement lors de la signature — plus expressif et plus naturel.

**API entièrement asynchrone**

Toutes les opérations RxDB retournent des `Promise` : `insert()`, `findOne().exec()`,
`patch()`, `remove()`. Le code MS2 est entièrement en `async/await` — RxDB s'intègre
sans friction dans cet écosystème, contrairement à SQLite qui nécessite un wrapper
`Promise` manuel.

**Requêtes Mango Query simples**

Les cas d'usage de MS2 sont simples : trouver toutes les factures d'un client, trier
par date. La syntaxe `{ selector: { client_id }, sort: [{ created_at: 'desc' }] }` est
directe et lisible.

---

### 2.2 Configuration & initialisation

```javascript
// Pattern singleton dans database.js
let dbInstance = null;

async function initDatabase() {
    if (dbInstance) return dbInstance;

    // Mode développement : activation du plugin de débogage
    if (process.env.NODE_ENV !== 'production') {
        addRxPlugin(RxDBDevModePlugin);
    }

    const db = await createRxDatabase({
        name:            'ms2_documents',
        storage:         wrappedValidateAjvStorage({
            storage: getRxStorageMemory(),  // Stockage en mémoire vive
        }),
        ignoreDuplicate: true,  // Permet la réinitialisation sans erreur
    });

    await db.addCollections({
        factures:     { schema: factureSchema },
        declarations: { schema: declarationSchema },
    });

    dbInstance = db;
    return dbInstance;
}
```

**Points importants :**

- `getRxStorageMemory()` : les données sont stockées en mémoire vive. Elles sont
  perdues à chaque redémarrage du service. Ce choix est cohérent avec la nature
  des documents comptables qui sont régénérés depuis les événements Kafka.
- `wrappedValidateAjvStorage` : chaque document est validé contre son schéma JSON
  avant insertion. Une facture sans `montant_ht` par exemple sera rejetée avec
  une erreur de validation claire.
- `RxDBDevModePlugin` : en développement, RxDB ajoute des vérifications
  supplémentaires et des messages d'erreur plus détaillés.

---

### 2.3 Schéma des collections

#### Collection `factures`

```javascript
const factureSchema = {
    version:    0,           // Version du schéma — à incrémenter si migration
    primaryKey: 'id',        // Champ utilisé comme identifiant unique
    type:       'object',
    properties: {
        id:             { type: 'string', maxLength: 36 },  // UUID v4
        type:           { type: 'string' },  // standard | steg | sonede | ...
        numero:         { type: 'string' },  // STD-20250115-4823
        client_id:      { type: 'string' },
        client_nom:     { type: 'string' },  // Dénormalisé
        comptable_id:   { type: 'string' },
        montant_ht:     { type: 'number' },
        tva_rate:       { type: 'number' },  // 7.0 | 13.0 | 19.0
        tva_montant:    { type: 'number' },  // Calculé automatiquement
        montant_ttc:    { type: 'number' },  // Calculé automatiquement
        statut:         { type: 'string' },  // brouillon | validee | signee | ...
        signature_hash: { type: 'string', default: '' },
        signed_by:      { type: 'string', default: '' },
        signed_at:      { type: 'string', default: '' },
        details_json:   { type: 'string' },  // JSON stringifié
        created_at:     { type: 'string' },  // ISO 8601
    },
    required: [
        'id', 'type', 'numero', 'client_id', 'client_nom',
        'comptable_id', 'montant_ht', 'tva_rate', 'montant_ttc',
        'statut', 'details_json', 'created_at'
    ],
};
```

**Description des champs**

| Champ | Type JSON | Requis | Description |
|-------|-----------|--------|-------------|
| `id` | string | ✅ | UUID v4 — primaryKey |
| `type` | string | ✅ | Type de facture |
| `numero` | string | ✅ | Numéro unique généré automatiquement |
| `client_id` | string | ✅ | UUID du client |
| `client_nom` | string | ✅ | Nom du client — dénormalisé pour éviter les appels MS1 |
| `comptable_id` | string | ✅ | UUID du comptable |
| `montant_ht` | number | ✅ | Montant hors taxe |
| `tva_rate` | number | ✅ | Taux TVA appliqué |
| `tva_montant` | number | ✅ | TVA calculée — `montant_ht × tva_rate / 100` |
| `montant_ttc` | number | ✅ | TTC calculé — `montant_ht + tva_montant` |
| `statut` | string | ✅ | État courant dans le cycle de vie |
| `signature_hash` | string | ❌ | Hash SHA-256 (vide si non signé) |
| `signed_by` | string | ❌ | UUID du comptable signataire |
| `signed_at` | string | ❌ | Timestamp de la signature |
| `details_json` | string | ✅ | Métadonnées JSON stringifiées |
| `created_at` | string | ✅ | Timestamp de création ISO 8601 |

---

#### Collection `declarations`

```javascript
const declarationSchema = {
    version:    0,
    primaryKey: 'id',
    type:       'object',
    properties: {
        id:           { type: 'string', maxLength: 36 },
        client_id:    { type: 'string' },
        client_nom:   { type: 'string' },   // Dénormalisé
        comptable_id: { type: 'string' },
        type:         { type: 'string' },   // TVA | IS | IRPP | CNSS
        periode:      { type: 'string' },   // YYYY-MM
        montant:      { type: 'number' },
        statut:       { type: 'string' },   // brouillon | soumise | validee
        validated_by: { type: 'string', default: '' },
        validated_at: { type: 'string', default: '' },
        created_at:   { type: 'string' },
    },
    required: [
        'id', 'client_id', 'client_nom', 'comptable_id',
        'type', 'periode', 'montant', 'statut', 'created_at'
    ],
};
```

**Description des champs**

| Champ | Type JSON | Requis | Description |
|-------|-----------|--------|-------------|
| `id` | string | ✅ | UUID v4 — primaryKey |
| `client_id` | string | ✅ | UUID du client |
| `client_nom` | string | ✅ | Nom du client — dénormalisé |
| `comptable_id` | string | ✅ | UUID du comptable |
| `type` | string | ✅ | Nature fiscale : `TVA` `IS` `IRPP` `CNSS` |
| `periode` | string | ✅ | Période — format `YYYY-MM` |
| `montant` | number | ✅ | Montant de la déclaration |
| `statut` | string | ✅ | État : `brouillon` `soumise` `validee` |
| `validated_by` | string | ❌ | UUID du comptable validateur |
| `validated_at` | string | ❌ | Timestamp de la validation |
| `created_at` | string | ✅ | Timestamp de création ISO 8601 |

---

### 2.4 Opérations principales

#### Insertion d'une facture

```javascript
const rxDoc = await db.factures.insert(doc);
return rxDoc.toJSON();  // Conversion en objet JavaScript plain
```

#### Recherche par ID (primaryKey)

```javascript
const doc = await db.factures.findOne(invoice_id).exec();
if (!doc) throw new Error(`Facture non trouvée : ${invoice_id}`);
return doc.toJSON();
```

#### Recherche par client avec tri

```javascript
const docs = await db.factures.find({
    selector: { client_id: 'uuid-client' },
    sort:     [{ created_at: 'desc' }],
}).exec();
return docs.map(d => d.toJSON());
```

#### Mise à jour partielle (patch)

```javascript
// Seuls les champs fournis dans patch sont modifiés
await doc.patch({ statut: 'validee' });

// Relecture obligatoire après patch pour obtenir les valeurs à jour
const updated = await db.factures.findOne(invoice_id).exec();
return updated.toJSON();
```

> **Important :** après un `patch()`, l'objet `doc` original n'est pas
> automatiquement mis à jour. Il faut relire le document depuis RxDB pour
> obtenir les valeurs à jour.

#### Vérification d'unicité métier (déclaration)

```javascript
// Un seul brouillon par (client_id, type, periode)
const existing = await db.declarations.findOne({
    selector: { client_id, type, periode, statut: 'brouillon' },
}).exec();
if (existing) throw new Error(`Déclaration déjà en brouillon...`);
```

#### Suppression d'un document

```javascript
await doc.remove();
```

---

## 3. MS3 — RxDB

**Nom de la base :** `ms3_analytics`  
**Storage :** `getRxStorageMemory()` — données en mémoire vive  
**Validation :** `wrappedValidateAjvStorage`  
**Collections :** `alertes`, `reports`, `stats`, `audit_logs`  
**Driver Node.js :** `rxdb` v15.x

---

### 3.1 Justification du choix

MS3 est un service **analytique et réactif**. Ses données sont produites exclusivement
par le consumer Kafka — aucun utilisateur n'écrit directement dans MS3. Ce profil
d'usage est différent de MS2 et justifie également RxDB :

**Écriture pilotée par événements**

Toutes les insertions dans MS3 sont déclenchées par des messages Kafka. Le consumer
traite les messages séquentiellement et insère des documents RxDB. Ce pattern est
naturellement adapté à une API basée sur les Promises.

**Hétérogénéité des documents**

MS3 stocke quatre types de documents très différents : alertes, rapports, statistiques,
audit logs. Chacun a son propre schéma JSON. Les regrouper dans une base SQL commune
aurait nécessité soit une table par type (4 tables avec peu de liens entre elles), soit
une table générique avec des colonnes JSON — autant utiliser directement un NoSQL.

**Lecture intensive pour le dashboard**

La query `dashboard` lit en parallèle depuis les quatre collections RxDB via
`Promise.all`. Ce pattern est plus naturel avec l'API async de RxDB qu'avec des
requêtes SQL séquentielles.

**Upsert des statistiques**

Le calcul des KPIs mensuels nécessite un upsert : si une `Stat` existe pour
`(client_id, periode)`, on la met à jour ; sinon, on l'insère. RxDB gère cela
nativement avec `findOne().exec()` suivi de `patch()` ou `insert()`.

---

### 3.2 Configuration & initialisation

```javascript
let db = null;

async function initDatabase() {
    if (db) return db;

    db = await createRxDatabase({
        name:            'ms3_analytics',
        storage:         wrappedValidateAjvStorage({
            storage: getRxStorageMemory(),
        }),
        ignoreDuplicate: true,
    });

    await db.addCollections({
        alertes:    { schema: alerteSchema },
        reports:    { schema: reportSchema },
        stats:      { schema: statSchema },
        audit_logs: { schema: auditLogSchema },
    });

    console.log('[MS3] RxDB initialisée — 4 collections : alertes, reports, stats, audit_logs');
    return db;
}
```

---

### 3.3 Schéma des collections

#### Collection `alertes`

```javascript
const alerteSchema = {
    version:    0,
    primaryKey: 'id',
    type:       'object',
    properties: {
        id:          { type: 'string', maxLength: 36 },
        client_id:   { type: 'string' },
        type:        { type: 'string' },             // echeance | impayee | anomalie
        message:     { type: 'string' },
        severity:    { type: 'string' },             // info | warning | critical
        entity_id:   { type: 'string', default: '' },
        entity_type: { type: 'string', default: '' },// facture | declaration
        is_read:     { type: 'boolean', default: false },
        created_at:  { type: 'string' },
    },
    required: ['id', 'client_id', 'type', 'message', 'severity', 'created_at'],
};
```

**Description des champs**

| Champ | Type JSON | Requis | Valeurs | Description |
|-------|-----------|--------|---------|-------------|
| `id` | string | ✅ | UUID v4 | primaryKey |
| `client_id` | string | ✅ | UUID | Client concerné |
| `type` | string | ✅ | `echeance` `impayee` `anomalie` | Nature de l'alerte |
| `message` | string | ✅ | — | Message descriptif |
| `severity` | string | ✅ | `info` `warning` `critical` | Niveau d'urgence |
| `entity_id` | string | ❌ | UUID | ID de l'entité concernée |
| `entity_type` | string | ❌ | `facture` `declaration` | Type de l'entité |
| `is_read` | boolean | ✅ | `true` `false` | Lu ou non par l'utilisateur |
| `created_at` | string | ✅ | ISO 8601 | Timestamp de création |

---

#### Collection `reports`

```javascript
const reportSchema = {
    version:    0,
    primaryKey: 'id',
    type:       'object',
    properties: {
        id:         { type: 'string', maxLength: 36 },
        client_id:  { type: 'string' },
        type:       { type: 'string' },   // financier | fiscal | tresorerie
        periode:    { type: 'string' },   // 2025-Q1 | 2025-01
        statut:     { type: 'string' },   // genere | valide | archive
        contenu:    { type: 'string', default: '{}' }, // JSON stringifié
        created_at: { type: 'string' },
    },
    required: ['id', 'client_id', 'type', 'periode', 'statut', 'created_at'],
};
```

**Description des champs**

| Champ | Type JSON | Requis | Valeurs | Description |
|-------|-----------|--------|---------|-------------|
| `id` | string | ✅ | UUID v4 | primaryKey |
| `client_id` | string | ✅ | UUID | Client concerné |
| `type` | string | ✅ | `financier` `fiscal` `tresorerie` | Nature du rapport |
| `periode` | string | ✅ | `YYYY-Q{n}` ou `YYYY-MM` | Période couverte |
| `statut` | string | ✅ | `genere` `valide` `archive` | État du rapport |
| `contenu` | string | ❌ | JSON stringifié | Données enrichies depuis MS1/MS2 |
| `created_at` | string | ✅ | ISO 8601 | Timestamp de création |

---

#### Collection `stats`

```javascript
const statSchema = {
    version:    0,
    primaryKey: 'id',
    type:       'object',
    properties: {
        id:               { type: 'string', maxLength: 36 },
        client_id:        { type: 'string' },
        periode:          { type: 'string' },         // YYYY-MM
        chiffre_affaires: { type: 'number', default: 0 },
        total_charges:    { type: 'number', default: 0 },
        tva_nette:        { type: 'number', default: 0 },
        resultat_net:     { type: 'number', default: 0 },
        nb_factures:      { type: 'integer', default: 0 },
        nb_declarations:  { type: 'integer', default: 0 },
        created_at:       { type: 'string' },
    },
    required: ['id', 'client_id', 'periode', 'created_at'],
};
```

**Description des champs**

| Champ | Type JSON | Requis | Description |
|-------|-----------|--------|-------------|
| `id` | string | ✅ | UUID v4 — primaryKey |
| `client_id` | string | ✅ | UUID du client |
| `periode` | string | ✅ | Mois concerné — format `YYYY-MM` |
| `chiffre_affaires` | number | ❌ | Somme des `montant_ht` des factures du mois |
| `total_charges` | number | ❌ | Somme des montants des déclarations du mois |
| `tva_nette` | number | ❌ | Somme des `tva_montant` des factures du mois |
| `resultat_net` | number | ❌ | `chiffre_affaires - total_charges` — calculé automatiquement |
| `nb_factures` | integer | ❌ | Nombre de factures créées ce mois |
| `nb_declarations` | integer | ❌ | Nombre de déclarations soumises ce mois |
| `created_at` | string | ✅ | Timestamp de création ISO 8601 |

---

#### Collection `audit_logs`

```javascript
const auditLogSchema = {
    version:    0,
    primaryKey: 'id',
    type:       'object',
    properties: {
        id:           { type: 'string', maxLength: 36 },
        client_id:    { type: 'string' },
        action:       { type: 'string' }, // create|update|delete|submit|validate|sign|pay
        entity_type:  { type: 'string' }, // facture|declaration|user|assignation
        entity_id:    { type: 'string' },
        performed_by: { type: 'string' }, // UUID comptable ou "system"
        details:      { type: 'string', default: '{}' }, // JSON stringifié
        created_at:   { type: 'string' },
    },
    required: [
        'id', 'client_id', 'action', 'entity_type',
        'entity_id', 'performed_by', 'created_at'
    ],
};
```

**Description des champs**

| Champ | Type JSON | Requis | Valeurs | Description |
|-------|-----------|--------|---------|-------------|
| `id` | string | ✅ | UUID v4 | primaryKey |
| `client_id` | string | ✅ | UUID | Client concerné |
| `action` | string | ✅ | `create` `update` `delete` `submit` `validate` `sign` `pay` | Action effectuée |
| `entity_type` | string | ✅ | `facture` `declaration` `user` `assignation` | Type d'entité |
| `entity_id` | string | ✅ | UUID | ID de l'entité concernée |
| `performed_by` | string | ✅ | UUID ou `"system"` | Acteur de l'action |
| `details` | string | ❌ | JSON stringifié | Contexte de l'action |
| `created_at` | string | ✅ | ISO 8601 | Timestamp de création |

---

### 3.4 Opérations principales

#### Insertion d'une alerte

```javascript
const doc = { id: uuidv4(), client_id, type, message, severity,
              entity_id, entity_type, is_read: false,
              created_at: new Date().toISOString() };

await db.alertes.insert(doc);
const rxDoc = await db.alertes.findOne(doc.id).exec();
return rxDoc.toJSON();
```

#### Upsert des statistiques mensuelles

```javascript
const existing = await db.stats.findOne({
    selector: { client_id, periode },
}).exec();

if (existing) {
    // Mise à jour des KPIs existants
    await existing.patch({
        chiffre_affaires: existing.chiffre_affaires + montant_ht,
        tva_nette:        existing.tva_nette + tva_montant,
        nb_factures:      existing.nb_factures + 1,
        resultat_net:     (existing.chiffre_affaires + montant_ht) - existing.total_charges,
    });
    const updated = await db.stats.findOne(existing.id).exec();
    return updated.toJSON();
} else {
    // Création d'une nouvelle stat pour cette période
    const doc = { id: uuidv4(), client_id, periode, chiffre_affaires: montant_ht,
                  tva_nette: tva_montant, nb_factures: 1, total_charges: 0,
                  nb_declarations: 0, resultat_net: montant_ht,
                  created_at: new Date().toISOString() };
    await db.stats.insert(doc);
    const rxDoc = await db.stats.findOne(doc.id).exec();
    return rxDoc.toJSON();
}
```

#### Lecture du dashboard (4 collections en parallèle)

```javascript
const [statsRes, alertesRes, reportsRes, auditRes] = await Promise.all([
    db.stats.find({ selector: { client_id } }).exec(),
    db.alertes.find({ selector: { client_id }, sort: [{ created_at: 'desc' }] }).exec(),
    db.reports.find({ selector: { client_id } }).exec(),
    db.audit_logs.find({ selector: { client_id } }).exec(),
]);

return {
    client_id,
    stats:      statsRes.map(d => d.toJSON()),
    alertes:    alertesRes.map(d => d.toJSON()),
    reports:    reportsRes.map(d => d.toJSON()),
    audit_logs: auditRes.map(d => d.toJSON()),
};
```

---

## 4. Comparaison des deux technologies

| Critère | SQLite (MS1) | RxDB (MS2, MS3) |
|---------|-------------|-----------------|
| **Type** | Relationnel | NoSQL orienté documents |
| **Persistance** | Sur disque — survit aux redémarrages | En mémoire — perdu au redémarrage |
| **Relations** | Clés étrangères natives | Pas de relations — documents autonomes |
| **Contraintes** | FOREIGN KEY, UNIQUE, NOT NULL au niveau DB | JSON Schema AJV au niveau applicatif |
| **Transactions** | ACID natives | Opérations atomiques par document |
| **API Node.js** | Callbacks wrappés en Promise | Promises et Observables RxJS natifs |
| **Requêtes** | SQL standard | Mango Query `{ selector, sort }` |
| **Cas d'usage** | Données stables, fortement liées, volume modéré | Documents hétérogènes, écritures fréquentes, lecture intensive |
| **Validation** | Contraintes SQL | JSON Schema via AJV |
| **Adapté pour** | Identités, relations M:N, intégrité référentielle | Documents comptables, analytics, événements Kafka |
