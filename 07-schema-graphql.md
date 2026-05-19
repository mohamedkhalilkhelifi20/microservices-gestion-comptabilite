# Description du Schéma GraphQL

> L'API GraphQL est exposée par l'**API Gateway** sur le port **3000**.  
> **Endpoint :** `POST http://localhost:3000/graphql`  
> **Sandbox interactif :** `GET http://localhost:3000/graphql` (Apollo Sandbox — disponible en mode développement)  
> Toutes les requêtes utilisent le format **JSON** avec l'en-tête `Content-Type: application/json`.

---

## Table des matières

1. [Présentation & cas d'usage](#1-présentation--cas-dusage)
2. [Format des requêtes](#2-format-des-requêtes)
3. [Gestion des erreurs](#3-gestion-des-erreurs)
4. [Types — Entités](#4-types--entités)
   - [Cabinet](#41-cabinet)
   - [Comptable](#42-comptable)
   - [Client](#43-client)
   - [ComptableClient (Assignation)](#44-comptableclient-assignation)
   - [Invoice (Facture)](#45-invoice-facture)
   - [Declaration](#46-declaration)
   - [Alerte](#47-alerte)
   - [Report](#48-report)
   - [Stat](#49-stat)
   - [AuditLog](#410-auditlog)
   - [Dashboard](#411-dashboard)
5. [Queries](#5-queries)
6. [Mutations](#6-mutations)

---

## 1. Présentation & cas d'usage

L'API GraphQL coexiste avec l'API REST. Elle est particulièrement adaptée pour deux cas d'usage :

**Cas 1 — Requêtes complexes multi-sources en un seul appel**  
La query `dashboard` agrège en parallèle les stats, alertes, rapports et audit logs d'un client depuis MS3. Sans GraphQL, le client devrait effectuer 4 appels REST séparés et assembler les résultats lui-même.

**Cas 2 — Sélection précise des champs retournés**  
GraphQL permet au client de demander exactement les champs dont il a besoin, évitant le sur-fetching (recevoir plus de données que nécessaire) et le sous-fetching (devoir faire plusieurs appels pour avoir toutes les données).

```graphql

query {
  clients {
    id
    nom
    email
  }
}
```

---

## 2. Format des requêtes

### Structure d'une requête HTTP

```http
POST http://localhost:3000/graphql
Content-Type: application/json

{
  "query": "query { ... }",
  "variables": { ... }
}
```

### Requête sans variables

```json
{
  "query": "query { cabinets { id nom email } }"
}
```

### Requête avec variables (recommandé)

L'utilisation des variables évite l'injection et améliore la lisibilité :

```json
{
  "query": "query GetClient($id: ID!) { client(id: $id) { id nom email type } }",
  "variables": { "id": "c3d4e5f6-..." }
}
```

---

## 3. Gestion des erreurs

### Format d'une réponse d'erreur GraphQL

```json
{
  "errors": [
    {
      "message": "Client non trouvé : c3d4e5f6-...",
      "extensions": {
        "code": "NOT_FOUND",
        "httpStatus": 404,
        "grpcCode": 5
      }
    }
  ],
  "data": null
}
```

### Codes d'erreur retournés

| `extensions.code` | `httpStatus` | Cause |
|-------------------|-------------|-------|
| `NOT_FOUND` | 404 | Ressource introuvable |
| `ALREADY_EXISTS` | 409 | Ressource déjà existante |
| `FAILED_PRECONDITION` | 400 | Règle métier non respectée |
| `UNAVAILABLE` | 503 | Microservice cible indisponible |
| `INTERNAL_SERVER_ERROR` | 500 | Erreur interne |

---

## 4. Types — Entités

Les types GraphQL correspondent aux entités exposées par les microservices.  
Tous les champs sont de type `String` sauf mention contraire.

---

### 4.1 Cabinet

Représente une structure comptable regroupant des comptables.

```graphql
type Cabinet {
  id:         ID!
  nom:        String!
  adresse:    String
  email:      String!
  telephone:  String
  created_at: String!
}
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `id` | ✅ | Identifiant unique UUID |
| `nom` | ✅ | Nom du cabinet |
| `adresse` | ❌ | Adresse physique |
| `email` | ✅ | Email unique du cabinet |
| `telephone` | ❌ | Numéro de téléphone |
| `created_at` | ✅ | Date de création ISO 8601 |

---

### 4.2 Comptable

Représente un expert-comptable certifié rattaché à un cabinet.

```graphql
type Comptable {
  id:             ID!
  nom:            String!
  email:          String!
  telephone:      String
  specialite:     String!
  cabinet_id:     String!
  cabinet_nom:    String
  ordre_ordinal:  String
  numero_licence: String
  created_at:     String!
}
```

| Champ | Description |
|-------|-------------|
| `specialite` | Domaine d'expertise : `fiscal` `audit` `paie` `juridique` |
| `cabinet_id` | Référence vers le cabinet d'appartenance |
| `cabinet_nom` | Nom du cabinet (dénormalisé — inclus directement) |
| `ordre_ordinal` | Numéro d'inscription à l'ordre des experts-comptables |
| `numero_licence` | Numéro de licence professionnelle |

---

### 4.3 Client

Représente une entreprise ou un professionnel utilisant la plateforme.

```graphql
type Client {
  id:               ID!
  nom:              String!
  email:            String!
  telephone:        String
  type:             String!
  matricule_fiscal: String
  cabinet_id:       String!
  cabinet_nom:      String
  adresse:          String
  created_at:       String!
}
```

| Champ | Description |
|-------|-------------|
| `type` | Nature juridique : `societe` `patente` `personne_physique` |
| `matricule_fiscal` | Identifiant fiscal tunisien |
| `cabinet_nom` | Nom du cabinet (dénormalisé) |

---

### 4.4 ComptableClient (Assignation)

Représente la liaison active entre un comptable et un client.

```graphql
type ComptableClient {
  id:           ID!
  comptable_id: String!
  client_id:    String!
  specialite:   String!
  date_debut:   String!
  statut:       String!
}
```

| Champ | Description |
|-------|-------------|
| `specialite` | Spécialité de l'assignation : `fiscal` `audit` `paie` `juridique` |
| `date_debut` | Date de début de l'assignation ISO 8601 |
| `statut` | État de l'assignation : `actif` `inactif` |

---

### 4.5 Invoice (Facture)

Représente une facture avec son cycle de vie complet.

```graphql
type Invoice {
  id:             ID!
  type:           String!
  numero:         String!
  client_id:      String!
  client_nom:     String!
  comptable_id:   String!
  montant_ht:     Float!
  tva_rate:       Float!
  tva_montant:    Float!
  montant_ttc:    Float!
  statut:         String!
  signature_hash: String
  signed_by:      String
  signed_at:      String
  details_json:   String
  created_at:     String!
}
```

| Champ | Description |
|-------|-------------|
| `type` | Type de document : `standard` `steg` `sonede` `internet` `loyer` `honoraires` |
| `numero` | Numéro généré automatiquement — format `{TYPE}-{YYYYMMDD}-{RAND4}` |
| `montant_ht` | Montant hors taxe |
| `tva_rate` | Taux TVA appliqué : `7.0` `13.0` `19.0` |
| `tva_montant` | TVA calculée automatiquement (arrondie à 3 décimales) |
| `montant_ttc` | Montant toutes taxes comprises |
| `statut` | État : `brouillon` `validee` `signee` `envoyee` `payee` |
| `signature_hash` | Hash SHA-256 de la signature (vide si non signé) |
| `signed_by` | UUID du comptable signataire |
| `signed_at` | Date et heure de la signature |
| `details_json` | Métadonnées JSON stringifiées |

---

### 4.6 Declaration

Représente une déclaration fiscale.

```graphql
type Declaration {
  id:           ID!
  client_id:    String!
  client_nom:   String!
  comptable_id: String!
  type:         String!
  periode:      String!
  montant:      Float!
  statut:       String!
  validated_by: String
  validated_at: String
  created_at:   String!
}
```

| Champ | Description |
|-------|-------------|
| `type` | Nature fiscale : `TVA` `IS` `IRPP` `CNSS` |
| `periode` | Période concernée — format `YYYY-MM` (ex: `2025-01`) |
| `montant` | Montant de la déclaration |
| `statut` | État : `brouillon` `soumise` `validee` |
| `validated_by` | UUID du comptable validateur |
| `validated_at` | Date et heure de la validation |

---

### 4.7 Alerte

Représente une notification métier générée automatiquement par Kafka.

```graphql
type Alerte {
  id:          ID!
  client_id:   String!
  type:        String!
  message:     String!
  severity:    String!
  entity_id:   String
  entity_type: String
  is_read:     Boolean!
  created_at:  String!
}
```

| Champ | Description |
|-------|-------------|
| `type` | Nature de l'alerte : `echeance` `impayee` `anomalie` |
| `severity` | Niveau d'urgence : `info` `warning` `critical` |
| `entity_id` | UUID de l'entité concernée (facture ou déclaration) |
| `entity_type` | Type de l'entité : `facture` `declaration` |
| `is_read` | Indique si l'alerte a été lue |

---

### 4.8 Report

Représente un rapport financier ou fiscal enrichi avec les données de MS1 et MS2.

```graphql
type Report {
  id:         ID!
  client_id:  String!
  type:       String!
  periode:    String!
  statut:     String!
  contenu:    String
  created_at: String!
}
```

| Champ | Description |
|-------|-------------|
| `type` | Nature du rapport : `financier` `fiscal` `tresorerie` |
| `periode` | Période couverte — ex: `2025-Q1` `2025-01` |
| `statut` | État du rapport : `genere` `valide` `archive` |
| `contenu` | Données enrichies JSON stringifiées (client, factures, déclarations) |

---

### 4.9 Stat

Représente les KPIs mensuels d'un client, calculés automatiquement par le consumer Kafka.

```graphql
type Stat {
  id:               ID!
  client_id:        String!
  periode:          String!
  chiffre_affaires: Float!
  total_charges:    Float!
  tva_nette:        Float!
  resultat_net:     Float!
  nb_factures:      Int!
  nb_declarations:  Int!
  created_at:       String!
}
```

| Champ | Description |
|-------|-------------|
| `periode` | Mois concerné — format `YYYY-MM` |
| `chiffre_affaires` | Somme des `montant_ht` des factures créées ce mois |
| `total_charges` | Somme des montants des déclarations soumises ce mois |
| `tva_nette` | Somme des `tva_montant` des factures créées ce mois |
| `resultat_net` | `chiffre_affaires - total_charges` (calculé automatiquement) |
| `nb_factures` | Nombre de factures créées ce mois |
| `nb_declarations` | Nombre de déclarations soumises ce mois |

---

### 4.10 AuditLog

Représente un enregistrement de traçabilité créé automatiquement par Kafka.

```graphql
type AuditLog {
  id:           ID!
  client_id:    String!
  action:       String!
  entity_type:  String!
  entity_id:    String!
  performed_by: String!
  details:      String
  created_at:   String!
}
```

| Champ | Description |
|-------|-------------|
| `action` | Action effectuée : `create` `update` `delete` `submit` `validate` `sign` `pay` |
| `entity_type` | Type d'entité concernée : `facture` `declaration` `user` `assignation` |
| `performed_by` | UUID de l'acteur ou `"system"` si déclenché par Kafka |
| `details` | Contexte JSON stringifié (montants, hashes, etc.) |

---

### 4.11 Dashboard

Type composite retourné par la query `dashboard`. Agrège quatre sources en un seul objet.

```graphql
type Dashboard {
  client_id:  String!
  stats:      [Stat]!
  alertes:    [Alerte]!
  reports:    [Report]!
  audit_logs: [AuditLog]!
}
```

---

## 5. Queries

Les queries sont des opérations de **lecture**. Elles ne modifient aucune donnée.

---

### Queries MS1 — Identity

---

#### `cabinet(id: ID!): Cabinet`

Retourne un cabinet par son identifiant.

```graphql
query {
  cabinet(id: "a1b2c3d4-e5f6-4789-abcd-ef1234567890") {
    id
    nom
    email
    adresse
    telephone
    created_at
  }
}
```

**Réponse**

```json
{
  "data": {
    "cabinet": {
      "id":         "a1b2c3d4-...",
      "nom":        "Cabinet Expertise Comptable",
      "email":      "contact@cabinet.tn",
      "adresse":    "Lac 2, Tunis",
      "telephone":  "+216 71 000 000",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

---

#### `cabinets: [Cabinet]!`

Retourne tous les cabinets.

```graphql
query {
  cabinets {
    id
    nom
    email
  }
}
```

---

#### `comptable(id: ID!): Comptable`

Retourne un comptable par son identifiant.

```graphql
query {
  comptable(id: "b2c3d4e5-...") {
    id
    nom
    email
    specialite
    cabinet_nom
    numero_licence
  }
}
```

---

#### `comptables: [Comptable]!`

Retourne tous les comptables.

---

#### `comptablesBySpecialite(specialite: String!): [Comptable]!`

Retourne tous les comptables d'une spécialité donnée.

```graphql
query {
  comptablesBySpecialite(specialite: "fiscal") {
    id
    nom
    email
    cabinet_nom
  }
}
```

---

#### `client(id: ID!): Client`

Retourne un client par son identifiant.

```graphql
query {
  client(id: "c3d4e5f6-...") {
    id
    nom
    email
    type
    matricule_fiscal
    cabinet_nom
    created_at
  }
}
```

---

#### `clients: [Client]!`

Retourne tous les clients.

---

#### `assignationsByClient(client_id: String!): [ComptableClient]!`

Retourne toutes les assignations actives d'un client.

```graphql
query {
  assignationsByClient(client_id: "c3d4e5f6-...") {
    id
    comptable_id
    specialite
    date_debut
    statut
  }
}
```

---

### Queries MS2 — Documents

---

#### `invoice(id: ID!): Invoice`

Retourne une facture par son identifiant.

```graphql
query {
  invoice(id: "e5f6a7b8-...") {
    id
    numero
    type
    client_nom
    montant_ht
    tva_rate
    tva_montant
    montant_ttc
    statut
    signature_hash
    signed_at
    created_at
  }
}
```

---

#### `invoices: [Invoice]!`

Retourne toutes les factures.

---

#### `invoicesByClient(client_id: String!): [Invoice]!`

Retourne toutes les factures d'un client.

```graphql
query {
  invoicesByClient(client_id: "c3d4e5f6-...") {
    id
    numero
    type
    montant_ttc
    statut
    created_at
  }
}
```

---

#### `declaration(id: ID!): Declaration`

Retourne une déclaration par son identifiant.

```graphql
query {
  declaration(id: "f6a7b8c9-...") {
    id
    type
    periode
    montant
    statut
    validated_by
    validated_at
  }
}
```

---

#### `declarations: [Declaration]!`

Retourne toutes les déclarations.

---

#### `declarationsByClient(client_id: String!): [Declaration]!`

Retourne toutes les déclarations d'un client.

```graphql
query {
  declarationsByClient(client_id: "c3d4e5f6-...") {
    id
    type
    periode
    montant
    statut
    created_at
  }
}
```

---

### Queries MS3 — Analytics

---

#### `alertes: [Alerte]!`

Retourne toutes les alertes.

---

#### `alertesByClient(client_id: String!): [Alerte]!`

Retourne toutes les alertes d'un client.

```graphql
query {
  alertesByClient(client_id: "c3d4e5f6-...") {
    id
    type
    message
    severity
    is_read
    created_at
  }
}
```

---

#### `report(id: ID!): Report`

Retourne un rapport par son identifiant.

---

#### `reports: [Report]!`

Retourne tous les rapports.

---

#### `reportsByClient(client_id: String!): [Report]!`

Retourne tous les rapports d'un client.

```graphql
query {
  reportsByClient(client_id: "c3d4e5f6-...") {
    id
    type
    periode
    statut
    created_at
  }
}
```

---

#### `stat(id: ID!): Stat`

Retourne une statistique par son identifiant.

---

#### `stats: [Stat]!`

Retourne toutes les statistiques.

---

#### `statsByClient(client_id: String!): [Stat]!`

Retourne toutes les statistiques mensuelles d'un client.

```graphql
query {
  statsByClient(client_id: "c3d4e5f6-...") {
    periode
    chiffre_affaires
    total_charges
    tva_nette
    resultat_net
    nb_factures
    nb_declarations
  }
}
```

---

#### `auditLogs: [AuditLog]!`

Retourne tous les audit logs.

---

#### `auditLogsByClient(client_id: String!): [AuditLog]!`

Retourne tous les audit logs d'un client.

```graphql
query {
  auditLogsByClient(client_id: "c3d4e5f6-...") {
    action
    entity_type
    entity_id
    performed_by
    created_at
  }
}
```

---

#### `auditLogsByEntity(entity_type: String!, entity_id: String!): [AuditLog]!`

Retourne tous les audit logs d'une entité spécifique.

```graphql
query {
  auditLogsByEntity(entity_type: "facture", entity_id: "e5f6a7b8-...") {
    action
    performed_by
    details
    created_at
  }
}
```

---

#### `dashboard(client_id: String!): Dashboard!`

**Query la plus puissante** — retourne en un seul appel les données consolidées d'un client depuis quatre sources MS3 agrégées en parallèle.

```graphql
query GetDashboard($client_id: String!) {
  dashboard(client_id: $client_id) {
    client_id

    stats {
      periode
      chiffre_affaires
      total_charges
      tva_nette
      resultat_net
      nb_factures
      nb_declarations
    }

    alertes {
      type
      message
      severity
      is_read
      created_at
    }

    reports {
      type
      periode
      statut
      created_at
    }

    audit_logs {
      action
      entity_type
      performed_by
      created_at
    }
  }
}
```

**Variables**

```json
{
  "client_id": "c3d4e5f6-..."
}
```

**Réponse**

```json
{
  "data": {
    "dashboard": {
      "client_id": "c3d4e5f6-...",
      "stats": [
        {
          "periode":          "2025-01",
          "chiffre_affaires": 15000.0,
          "total_charges":    8500.0,
          "tva_nette":        2850.0,
          "resultat_net":     6500.0,
          "nb_factures":      12,
          "nb_declarations":  3
        }
      ],
      "alertes": [
        {
          "type":      "echeance",
          "message":   "Déclaration TVA soumise pour la période 2025-01",
          "severity":  "info",
          "is_read":   false,
          "created_at":"2025-01-15T11:10:00.000Z"
        }
      ],
      "reports": [
        {
          "type":       "fiscal",
          "periode":    "2025-Q1",
          "statut":     "genere",
          "created_at": "2025-01-15T12:10:00.000Z"
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
  }
}
```

---

## 6. Mutations

Les mutations sont des opérations d'**écriture** — elles créent ou modifient des ressources.

---

### Mutations MS1 — Identity

---

#### `createCabinet(...): Cabinet!`

```graphql
mutation {
  createCabinet(
    nom:       "Cabinet Expertise Comptable"
    email:     "contact@cabinet.tn"
    adresse:   "Lac 2, Tunis"
    telephone: "+216 71 000 000"
  ) {
    id
    nom
    email
    created_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `nom` | String | ✅ |
| `email` | String | ✅ |
| `adresse` | String | ❌ |
| `telephone` | String | ❌ |

---

#### `createComptable(...): Comptable!`

```graphql
mutation {
  createComptable(
    nom:            "Ahmed Ben Ali"
    email:          "ahmed@cabinet.tn"
    telephone:      "+216 99 000 001"
    specialite:     "fiscal"
    cabinet_id:     "a1b2c3d4-..."
    numero_licence: "LIC-2025-001"
  ) {
    id
    nom
    specialite
    cabinet_nom
    created_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `nom` | String | ✅ |
| `email` | String | ✅ |
| `specialite` | String | ✅ |
| `cabinet_id` | String | ✅ |
| `telephone` | String | ❌ |
| `ordre_ordinal` | String | ❌ |
| `numero_licence` | String | ❌ |

---

#### `createClient(...): Client!`

```graphql
mutation {
  createClient(
    nom:              "SARL TechTunisie"
    email:            "contact@techtunisie.tn"
    telephone:        "+216 71 000 002"
    type:             "societe"
    matricule_fiscal: "1234567/A/M/000"
    cabinet_id:       "a1b2c3d4-..."
    adresse:          "Lac 2, Tunis"
  ) {
    id
    nom
    type
    matricule_fiscal
    cabinet_nom
    created_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `nom` | String | ✅ |
| `email` | String | ✅ |
| `type` | String | ✅ |
| `cabinet_id` | String | ✅ |
| `telephone` | String | ❌ |
| `matricule_fiscal` | String | ❌ |
| `adresse` | String | ❌ |

---

#### `assignComptableToClient(...): ComptableClient!`

Crée une assignation active entre un comptable et un client.

```graphql
mutation {
  assignComptableToClient(
    comptable_id: "b2c3d4e5-..."
    client_id:    "c3d4e5f6-..."
    specialite:   "fiscal"
  ) {
    id
    comptable_id
    client_id
    specialite
    date_debut
    statut
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `comptable_id` | String | ✅ |
| `client_id` | String | ✅ |
| `specialite` | String | ✅ |

---

### Mutations MS2 — Documents

---

#### `createInvoice(...): Invoice!`

```graphql
mutation CreateInvoice($input: CreateInvoiceInput) {
  createInvoice(
    type:         "standard"
    client_id:    "c3d4e5f6-..."
    client_nom:   "SARL TechTunisie"
    comptable_id: "b2c3d4e5-..."
    montant_ht:   1000.0
    tva_rate:     19.0
    details_json: "{\"description\": \"Consultation fiscale Q1 2025\"}"
  ) {
    id
    numero
    montant_ht
    tva_montant
    montant_ttc
    statut
    created_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `type` | String | ✅ |
| `client_id` | String | ✅ |
| `client_nom` | String | ✅ |
| `comptable_id` | String | ✅ |
| `montant_ht` | Float | ✅ |
| `tva_rate` | Float | ✅ |
| `details_json` | String | ❌ |

---

#### `updateInvoice(...): Invoice!`

Modifie le statut ou les montants d'une facture existante.

```graphql
# Changer le statut
mutation {
  updateInvoice(
    invoice_id: "e5f6a7b8-..."
    statut:     "validee"
  ) {
    id
    statut
  }
}

# Modifier les montants (brouillon uniquement)
mutation {
  updateInvoice(
    invoice_id:   "e5f6a7b8-..."
    montant_ht:   1200.0
    tva_rate:     19.0
    details_json: "{\"description\": \"Révisé\"}"
  ) {
    id
    montant_ht
    tva_montant
    montant_ttc
    statut
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `invoice_id` | String | ✅ |
| `statut` | String | ❌ |
| `montant_ht` | Float | ❌ |
| `tva_rate` | Float | ❌ |
| `details_json` | String | ❌ |

---

#### `deleteInvoice(invoice_id: String!): DeleteResponse!`

Supprime une facture en statut `brouillon`.

```graphql
mutation {
  deleteInvoice(invoice_id: "e5f6a7b8-...") {
    success
    message
  }
}
```

**Réponse**

```json
{
  "data": {
    "deleteInvoice": {
      "success": true,
      "message": "Facture e5f6a7b8-... supprimée avec succès"
    }
  }
}
```

---

#### `signInvoice(invoice_id: String!, comptable_id: String!): SignResponse!`

Signe une facture validée avec un hash SHA-256.

```graphql
mutation {
  signInvoice(
    invoice_id:   "e5f6a7b8-..."
    comptable_id: "b2c3d4e5-..."
  ) {
    success
    signature_hash
    signed_at
  }
}
```

**Réponse**

```json
{
  "data": {
    "signInvoice": {
      "success":        true,
      "signature_hash": "a3f9c2d8e1b4f7a2c5d9e3b6f8a1c4d7...",
      "signed_at":      "2025-01-15T11:00:00.000Z"
    }
  }
}
```

---

#### `createDeclaration(...): Declaration!`

```graphql
mutation {
  createDeclaration(
    client_id:    "c3d4e5f6-..."
    client_nom:   "SARL TechTunisie"
    comptable_id: "b2c3d4e5-..."
    type:         "TVA"
    periode:      "2025-01"
    montant:      3570.0
  ) {
    id
    type
    periode
    montant
    statut
    created_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `client_id` | String | ✅ |
| `client_nom` | String | ✅ |
| `comptable_id` | String | ✅ |
| `type` | String | ✅ |
| `periode` | String | ✅ |
| `montant` | Float | ✅ |

---

#### `updateDeclaration(...): Declaration!`

Modifie une déclaration en statut `brouillon`.

```graphql
mutation {
  updateDeclaration(
    declaration_id: "f6a7b8c9-..."
    montant:        4200.0
    periode:        "2025-02"
  ) {
    id
    montant
    periode
    statut
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `declaration_id` | String | ✅ |
| `montant` | Float | ❌ |
| `periode` | String | ❌ |

---

#### `deleteDeclaration(declaration_id: String!): DeleteResponse!`

Supprime une déclaration en statut `brouillon`.

```graphql
mutation {
  deleteDeclaration(declaration_id: "f6a7b8c9-...") {
    success
    message
  }
}
```

---

#### `validateDeclaration(...): Declaration!`

Valide une déclaration — passe son statut à `validee`.

```graphql
mutation {
  validateDeclaration(
    declaration_id: "f6a7b8c9-..."
    comptable_id:   "b2c3d4e5-..."
  ) {
    id
    statut
    validated_by
    validated_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `declaration_id` | String | ✅ |
| `comptable_id` | String | ✅ |

---

### Mutations MS3 — Analytics

---

#### `createAlerte(...): Alerte!`

Crée une alerte manuellement.

```graphql
mutation {
  createAlerte(
    client_id:   "c3d4e5f6-..."
    type:        "echeance"
    message:     "Déclaration TVA due avant le 28 janvier 2025"
    severity:    "warning"
    entity_id:   "f6a7b8c9-..."
    entity_type: "declaration"
  ) {
    id
    type
    message
    severity
    is_read
    created_at
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `client_id` | String | ✅ |
| `type` | String | ✅ |
| `message` | String | ✅ |
| `severity` | String | ✅ |
| `entity_id` | String | ❌ |
| `entity_type` | String | ❌ |

---

#### `createReport(...): Report!`

Crée un rapport — MS3 enrichit automatiquement le contenu via MS1 et MS2.

```graphql
mutation {
  createReport(
    client_id: "c3d4e5f6-..."
    type:      "fiscal"
    periode:   "2025-Q1"
    contenu:   "{}"
  ) {
    id
    type
    periode
    statut
    contenu
    created_at
  }
}
```

---

#### `updateReport(...): Report!`

Modifie le statut ou le contenu d'un rapport.

```graphql
mutation {
  updateReport(
    id:     "b8c9d0e1-..."
    statut: "valide"
  ) {
    id
    statut
  }
}
```

**Arguments**

| Argument | Type | Obligatoire |
|----------|------|-------------|
| `id` | String | ✅ |
| `statut` | String | ❌ |
| `contenu` | String | ❌ |

---

#### `deleteReport(id: String!): DeleteReportResponse!`

Supprime un rapport.

```graphql
mutation {
  deleteReport(id: "b8c9d0e1-...") {
    success
    message
  }
}
```
