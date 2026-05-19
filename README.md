

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![gRPC](https://img.shields.io/badge/gRPC-Protocol-244c5a?logo=grpc)](https://grpc.io)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-Event_Bus-231F20?logo=apachekafka)](https://kafka.apache.org)
[![GraphQL](https://img.shields.io/badge/GraphQL-API-E10098?logo=graphql)](https://graphql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![Postman](https://img.shields.io/badge/Postman-Workspace-FF6C37?logo=postman)](https://blue-comet-423439.postman.co/workspace/771f21e8-c154-4de0-b582-39f8c3bf263d)

---

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Services](#services)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [API Reference](#api-reference)
- [Kafka — Topics & Événements](#kafka--topics--événements)
- [Tests](#tests)

---

## Vue d'ensemble

Nixam est une architecture **microservices** composée de trois services métier indépendants, exposés via un **API Gateway** unique. La communication inter-services est assurée par **gRPC** de façon synchrone et par **Apache Kafka** de façon asynchrone pour les événements métier.

```
Client (Web / Mobile)
        │
        ▼
┌───────────────────┐
│   API Gateway     │  REST + GraphQL  :3000
└─────────┬─────────┘
          │ gRPC
    ┌─────┴──────────────────────┐
    │             │              │
    ▼             ▼              ▼
┌────────┐  ┌─────────┐  ┌───────────┐
│  MS1   │  │   MS2   │  │    MS3    │
│Identity│  │Document │  │Analytics  │
│ :50051 │  │ :50052  │  │  :50053   │
│SQLite  │  │  RxDB   │  │   RxDB    │
└────────┘  └─────────┘  └───────────┘
    │             │              │
    └─────────────┴──────────────┘
                  │
            Apache Kafka
```

---

## Services

### MS1 — Identity Service `:50051`

Gestion des entités utilisateurs et des relations entre elles.

| Entité | Description |
|--------|-------------|
| `Cabinet` | Structure comptable regroupant des comptables |
| `Comptable` | Expert-comptable certifié, rattaché à un cabinet |
| `Client` | Entreprise ou patenté utilisant Nixam |
| `Assignation` | Liaison active entre un comptable et un client |

**Base de données :** SQLite (`ms1_identity.sqlite`)

**Kafka produit :** `user.created` · `comptable.assigned`

---

### MS2 — Document Service `:50052`

Gestion du cycle de vie des documents comptables et fiscaux.

| Entité | Statuts |
|--------|---------|
| `Invoice` | `brouillon` → `validee` → `signee` → `envoyee` → `payee` |
| `Declaration` | `brouillon` → `soumise` → `validee` |

**Base de données :** RxDB in-memory (`ms2_documents`)

**Règles métier :**
- Les montants et détails ne sont modifiables qu'en statut `brouillon`
- La signature requiert une assignation active client ↔ comptable
- Une facture `payee` ou `envoyee` ne peut plus être signée

**Kafka produit :** `invoice.created` · `invoice.signed` · `invoice.paid` · `declaration.submitted` · `declaration.validated`

---

### MS3 — Analytics Service `:50053`

Agrégation, statistiques et traçabilité. Ce service est **consommateur** Kafka — il réagit aux événements des autres services.

| Entité | Description |
|--------|-------------|
| `Alerte` | Notification métier (échéance, impayé, anomalie) |
| `Report` | Rapport financier ou fiscal généré |
| `Stat` | KPIs mensuels par client (CA, charges, TVA, résultat) |
| `AuditLog` | Traçabilité de toutes les actions sur la plateforme |

**Base de données :** RxDB in-memory (`ms3_analytics`)

**Kafka consomme :** `user.created` · `comptable.assigned` · `invoice.created` · `invoice.signed` · `invoice.paid` · `declaration.submitted` · `declaration.validated`

---

### API Gateway `:3000`

Point d'entrée unique exposant :
- **REST** — routes dédiées par domaine métier
- **GraphQL** — schéma unifié via Apollo Server

**Workspace Postman :** [Ouvrir dans Postman](https://blue-comet-423439.postman.co/workspace/771f21e8-c154-4de0-b582-39f8c3bf263d)

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 20.x |
| Docker | 24.x |
| Docker Compose | 2.x |
| npm | 10.x |

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/your-org/nixam.git
cd nixam
```

### 2. Installer les dépendances de chaque service

```bash
# API Gateway
cd api-gateway && npm install && cd ..

# MS1
cd MS1-User-Service && npm install && cd ..

# MS2
cd MS2-document-service && npm install && cd ..

# MS3
cd MS3-Analytics-Service && npm install && cd ..
```

---

## Configuration

Chaque service lit ses variables d'environnement au démarrage. Les valeurs par défaut permettent un lancement local sans configuration supplémentaire.

### Variables d'environnement

| Variable | Valeur par défaut | Utilisé par |
|----------|-------------------|-------------|
| `MS1_ADDR` | `localhost:50051` | Gateway, MS2, MS3 |
| `MS2_ADDR` | `localhost:50052` | Gateway, MS3 |
| `MS3_ADDR` | `localhost:50053` | Gateway |
| `KAFKA_BROKER` | `localhost:9092` | MS1, MS2, MS3 |
| `MS1_PORT` | `50051` | MS1 |
| `MS2_PORT` | `50052` | MS2 |
| `MS3_PORT` | `50053` | MS3 |
| `PORT` | `3000` | Gateway |
| `NODE_ENV` | `development` | MS2, MS3 (RxDB dev mode) |

### Fichier `.env` (optionnel)

Créer un `.env` à la racine de chaque service si vous souhaitez surcharger les valeurs par défaut :

```env
KAFKA_BROKER=kafka:9092
MS1_ADDR=ms1:50051
MS2_ADDR=ms2:50052
MS3_ADDR=ms3:50053
NODE_ENV=production
```

---

## Démarrage

### Option A — Docker Compose (recommandé)

```bash
docker-compose up --build
```

Tous les services démarrent dans le bon ordre : Kafka → MS1 → MS2 → MS3 → Gateway.

### Option B — Lancement local (développement)

Démarrer Kafka en premier :

```bash
docker-compose up zookeeper kafka -d
```

Puis lancer chaque service dans un terminal séparé :

```bash
# Terminal 1 — MS1
cd MS1-User-Service && node server.js

# Terminal 2 — MS2
cd MS2-document-service && node server.js

# Terminal 3 — MS3
cd MS3-Analytics-Service && node server.js

# Terminal 4 — Gateway
cd api-gateway && node index.js
```

### Vérification

```bash
curl http://localhost:3000/
```

La réponse liste toutes les routes REST disponibles et confirme que le Gateway est opérationnel.

---

## API Reference

### REST — MS1 : Identity

```
POST   /api/cabinets                              Créer un cabinet
GET    /api/cabinets                              Lister les cabinets
GET    /api/cabinets/:id                          Obtenir un cabinet

POST   /api/comptables                            Créer un comptable
GET    /api/comptables                            Lister les comptables
GET    /api/comptables/:id                        Obtenir un comptable
GET    /api/comptables/specialite/:specialite     Filtrer par spécialité

POST   /api/clients                               Créer un client
GET    /api/clients                               Lister les clients
GET    /api/clients/:id                           Obtenir un client

POST   /api/assignations                          Assigner un comptable à un client
GET    /api/assignations/client/:client_id        Assignations d'un client
```

### REST — MS2 : Documents

```
POST   /api/invoices                              Créer une facture
GET    /api/invoices                              Lister les factures
GET    /api/invoices/:id                          Obtenir une facture
GET    /api/invoices/client/:client_id            Factures d'un client
PUT    /api/invoices/:id                          Modifier une facture
PUT    /api/invoices/:id/sign                     Signer une facture
DELETE /api/invoices/:id                          Supprimer une facture (brouillon)

POST   /api/invoices/declarations                 Créer une déclaration
GET    /api/invoices/declarations                 Lister les déclarations
GET    /api/invoices/declarations/:id             Obtenir une déclaration
GET    /api/invoices/declarations/client/:id      Déclarations d'un client
PUT    /api/invoices/declarations/:id             Modifier une déclaration
PUT    /api/invoices/declarations/:id/validate    Valider une déclaration
DELETE /api/invoices/declarations/:id             Supprimer une déclaration (brouillon)
```

### REST — MS3 : Analytics

```
POST   /api/analytics/alertes                     Créer une alerte
GET    /api/analytics/alertes                     Lister les alertes
GET    /api/analytics/alertes/client/:client_id   Alertes d'un client

POST   /api/analytics/reports                     Créer un rapport
GET    /api/analytics/reports                     Lister les rapports
GET    /api/analytics/reports/:id                 Obtenir un rapport
GET    /api/analytics/reports/client/:client_id   Rapports d'un client
PUT    /api/analytics/reports/:id                 Modifier un rapport
DELETE /api/analytics/reports/:id                 Supprimer un rapport

GET    /api/analytics/stats                       Lister les statistiques
GET    /api/analytics/stats/:id                   Obtenir une stat
GET    /api/analytics/stats/client/:client_id     Stats d'un client

GET    /api/analytics/audit                       Tous les logs d'audit
GET    /api/analytics/audit/client/:client_id     Audit d'un client
GET    /api/analytics/audit/entity/:type/:id      Audit d'une entité

GET    /api/analytics/dashboard/:client_id        Dashboard agrégé (stats + alertes + reports + audit)
```

### GraphQL

**Endpoint :** `POST /graphql`  
**Sandbox :** `GET /graphql` (Apollo Sandbox en développement)

#### Exemples de queries

```graphql
# Dashboard complet d'un client
query {
  dashboard(client_id: "uuid-client") {
    stats { chiffre_affaires total_charges resultat_net }
    alertes { type message severity }
    reports { type periode statut }
    audit_logs { action entity_type performed_by }
  }
}

# Factures d'un client
query {
  invoicesByClient(client_id: "uuid-client") {
    id numero type montant_ttc statut created_at
  }
}
```

#### Exemples de mutations

```graphql
# Créer un cabinet
mutation {
  createCabinet(nom: "Cabinet Expertise TN", email: "contact@cabinet.tn") {
    id nom created_at
  }
}

# Créer une facture
mutation {
  createInvoice(
    type: "standard"
    client_id: "uuid-client"
    client_nom: "SARL TechTunisie"
    comptable_id: "uuid-comptable"
    montant_ht: 1000.0
    tva_rate: 19.0
  ) {
    id numero montant_ttc statut
  }
}

# Valider une déclaration TVA
mutation {
  validateDeclaration(
    declaration_id: "uuid-declaration"
    comptable_id: "uuid-comptable"
  ) {
    id statut validated_by validated_at
  }
}
```

---

## Kafka — Topics & Événements

Tous les événements suivent la convention `domaine.action` et sont sérialisés en JSON.

| Topic | Producteur | Consommateur | Déclencheur |
|-------|-----------|--------------|-------------|
| `user.created` | MS1 | MS3 | Création d'un client |
| `comptable.assigned` | MS1 | MS3 | Assignation comptable ↔ client |
| `invoice.created` | MS2 | MS3 | Création d'une facture |
| `invoice.signed` | MS2 | MS3 | Signature d'une facture |
| `invoice.paid` | MS2 | MS3 | Facture passée au statut `payee` |
| `declaration.submitted` | MS2 | MS3 | Création d'une déclaration |
| `declaration.validated` | MS2 | MS3 | Validation d'une déclaration |

### Exemple de payload `invoice.created`

```json
{
  "event": "invoice.created",
  "invoice_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "client-uuid",
  "type": "standard",
  "montant_ttc": 1190.0,
  "statut": "brouillon",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Tests

Le workspace Postman contient l'ensemble des collections de tests organisées par service.

**Lien :** [Postman Workspace Nixam](https://blue-comet-423439.postman.co/workspace/771f21e8-c154-4de0-b582-39f8c3bf263d)

### Ordre de test recommandé

```
1. POST /api/cabinets          → créer un cabinet
2. POST /api/comptables        → créer un comptable (utiliser cabinet_id)
3. POST /api/clients           → créer un client (utiliser cabinet_id)
4. POST /api/assignations      → assigner le comptable au client
5. POST /api/invoices          → créer une facture
6. PUT  /api/invoices/:id      → passer la facture en "validee"
7. PUT  /api/invoices/:id/sign → signer la facture
8. GET  /api/analytics/dashboard/:client_id → vérifier les KPIs
```

---

*© 2025 Nixam — Tous droits réservés.*  
*Projet startup tunisien — Marché : PME, Patentés, Sociétés en Tunisie.*
