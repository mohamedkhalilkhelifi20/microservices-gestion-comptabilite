# Description des Endpoints REST

> L'API REST est exposée par l'**API Gateway** sur le port **3000**.  
> Toutes les requêtes et réponses utilisent le format **JSON**.  
> En-tête obligatoire sur toutes les requêtes avec body : `Content-Type: application/json`

---

## Table des matières

1. [Conventions](#1-conventions)
2. [MS1 — Identity Service](#2-ms1--identity-service)
   - [Cabinets](#21-cabinets)
   - [Comptables](#22-comptables)
   - [Clients](#23-clients)
   - [Assignations](#24-assignations)
3. [MS2 — Document Service](#3-ms2--document-service)
   - [Factures](#31-factures)
   - [Déclarations fiscales](#32-déclarations-fiscales)
4. [MS3 — Analytics Service](#4-ms3--analytics-service)
   - [Alertes](#41-alertes)
   - [Rapports](#42-rapports)
   - [Statistiques](#43-statistiques)
   - [Audit Logs](#44-audit-logs)
   - [Dashboard](#45-dashboard)

---

## 1. Conventions

### Codes HTTP utilisés

| Code | Signification | Cas d'usage |
|------|--------------|-------------|
| `200` | OK | Requête réussie (GET, PUT) |
| `201` | Created | Ressource créée avec succès (POST) |
| `400` | Bad Request | Données invalides ou règle métier non respectée |
| `404` | Not Found | Ressource introuvable |
| `409` | Conflict | Ressource déjà existante (email en doublon, etc.) |
| `500` | Internal Server Error | Erreur serveur inattendue |
| `503` | Service Unavailable | Microservice cible indisponible |

### Format des erreurs

Toutes les erreurs retournent un objet JSON avec le champ `error` :

```json
{
  "error": "Description de l'erreur"
}
```

### Identifiants

Tous les `id` sont des **UUID v4** générés automatiquement par le service.  
Format : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

### Champ `created_at`

Toutes les ressources incluent un champ `created_at` au format **ISO 8601** :  
`2025-01-15T10:30:00.000Z`

---

## 2. MS1 — Identity Service

Base URL : `http://localhost:3000/api`

---

### 2.1 Cabinets

Un cabinet est la structure comptable qui regroupe des comptables certifiés.

---

#### `POST /api/cabinets`

Crée un nouveau cabinet.

**Body**

```json
{
  "nom":       "Cabinet Expertise Comptable",
  "email":     "contact@cabinet.tn",
  "adresse":   "Lac 2, Tunis",
  "telephone": "+216 71 000 000"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `nom` | string | ✅ | Nom du cabinet |
| `email` | string | ✅ | Email unique du cabinet |
| `adresse` | string | ❌ | Adresse physique |
| `telephone` | string | ❌ | Numéro de téléphone |

**Réponse `201 Created`**

```json
{
  "id":         "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "nom":        "Cabinet Expertise Comptable",
  "email":      "contact@cabinet.tn",
  "adresse":    "Lac 2, Tunis",
  "telephone":  "+216 71 000 000",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `409` | `ALREADY_EXISTS` | Un cabinet avec cet email existe déjà |
| `500` | `Internal Server Error` | Erreur base de données |

---

#### `GET /api/cabinets`

Retourne la liste de tous les cabinets, triés par nom.

**Réponse `200 OK`**

```json
[
  {
    "id":         "a1b2c3d4-...",
    "nom":        "Cabinet Expertise Comptable",
    "email":      "contact@cabinet.tn",
    "adresse":    "Lac 2, Tunis",
    "telephone":  "+216 71 000 000",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

---

#### `GET /api/cabinets/:id`

Retourne un cabinet par son identifiant.

**Paramètre URL**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Identifiant du cabinet |

**Réponse `200 OK`**

```json
{
  "id":         "a1b2c3d4-...",
  "nom":        "Cabinet Expertise Comptable",
  "email":      "contact@cabinet.tn",
  "adresse":    "Lac 2, Tunis",
  "telephone":  "+216 71 000 000",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Cabinet non trouvé : {id}` | Cabinet inexistant |

---

### 2.2 Comptables

Un comptable est un expert certifié rattaché à un cabinet.

---

#### `POST /api/comptables`

Crée un nouveau comptable. Le `cabinet_id` doit exister dans MS1.

**Body**

```json
{
  "nom":            "Ahmed Ben Ali",
  "email":          "ahmed@cabinet.tn",
  "telephone":      "+216 99 000 001",
  "specialite":     "fiscal",
  "cabinet_id":     "a1b2c3d4-...",
  "ordre_ordinal":  "OEC-2025",
  "numero_licence": "LIC-2025-001"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `nom` | string | ✅ | — |
| `email` | string | ✅ | Email unique |
| `telephone` | string | ❌ | — |
| `specialite` | string | ✅ | `fiscal` `audit` `paie` `juridique` |
| `cabinet_id` | UUID | ✅ | Cabinet existant |
| `ordre_ordinal` | string | ❌ | Numéro ordre des experts-comptables |
| `numero_licence` | string | ❌ | Numéro de licence professionnelle |

**Réponse `201 Created`**

```json
{
  "id":             "b2c3d4e5-...",
  "nom":            "Ahmed Ben Ali",
  "email":          "ahmed@cabinet.tn",
  "telephone":      "+216 99 000 001",
  "specialite":     "fiscal",
  "cabinet_id":     "a1b2c3d4-...",
  "cabinet_nom":    "Cabinet Expertise Comptable",
  "ordre_ordinal":  "OEC-2025",
  "numero_licence": "LIC-2025-001",
  "created_at":     "2025-01-15T10:31:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Cabinet non trouvé : {id}` | `cabinet_id` inexistant |
| `409` | `ALREADY_EXISTS` | Email déjà utilisé |

---

#### `GET /api/comptables`

Retourne la liste de tous les comptables avec leur cabinet associé, triés par nom.

**Réponse `200 OK`** — tableau d'objets Comptable (même structure que la réponse POST).

---

#### `GET /api/comptables/:id`

Retourne un comptable par son identifiant.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Comptable non trouvé : {id}` | Comptable inexistant |

---

#### `GET /api/comptables/specialite/:specialite`

Retourne tous les comptables d'une spécialité donnée.

**Paramètre URL**

| Paramètre | Valeurs acceptées |
|-----------|-------------------|
| `specialite` | `fiscal` `audit` `paie` `juridique` |

**Réponse `200 OK`** — tableau d'objets Comptable filtrés par spécialité.

---

### 2.3 Clients

Un client est une entreprise ou un professionnel utilisant la plateforme.

---

#### `POST /api/clients`

Crée un nouveau client. Le `cabinet_id` doit exister dans MS1.  
La création publie automatiquement l'événement Kafka `user.created`.

**Body**

```json
{
  "nom":              "SARL TechTunisie",
  "email":            "contact@techtunisie.tn",
  "telephone":        "+216 71 000 002",
  "type":             "societe",
  "matricule_fiscal": "1234567/A/M/000",
  "cabinet_id":       "a1b2c3d4-...",
  "adresse":          "Lac 2, Tunis"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `nom` | string | ✅ | — |
| `email` | string | ✅ | Email unique |
| `telephone` | string | ❌ | — |
| `type` | string | ✅ | `societe` `patente` `personne_physique` |
| `matricule_fiscal` | string | ❌ | Matricule fiscal tunisien |
| `cabinet_id` | UUID | ✅ | Cabinet existant |
| `adresse` | string | ❌ | — |

**Réponse `201 Created`**

```json
{
  "id":               "c3d4e5f6-...",
  "nom":              "SARL TechTunisie",
  "email":            "contact@techtunisie.tn",
  "telephone":        "+216 71 000 002",
  "type":             "societe",
  "matricule_fiscal": "1234567/A/M/000",
  "cabinet_id":       "a1b2c3d4-...",
  "cabinet_nom":      "Cabinet Expertise Comptable",
  "adresse":          "Lac 2, Tunis",
  "created_at":       "2025-01-15T10:32:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Cabinet non trouvé : {id}` | `cabinet_id` inexistant |
| `409` | `ALREADY_EXISTS` | Email déjà utilisé |

---

#### `GET /api/clients`

Retourne la liste de tous les clients avec leur cabinet associé, triés par nom.

---

#### `GET /api/clients/:id`

Retourne un client par son identifiant.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Client non trouvé : {id}` | Client inexistant |

---

### 2.4 Assignations

Une assignation lie un comptable à un client avec une spécialité donnée.  
Elle est **obligatoire** avant toute création de facture ou déclaration dans MS2.

---

#### `POST /api/assignations`

Crée une assignation entre un comptable et un client.  
Publie automatiquement l'événement Kafka `comptable.assigned`.

> Si une assignation avec les mêmes `(comptable_id, client_id, specialite)` existe déjà, elle est remplacée (`INSERT OR REPLACE`).

**Body**

```json
{
  "comptable_id": "b2c3d4e5-...",
  "client_id":    "c3d4e5f6-...",
  "specialite":   "fiscal"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `comptable_id` | UUID | ✅ | Comptable existant dans MS1 |
| `client_id` | UUID | ✅ | Client existant dans MS1 |
| `specialite` | string | ✅ | `fiscal` `audit` `paie` `juridique` |

**Réponse `201 Created`**

```json
{
  "assignation": {
    "id":           "d4e5f6a7-...",
    "comptable_id": "b2c3d4e5-...",
    "client_id":    "c3d4e5f6-...",
    "specialite":   "fiscal",
    "date_debut":   "2025-01-15T10:33:00.000Z",
    "statut":       "actif"
  }
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Comptable non trouvé : {id}` | `comptable_id` inexistant |
| `404` | `Client non trouvé : {id}` | `client_id` inexistant |

---

#### `GET /api/assignations/client/:client_id`

Retourne toutes les assignations actives d'un client, triées par date de début décroissante.

**Réponse `200 OK`**

```json
[
  {
    "id":           "d4e5f6a7-...",
    "comptable_id": "b2c3d4e5-...",
    "client_id":    "c3d4e5f6-...",
    "specialite":   "fiscal",
    "date_debut":   "2025-01-15T10:33:00.000Z",
    "statut":       "actif"
  }
]
```

---

## 3. MS2 — Document Service

Base URL : `http://localhost:3000/api`

> **Prérequis pour toutes les opérations de création :** une assignation active doit exister entre le `client_id` et le `comptable_id` dans MS1. MS2 vérifie cette condition via gRPC avant toute insertion.

---

### 3.1 Factures

#### Cycle de vie d'une facture

```
brouillon ──→ validee ──→ envoyee ──→ payee
                    ↘               ↗
                     signee ───────
```

- Les montants et détails ne sont modifiables qu'en statut `brouillon`.
- La signature est possible uniquement depuis le statut `validee`.
- Le statut `payee` est un état final — aucune transition possible.

---

#### `POST /api/invoices`

Crée une nouvelle facture en statut `brouillon`.  
Publie automatiquement l'événement Kafka `invoice.created`.

**Body**

```json
{
  "type":         "standard",
  "client_id":    "c3d4e5f6-...",
  "client_nom":   "SARL TechTunisie",
  "comptable_id": "b2c3d4e5-...",
  "montant_ht":   1000.000,
  "tva_rate":     19.0,
  "details_json": "{\"description\": \"Consultation fiscale Q1 2025\"}"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `type` | string | ✅ | Type de facture (`standard` `steg` `sonede` `internet` `loyer` `honoraires`) |
| `client_id` | UUID | ✅ | Client existant dans MS1 |
| `client_nom` | string | ✅ | Nom du client (dénormalisé) |
| `comptable_id` | UUID | ✅ | Comptable assigné au client |
| `montant_ht` | number | ✅ | Montant hors taxe |
| `tva_rate` | number | ✅ | Taux TVA : `7.0` `13.0` `19.0` |
| `details_json` | string | ✅ | Détails JSON stringifié |

**Calcul automatique**

```
tva_montant = montant_ht × tva_rate / 100  (arrondi 3 décimales)
montant_ttc = montant_ht + tva_montant     (arrondi 3 décimales)
numero      = {TYPE_3}-{YYYYMMDD}-{RAND4}  ex: STD-20250115-4823
```

**Réponse `201 Created`**

```json
{
  "id":             "e5f6a7b8-...",
  "type":           "standard",
  "numero":         "STD-20250115-4823",
  "client_id":      "c3d4e5f6-...",
  "client_nom":     "SARL TechTunisie",
  "comptable_id":   "b2c3d4e5-...",
  "montant_ht":     1000.000,
  "tva_rate":       19.0,
  "tva_montant":    190.000,
  "montant_ttc":    1190.000,
  "statut":         "brouillon",
  "signature_hash": "",
  "signed_by":      "",
  "signed_at":      "",
  "details_json":   "{\"description\": \"Consultation fiscale Q1 2025\"}",
  "created_at":     "2025-01-15T10:34:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Client non trouvé` | `client_id` inexistant dans MS1 |
| `404` | `Comptable non trouvé` | `comptable_id` inexistant dans MS1 |
| `400` | `Aucune assignation active` | Assignation manquante entre client et comptable |

---

#### `GET /api/invoices`

Retourne toutes les factures, triées par date de création décroissante.

**Réponse `200 OK`** — tableau d'objets Invoice.

---

#### `GET /api/invoices/:id`

Retourne une facture par son identifiant.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Facture non trouvée : {id}` | Facture inexistante |

---

#### `GET /api/invoices/client/:client_id`

Retourne toutes les factures d'un client, triées par date de création décroissante.

**Réponse `200 OK`** — tableau d'objets Invoice filtrés par `client_id`.

---

#### `PUT /api/invoices/:id`

Modifie une facture existante. Deux types de modification possibles :

**1 — Changer le statut**

```json
{
  "statut": "validee"
}
```

Transitions autorisées selon le statut actuel :

| Statut actuel | Transitions possibles |
|---------------|----------------------|
| `brouillon` | `validee` |
| `validee` | `envoyee` `payee` |
| `signee` | `envoyee` `payee` |
| `envoyee` | `payee` |
| `payee` | aucune |

**2 — Modifier les montants** (statut `brouillon` uniquement)

```json
{
  "montant_ht":   1200.000,
  "tva_rate":     19.0,
  "details_json": "{\"description\": \"Consultation fiscale Q1 2025 — révisé\"}"
}
```

> Les montants `tva_montant` et `montant_ttc` sont recalculés automatiquement.

**Réponse `200 OK`** — objet Invoice mis à jour.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Facture non trouvée : {id}` | Facture inexistante |
| `400` | `Transition invalide : "{actuel}" → "{cible}"` | Transition de statut non autorisée |
| `400` | `Impossible de modifier les montants — statut : "{statut}"` | Modification hors brouillon |
| `400` | `Aucun champ à modifier fourni` | Body vide ou invalide |

---

#### `PUT /api/invoices/:id/sign`

Signe une facture avec un hash SHA-256. La facture doit être en statut `validee`.  
Publie automatiquement l'événement Kafka `invoice.signed`.

> Une assignation active entre le `client_id` de la facture et le `comptable_id` est vérifiée avant la signature.

**Body**

```json
{
  "comptable_id": "b2c3d4e5-..."
}
```

**Réponse `200 OK`**

```json
{
  "success":        true,
  "signature_hash": "a3f9c2d8e1b4f7a2c5d9e3b6f8a1c4d7e2b5f9a3c6d8e1b4...",
  "signed_at":      "2025-01-15T11:00:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Facture non trouvée : {id}` | Facture inexistante |
| `400` | `Facture déjà signée` | Facture en statut `signee` |
| `400` | `Facture en brouillon` | Doit être validée avant signature |
| `400` | `Impossible de signer — statut "{statut}"` | Statut `payee` ou `envoyee` |
| `400` | `Aucune assignation active` | Comptable non assigné au client |

---

#### `DELETE /api/invoices/:id`

Supprime une facture. Seules les factures en statut `brouillon` peuvent être supprimées.

**Réponse `200 OK`**

```json
{
  "success": true,
  "message": "Facture {id} supprimée avec succès"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Facture non trouvée : {id}` | Facture inexistante |
| `400` | `Impossible de supprimer — statut : "{statut}"` | Facture hors statut brouillon |

---

### 3.2 Déclarations fiscales

#### Cycle de vie d'une déclaration

```
brouillon ──→ soumise ──→ validee
```

- Un seul brouillon par triplet `(client_id, type, periode)`.
- Seul un brouillon est modifiable et supprimable.
- La validation nécessite une assignation active vérifiée dans MS1.

---

#### `POST /api/invoices/declarations`

Crée une nouvelle déclaration en statut `brouillon`.  
Publie automatiquement l'événement Kafka `declaration.submitted`.

**Body**

```json
{
  "client_id":    "c3d4e5f6-...",
  "client_nom":   "SARL TechTunisie",
  "comptable_id": "b2c3d4e5-...",
  "type":         "TVA",
  "periode":      "2025-01",
  "montant":      3570.000
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `client_id` | UUID | ✅ | Client existant dans MS1 |
| `client_nom` | string | ✅ | Nom du client (dénormalisé) |
| `comptable_id` | UUID | ✅ | Comptable assigné au client |
| `type` | string | ✅ | `TVA` `IS` `IRPP` `CNSS` |
| `periode` | string | ✅ | Format `YYYY-MM` (ex: `2025-01`) |
| `montant` | number | ✅ | Montant de la déclaration |

**Réponse `201 Created`**

```json
{
  "id":           "f6a7b8c9-...",
  "client_id":    "c3d4e5f6-...",
  "client_nom":   "SARL TechTunisie",
  "comptable_id": "b2c3d4e5-...",
  "type":         "TVA",
  "periode":      "2025-01",
  "montant":      3570.000,
  "statut":       "brouillon",
  "validated_by": "",
  "validated_at": "",
  "created_at":   "2025-01-15T11:10:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `400` | `Déclaration TVA déjà en brouillon pour ... période 2025-01` | Doublon métier |
| `400` | `Aucune assignation active` | Assignation manquante |
| `404` | `Client non trouvé` | `client_id` inexistant |

---

#### `GET /api/invoices/declarations`

Retourne toutes les déclarations, triées par date de création décroissante.

---

#### `GET /api/invoices/declarations/:id`

Retourne une déclaration par son identifiant.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Déclaration non trouvée : {id}` | Déclaration inexistante |

---

#### `GET /api/invoices/declarations/client/:client_id`

Retourne toutes les déclarations d'un client, triées par date de création décroissante.

---

#### `PUT /api/invoices/declarations/:id`

Modifie le montant ou la période d'une déclaration en statut `brouillon` uniquement.

**Body**

```json
{
  "montant": 4200.000,
  "periode": "2025-02"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `montant` | number | ❌ | Nouveau montant (> 0) |
| `periode` | string | ❌ | Nouvelle période (format `YYYY-MM`) |

> Au moins un des deux champs doit être fourni.

**Réponse `200 OK`** — objet Declaration mis à jour.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Déclaration non trouvée : {id}` | Déclaration inexistante |
| `400` | `Impossible de modifier — statut : "{statut}"` | Hors statut brouillon |
| `400` | `Déclaration TVA déjà en brouillon pour la période 2025-02` | Conflit de période |
| `400` | `Aucun champ à modifier fourni` | Body vide |

---

#### `PUT /api/invoices/declarations/:id/validate`

Valide une déclaration — passe son statut à `validee`.  
Publie automatiquement l'événement Kafka `declaration.validated`.

> Une assignation active entre le client de la déclaration et le `comptable_id` est vérifiée avant la validation.

**Body**

```json
{
  "comptable_id": "b2c3d4e5-..."
}
```

**Réponse `200 OK`**

```json
{
  "id":           "f6a7b8c9-...",
  "statut":       "validee",
  "validated_by": "b2c3d4e5-...",
  "validated_at": "2025-01-15T11:30:00.000Z"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Déclaration non trouvée : {id}` | Déclaration inexistante |
| `400` | `Déclaration déjà validée` | Statut déjà `validee` |
| `400` | `Aucune assignation active` | Comptable non assigné au client |

---

#### `DELETE /api/invoices/declarations/:id`

Supprime une déclaration en statut `brouillon` uniquement.

**Réponse `200 OK`**

```json
{
  "success": true,
  "message": "Déclaration {id} supprimée avec succès"
}
```

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Déclaration non trouvée : {id}` | Déclaration inexistante |
| `400` | `Impossible de supprimer — statut : "{statut}"` | Hors statut brouillon |

---

## 4. MS3 — Analytics Service

Base URL : `http://localhost:3000/api/analytics`

> MS3 est un service **principalement en lecture**. La majorité de ses données sont créées automatiquement par le consumer Kafka en réaction aux événements de MS1 et MS2. Les endpoints d'écriture (`POST`) sont disponibles pour les cas manuels.

---

### 4.1 Alertes

Une alerte est une notification métier générée automatiquement par Kafka.

---

#### `POST /api/analytics/alertes`

Crée une alerte manuellement.

**Body**

```json
{
  "client_id":   "c3d4e5f6-...",
  "type":        "echeance",
  "message":     "Déclaration TVA due avant le 28 janvier 2025",
  "severity":    "warning",
  "entity_id":   "f6a7b8c9-...",
  "entity_type": "declaration"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `client_id` | UUID | ✅ | — |
| `type` | string | ✅ | `echeance` `impayee` `anomalie` |
| `message` | string | ✅ | Message descriptif |
| `severity` | string | ✅ | `info` `warning` `critical` |
| `entity_id` | string | ❌ | ID de l'entité concernée |
| `entity_type` | string | ❌ | `facture` `declaration` |

**Réponse `201 Created`**

```json
{
  "id":          "a7b8c9d0-...",
  "client_id":   "c3d4e5f6-...",
  "type":        "echeance",
  "message":     "Déclaration TVA due avant le 28 janvier 2025",
  "severity":    "warning",
  "entity_id":   "f6a7b8c9-...",
  "entity_type": "declaration",
  "is_read":     false,
  "created_at":  "2025-01-15T12:00:00.000Z"
}
```

---

#### `GET /api/analytics/alertes`

Retourne toutes les alertes, triées par date de création décroissante.

---

#### `GET /api/analytics/alertes/client/:client_id`

Retourne toutes les alertes d'un client, triées par date de création décroissante.

---

### 4.2 Rapports

Un rapport est un document financier ou fiscal généré pour un client, enrichi automatiquement avec les données de MS1 (infos client) et MS2 (factures, déclarations).

---

#### `POST /api/analytics/reports`

Crée un rapport. MS3 interroge automatiquement MS1 et MS2 via gRPC pour enrichir le contenu.

**Body**

```json
{
  "client_id":      "c3d4e5f6-...",
  "type":           "fiscal",
  "periode":        "2025-Q1",
  "contenu":        "{}"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `client_id` | UUID | ✅ | — |
| `type` | string | ✅ | `financier` `fiscal` `tresorerie` |
| `periode` | string | ✅ | Ex: `2025-Q1` `2025-01` |
| `contenu` | string | ❌ | JSON stringifié (enrichi automatiquement) |

**Réponse `201 Created`**

```json
{
  "id":         "b8c9d0e1-...",
  "client_id":  "c3d4e5f6-...",
  "type":       "fiscal",
  "periode":    "2025-Q1",
  "statut":     "genere",
  "contenu":    "{\"client\":{\"id\":\"...\",\"nom\":\"SARL TechTunisie\",...}}",
  "created_at": "2025-01-15T12:10:00.000Z"
}
```

---

#### `GET /api/analytics/reports`

Retourne tous les rapports.

---

#### `GET /api/analytics/reports/:id`

Retourne un rapport par son identifiant.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Rapport introuvable : {id}` | Rapport inexistant |

---

#### `GET /api/analytics/reports/client/:client_id`

Retourne tous les rapports d'un client.

---

#### `PUT /api/analytics/reports/:id`

Modifie le statut ou le contenu d'un rapport.

**Body**

```json
{
  "statut":  "valide",
  "contenu": "{\"client\":{...}, \"synthese\":\"...\"}"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|-------|------|-------------|-------------------|
| `statut` | string | ❌ | `genere` `valide` `archive` |
| `contenu` | string | ❌ | JSON stringifié |

**Réponse `200 OK`** — objet Report mis à jour.

---

#### `DELETE /api/analytics/reports/:id`

Supprime un rapport.

**Réponse `200 OK`**

```json
{
  "success": true,
  "message": "Rapport {id} supprimé avec succès"
}
```

---

### 4.3 Statistiques

Les statistiques (KPIs) sont calculées et mises à jour **automatiquement** par le consumer Kafka à chaque événement `invoice.created` ou `declaration.submitted`. Elles ne sont pas modifiables manuellement.

---

#### `GET /api/analytics/stats`

Retourne toutes les statistiques de tous les clients.

**Réponse `200 OK`**

```json
[
  {
    "id":               "c9d0e1f2-...",
    "client_id":        "c3d4e5f6-...",
    "periode":          "2025-01",
    "chiffre_affaires": 15000.000,
    "total_charges":    8500.000,
    "tva_nette":        2850.000,
    "resultat_net":     6500.000,
    "nb_factures":      12,
    "nb_declarations":  3,
    "created_at":       "2025-01-15T10:34:00.000Z"
  }
]
```

---

#### `GET /api/analytics/stats/:id`

Retourne une statistique par son identifiant.

**Erreurs possibles**

| Code | Message | Cause |
|------|---------|-------|
| `404` | `Stat introuvable : {id}` | Statistique inexistante |

---

#### `GET /api/analytics/stats/client/:client_id`

Retourne toutes les statistiques mensuelles d'un client (historique complet).

---

### 4.4 Audit Logs

Les audit logs sont créés **exclusivement** par le consumer Kafka. Ils tracent toutes les actions effectuées sur la plateforme. Aucun endpoint d'écriture n'est exposé.

---

#### `GET /api/analytics/audit`

Retourne tous les audit logs de la plateforme.

**Réponse `200 OK`**

```json
[
  {
    "id":           "d0e1f2a3-...",
    "client_id":    "c3d4e5f6-...",
    "action":       "create",
    "entity_type":  "facture",
    "entity_id":    "e5f6a7b8-...",
    "performed_by": "system",
    "details":      "{\"montant_ht\":1000,\"tva_montant\":190,\"statut\":\"brouillon\"}",
    "created_at":   "2025-01-15T10:34:00.000Z"
  }
]
```

---

#### `GET /api/analytics/audit/client/:client_id`

Retourne tous les audit logs d'un client.

---

#### `GET /api/analytics/audit/entity/:entity_type/:entity_id`

Retourne tous les audit logs d'une entité spécifique.

**Paramètres URL**

| Paramètre | Valeurs acceptées |
|-----------|-------------------|
| `entity_type` | `facture` `declaration` `user` `assignation` |
| `entity_id` | UUID de l'entité |

**Exemple**

```
GET /api/analytics/audit/entity/facture/e5f6a7b8-...
```

---

### 4.5 Dashboard

Endpoint d'agrégation qui retourne en un seul appel les données consolidées d'un client, issues de quatre sources différentes dans MS3.

---

#### `GET /api/analytics/dashboard/:client_id`

Retourne le dashboard complet d'un client. Quatre appels gRPC sont lancés en parallèle (`Promise.all`) vers MS3 pour agréger stats, alertes, rapports et audit logs.

**Réponse `200 OK`**

```json
{
  "client_id": "c3d4e5f6-...",
  "stats": [
    {
      "periode":          "2025-01",
      "chiffre_affaires": 15000.000,
      "total_charges":    8500.000,
      "tva_nette":        2850.000,
      "resultat_net":     6500.000,
      "nb_factures":      12,
      "nb_declarations":  3
    }
  ],
  "alertes": [
    {
      "type":     "echeance",
      "message":  "Déclaration TVA soumise pour la période 2025-01",
      "severity": "info",
      "is_read":  false
    }
  ],
  "reports": [
    {
      "type":    "fiscal",
      "periode": "2025-Q1",
      "statut":  "genere"
    }
  ],
  "audit_logs": [
    {
      "action":       "create",
      "entity_type":  "facture",
      "performed_by": "system",
      "created_at":   "2025-01-15T10:34:00.000Z"
    }
  ]
}
```
