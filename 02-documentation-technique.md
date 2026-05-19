# Documentation Technique du Projet

> **Plateforme SaaS de comptabilité intelligente — Architecture Microservices**  
> **Version :** 1.0.0  
> **Statut :** En développement  
> **Audience :** Jury technique  
> **Date :** 2025

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Vue d'ensemble du système](#2-vue-densemble-du-système)
3. [Décisions d'architecture](#3-décisions-darchitecture)
4. [Description des composants](#4-description-des-composants)
5. [Flux de données](#5-flux-de-données)
6. [Contraintes et limites connues](#6-contraintes-et-limites-connues)
7. [Tests](#7-tests)
8. [Index de la documentation](#8-index-de-la-documentation)

---

## 1. Introduction

### 1.1 Objectif du document

Ce document constitue la référence architecturale centrale du projet. Il décrit
les décisions de conception, justifie les choix technologiques et expose les
interactions entre les composants du système.

Il ne se substitue pas aux documents spécialisés listés en section 8 — il les
complète en apportant le contexte et le raisonnement qui ont conduit à chaque
décision technique.

### 1.2 Périmètre

Le projet est une plateforme SaaS de comptabilité construite sur une architecture
microservices. Il couvre :

- La gestion des identités et des relations entre acteurs comptables.
- Le cycle de vie des documents fiscaux et comptables.
- L'agrégation analytique et la traçabilité des opérations.
- L'exposition d'une API unifiée REST et GraphQL.

### 1.3 Audience cible

Ce document s'adresse à des profils techniques capables d'évaluer les choix
d'architecture, de conception et de technologie : architectes logiciels, ingénieurs
seniors, membres d'un jury technique.

---

## 2. Vue d'ensemble du système

### 2.1 Problème adressé

La gestion comptable pour les petites et moyennes structures implique des processus
complexes : création et suivi de factures, calcul des obligations fiscales (TVA,
IS, IRPP, CNSS), soumission de déclarations, validation par des experts certifiés
et traçabilité complète des opérations. Ces processus sont aujourd'hui dispersés
entre des outils coûteux, non intégrés et inaccessibles en mobilité.

Le système vise à centraliser ces processus dans une plateforme unifiée, accessible
via une API REST et GraphQL, et gouvernée par des règles métier strictes.

### 2.2 Acteurs du système

| Acteur | Rôle | Interaction avec le système |
|--------|------|-----------------------------|
| **Cabinet** | Structure regroupant des comptables certifiés | Entité de référence dans MS1 |
| **Comptable** | Expert certifié rattaché à un cabinet | Crée et valide les documents dans MS2 |
| **Client** | Entreprise ou professionnel utilisant la plateforme | Propriétaire des factures et déclarations |
| **Assignation** | Lien contractuel comptable ↔ client | Prérequis obligatoire à toute opération documentaire |

### 2.3 Frontières du système

Le système expose deux interfaces publiques, toutes deux accessibles depuis
l'API Gateway sur le port `3000` :

- **API REST** : opérations CRUD standard sur toutes les ressources.
- **API GraphQL** : requêtes complexes et agrégations multi-sources.

Toutes les communications internes entre microservices sont privées et ne sont
pas exposées directement aux clients.

---

## 3. Décisions d'architecture

Cette section documente les décisions architecturales structurantes du projet.
Chaque décision est présentée selon le format :
**contexte → options évaluées → décision retenue → justification**.

---

### 3.1 Architecture microservices vs monolithe

**Contexte**

Le système gère trois domaines fonctionnels aux caractéristiques très différentes :
les identités et relations entre acteurs, le cycle de vie des documents comptables,
et l'agrégation analytique réactive. Ces domaines ont des cycles de vie, des
modèles de données et des profils de charge distincts.

**Options évaluées**

| Option | Description |
|--------|-------------|
| Monolithe | Un seul service gérant tous les domaines |
| Microservices | Un service par domaine fonctionnel |

**Décision retenue**

Architecture microservices avec trois services métier indépendants.

**Justification**

Un monolithe aurait couplé des domaines aux contraintes incompatibles :

- Le domaine identité **(MS1)** gère des données **relationnelles stables** avec
  des contraintes d'intégrité fortes. Son profil de charge est dominé par les
  lectures — MS2 l'interroge à chaque création de document pour vérifier
  l'existence et l'assignation des acteurs.
- Le domaine document **(MS2)** concentre une **logique métier complexe** :
  transitions de statut strictes, validations cross-services, calculs fiscaux
  automatiques (TVA, arrondi 3 décimales), signature cryptographique SHA-256.
  Son taux d'écriture est élevé.
- Le domaine analytique **(MS3)** est **purement réactif** : il n'accepte aucune
  écriture directe depuis les requêtes utilisateur et réagit exclusivement aux
  événements Kafka produits par MS1 et MS2.

Mélanger ces trois domaines dans un seul processus aurait rendu impossible le
déploiement indépendant et la scalabilité ciblée. Une modification des règles
fiscales dans MS2 n'affecte pas MS1. Une surcharge de MS3 lors d'un pic de
calcul de KPIs n'impacte pas les performances de MS2.

---

### 3.2 Découpage des entités par microservice

**Contexte**

Le découpage des entités entre les services est une décision critique. Un mauvais
découpage génère du couplage fort, des appels gRPC excessifs et des incohérences
de données.

**Principe appliqué**

Le découpage suit le principe du **domaine métier cohérent** : chaque service
regroupe des entités qui partagent le même cycle de vie, les mêmes contraintes
et les mêmes acteurs.

**Résultat du découpage**

| Entité | Service | Justification |
|--------|---------|---------------|
| `Cabinet` | MS1 | Entité de référence stable, liée à `Comptable` et `Client` par clé étrangère |
| `Comptable` | MS1 | Appartient à un `Cabinet` — relation forte et permanente |
| `Client` | MS1 | Appartient à un `Cabinet` — relation forte et permanente |
| `Assignation` | MS1 | Lie `Comptable` à `Client` — relation M:N dans le même domaine identitaire |
| `Invoice` | MS2 | Cycle de vie propre, logique fiscale, signature cryptographique |
| `Declaration` | MS2 | Cycle de vie propre, validation par comptable certifié |
| `Alerte` | MS3 | Produite uniquement en réaction à des événements Kafka |
| `Stat` | MS3 | Calculée automatiquement à partir d'événements Kafka |
| `Report` | MS3 | Agrégé depuis MS1 et MS2 via gRPC — domaine analytique |
| `AuditLog` | MS3 | Trace immuable de toutes les opérations — domaine analytique |

**Règle de vérification du découpage**

Le découpage est valide si deux conditions sont respectées :

1. Une entité ne doit pas nécessiter de transaction distribuée avec une entité
   d'un autre service pour garantir sa cohérence.
2. Les appels cross-services doivent rester unidirectionnels — pas de dépendance
   circulaire (graphe orienté acyclique).

Ces deux conditions sont respectées : MS2 appelle MS1 (unidirectionnel), MS3
appelle MS1 et MS2 pour l'enrichissement des rapports (unidirectionnel), MS1
ne connaît ni MS2 ni MS3.

---

### 3.3 gRPC pour la communication inter-services

**Contexte**

Le Gateway doit appeler les trois microservices de manière synchrone pour
répondre aux requêtes clients. MS2 doit appeler MS1 pour vérifier les
assignations avant toute opération documentaire. MS3 doit appeler MS1 et MS2
pour enrichir les rapports.

**Options évaluées**

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| REST/HTTP | Simple, universel | Contrats informels, sérialisation JSON, pas de génération de code |
| gRPC | Contrats typés, sérialisation binaire, génération de code | Courbe d'apprentissage, moins lisible à l'œil nu |

**Décision retenue**

gRPC avec Protocol Buffers (proto3) pour toute communication synchrone
inter-services.

**Justification**

- **Contrats stricts** : les fichiers `.proto` définissent contractuellement
  chaque interface. Toute modification incompatible est détectée avant tout
  déploiement. Avec REST, un champ manquant dans une réponse peut passer
  inaperçu jusqu'en production.
- **Sérialisation binaire** : Protocol Buffers réduit la taille des payloads
  de 30 à 60 % par rapport au JSON. Sur des vérifications d'assignation
  effectuées à chaque création de document, cette différence est significative
  en termes de latence cumulée.
- **Génération de code** : les stubs client/serveur sont dérivés des fichiers
  `.proto`. Le développeur appelle des fonctions typées — la couche de transport
  est abstraite.

REST reste utilisé uniquement pour l'interface publique (Gateway → clients),
où la lisibilité et l'universalité priment sur la performance brute.

---

### 3.4 Apache Kafka pour les événements asynchrones

**Contexte**

MS1 et MS2 produisent des événements métier que MS3 doit consommer pour mettre
à jour les KPIs, créer des audit logs et générer des alertes. Cette communication
ne doit pas être synchrone — MS3 ne doit pas ralentir ni bloquer MS1 et MS2.

**Décision retenue**

Apache Kafka comme bus d'événements asynchrone.

**Justification**

Trois propriétés de Kafka sont critiques dans ce contexte :

**Persistance des événements** : Kafka conserve les messages sur disque avec
une rétention configurable. Si MS3 redémarre, il reprend la consommation à
partir du dernier offset commité — aucun événement n'est perdu. Un broker de
messages traditionnel (type AMQP) supprime les messages après consommation,
rendant impossible le rattrapage après une panne.

**Ordre garanti par partition** : tous les événements d'un même client sont
envoyés sur la même partition (clé = `client_id`). Cela garantit que les stats
mensuelles d'un client sont calculées dans l'ordre chronologique des événements.
Sans cette garantie, une facture créée après une déclaration pourrait être
traitée avant, produisant un `resultat_net` incohérent.

**Découplage total** : MS1 et MS2 publient leurs événements sans connaître MS3.
L'ajout d'un nouveau consommateur ne nécessiterait aucune modification de MS1
ou MS2.

---

### 3.5 SQLite pour MS1

**Contexte**

MS1 gère des entités fortement relationnelles avec des contraintes d'intégrité
structurelles : un comptable appartient obligatoirement à un cabinet, une
assignation lie obligatoirement un comptable et un client existants.

**Décision retenue**

SQLite comme base de données relationnelle embarquée.

**Justification**

Le modèle de MS1 — quatre entités avec des clés étrangères et une contrainte
d'unicité composite — s'exprime naturellement en SQL avec des `FOREIGN KEY` et
des contraintes `UNIQUE`. Ces contraintes sont appliquées par le moteur de base
de données, pas uniquement dans le code applicatif, ce qui garantit l'intégrité
des données même en cas de bug dans la couche service.

SQLite a été préféré à un SGBD client-serveur car l'absence de serveur externe
simplifie le déploiement, et le volume de MS1 — entités de référence changeant
peu — ne justifie pas la complexité opérationnelle d'un PostgreSQL ou MySQL.
La persistance sur disque est native : le fichier `ms1_identity.sqlite` survit
aux redémarrages du service.

---

### 3.6 RxDB pour MS2 et MS3

**Contexte**

MS2 gère des documents comptables dont la structure est semi-flexible et dont
les opérations sont massivement asynchrones. MS3 agrège des événements
hétérogènes dans quatre collections distinctes, avec un profil d'accès
dominé par les écritures Kafka et les lectures pour le dashboard.

**Décision retenue**

RxDB avec stockage in-memory comme base de données NoSQL orientée documents.

**Justification**

Les documents de MS2 et MS3 sont **autonomes et auto-contenus** : une facture
inclut directement `client_nom` (dénormalisé) et les montants calculés — aucun
JOIN n'est nécessaire pour la restituer complète. Ce modèle est naturellement
NoSQL.

L'API RxDB est entièrement basée sur des Promises (`insert()`,
`findOne().exec()`, `patch()`, `remove()`), ce qui s'intègre sans friction dans
le code Node.js entièrement en `async/await`. La validation JSON Schema via AJV
garantit l'intégrité de chaque document avant insertion, sans couche ORM
supplémentaire.

Le stockage in-memory est un choix assumé pour la phase actuelle : les documents
de MS2 sont régénérables depuis les appels gRPC, et les données analytiques de
MS3 sont régénérables depuis les événements Kafka. La migration vers un stockage
persistant (LevelDB, MongoDB) est prévue en phase de production sans
modification de la couche service.

---

### 3.7 API Gateway dual REST + GraphQL

**Contexte**

Les clients de l'API ont des besoins différents : opérations CRUD simples sur
des ressources isolées d'un côté, agrégations multi-sources complexes de
l'autre.

**Décision retenue**

API Gateway unique exposant simultanément REST et GraphQL.

**Justification**

REST est adapté aux opérations à sémantique claire (`POST` = créer, `PUT` =
modifier, `DELETE` = supprimer) sur des ressources isolées. Sa simplicité le
rend universel et facilement testable.

GraphQL répond à un besoin spécifique : la query `dashboard` doit agréger en
un seul appel les statistiques, alertes, rapports et audit logs d'un client
depuis MS3. Sans GraphQL, le client devrait effectuer quatre appels REST et
assembler les résultats côté client. Côté serveur, les quatre appels gRPC sont
exécutés en parallèle via `Promise.all`, minimisant la latence totale. Les deux
interfaces partagent la même couche gRPC vers les microservices — la duplication
de logique est nulle.

---

## 4. Description des composants

### 4.1 Vue d'ensemble des composants

```
┌──────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY  :3000                            │
│                   REST (Express)  |  GraphQL (Apollo)                │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ gRPC (Protocol Buffers)
           ┌────────────────┼──────────────────┐
           │                │                  │
           ▼                ▼                  ▼
    ┌────────────┐   ┌────────────┐   ┌─────────────┐
    │    MS1     │   │    MS2     │   │     MS3     │
    │  :50051    │◄──┤  :50052    │   │   :50053    │
    │  Identity  │   │  Document  │   │  Analytics  │
    │   SQLite   │   │   RxDB     │   │    RxDB     │
    └────────────┘   └─────┬──────┘   └──────▲──────┘
                           │                 │
           MS2 publie      │   MS3 consomme  │
                           ▼                 │
    ┌─────────────────────────────────────────────────────────────────┐
    │                    Apache Kafka  :9092                           │
    │   user.created | comptable.assigned | invoice.created           │
    │   invoice.signed | invoice.paid                                 │
    │   declaration.submitted | declaration.validated                 │
    └─────────────────────────────────────────────────────────────────┘
           ▲
      MS1 publie
```

---

### 4.2 API Gateway

**Responsabilité** : point d'entrée unique de la plateforme. Route les requêtes
vers les microservices via gRPC et agrège les résultats quand nécessaire.

| Aspect | Détail |
|--------|--------|
| Port | `3000` |
| Interfaces | REST (Express.js) + GraphQL (Apollo Server) |
| Base de données | Aucune — stateless |
| Logique métier | Aucune — délégation complète aux microservices |
| Gestion erreurs | Traduction codes gRPC → codes HTTP (`5→404`, `6→409`, `9→400`, `14→503`) |

**Ce service ne fait pas** : persistance de données, validation métier,
authentification dans la version actuelle.

---

### 4.3 MS1 — Identity Service

**Responsabilité** : source de vérité unique pour les identités et les relations
entre acteurs de la plateforme.

| Aspect | Détail |
|--------|--------|
| Port gRPC | `50051` |
| Base de données | SQLite — `ms1_identity.sqlite` — persistant sur disque |
| Services exposés | `CabinetService`, `ComptableService`, `ClientService`, `AssignationService` |
| Kafka produit | `user.created`, `comptable.assigned` |
| Kafka consomme | Aucun |
| Appels sortants | Aucun vers d'autres microservices |

**Ce service ne fait pas** : gestion des documents, calcul analytique,
connaissance de MS2 ou MS3.

---

### 4.4 MS2 — Document Service

**Responsabilité** : gestion du cycle de vie complet des documents comptables
et fiscaux avec application de toutes les règles métier associées.

| Aspect | Détail |
|--------|--------|
| Port gRPC | `50052` |
| Base de données | RxDB in-memory — `ms2_documents` — 2 collections |
| Services exposés | `InvoiceService`, `DeclarationService` |
| Kafka produit | `invoice.created`, `invoice.signed`, `invoice.paid`, `declaration.submitted`, `declaration.validated` |
| Kafka consomme | Aucun |
| Appels sortants | MS1 : `getClient`, `getComptable`, `getAssignationsByClient` |

**Ce service ne fait pas** : gestion des identités, calcul analytique,
modification des données MS1.

---

### 4.5 MS3 — Analytics Service

**Responsabilité** : agrégation réactive des données analytiques et traçabilité
complète des opérations de la plateforme.

| Aspect | Détail |
|--------|--------|
| Port gRPC | `50053` |
| Base de données | RxDB in-memory — `ms3_analytics` — 4 collections |
| Services exposés | `AlerteService`, `ReportService`, `StatService`, `AuditService` |
| Kafka produit | Aucun |
| Kafka consomme | 7 topics — tous ceux produits par MS1 et MS2 |
| Appels sortants | MS1 : `getClient` — MS2 : `getInvoice`, `getDeclaration` (enrichissement rapports) |

**Ce service ne fait pas** : validation de règles métier, écriture directe
de stats ou audit logs depuis les requêtes utilisateur.

---

## 5. Flux de données

### 5.1 Flux synchrone — Création d'une facture

Illustration de la coordination synchrone entre le Gateway, MS2 et MS1 lors
de la création d'une facture.

```
Client
  │  POST /api/invoices
  ▼
API Gateway
  │  gRPC CreateInvoice → MS2
  ▼
MS2 — invoiceService.createInvoice()
  │
  ├─ gRPC getClient(client_id)          → MS1  ← validé ✓
  ├─ gRPC getComptable(comptable_id)    → MS1  ← validé ✓
  ├─ gRPC getAssignationsByClient()     → MS1  ← assignation active ✓
  │
  ├─ calcul : tva_montant = montant_ht × tva_rate / 100
  ├─ calcul : montant_ttc = montant_ht + tva_montant
  ├─ génération numéro : TYPE-YYYYMMDD-RAND4
  ├─ insert RxDB (collection factures)
  └─ Kafka publish invoice.created  [fire-and-forget]

  ← InvoiceResponse { invoice }
Client ← HTTP 201 { invoice }
```

---

### 5.2 Flux asynchrone — Réaction de MS3 à invoice.created

Illustration du découplage asynchrone entre MS2 (producteur) et MS3
(consommateur).

```
MS2 publie invoice.created sur Kafka
  │
  ▼  (asynchrone — MS2 n'attend pas MS3)
Kafka broker — topic invoice.created
  │
  ▼
MS3 — consumer.handleInvoiceCreated(payload)
  │
  ├─ calculateAndSaveStats() {
  │    periode = YYYY-MM (mois courant)
  │    stat = findOne({ client_id, periode })
  │    SI existe → patch {
  │                  chiffre_affaires += montant_ht
  │                  tva_nette        += tva_montant
  │                  nb_factures      += 1
  │                  resultat_net      = CA - charges
  │                }
  │    SINON    → insert nouvelle Stat pour cette période
  │  }
  │
  ├─ createAuditLog { action: "create", entity_type: "facture" }
  │
  └─ SI statut == "impayee" →
       createAlerte { type: "impayee", severity: "warning" }
```

---

### 5.3 Flux agrégé — Query GraphQL dashboard

Illustration de l'agrégation parallèle effectuée par le Gateway.

```
Client
  │  POST /graphql { query: dashboard(client_id) }
  ▼
API Gateway — resolver dashboard()
  │
  │  Promise.all([    ← 4 appels gRPC lancés simultanément vers MS3
  │    getStatsByClient(client_id)
  │    getAlertes(client_id)
  │    getReportsByClient(client_id)
  │    getAuditLogsByClient(client_id)
  │  ])
  ▼
  ← { stats, alertes, reports, audit_logs }

Client ← HTTP 200 { data: { dashboard: { ... } } }
```

---

### 5.4 Flux de signature d'une facture

Illustration des vérifications et effets de bord lors de la signature.

```
Client
  │  PUT /api/invoices/:id/sign  { comptable_id }
  ▼
MS2 — invoiceService.signInvoice()
  │
  ├─ findOne(invoice_id)
  ├─ vérifier statut == "validee"
  │  (refus si : brouillon | signee | payee | envoyee)
  │
  ├─ gRPC getAssignationsByClient() → MS1  ← assignation active ✓
  │
  ├─ content = { invoice_id, numero, client_id,
  │              montant_ttc, comptable_id, signed_at }
  ├─ signature_hash = SHA256(JSON.stringify(content))
  ├─ patch { statut: "signee", signature_hash, signed_by, signed_at }
  └─ Kafka publish invoice.signed  [fire-and-forget]

Client ← HTTP 200 { success, signature_hash, signed_at }
```

---

## 6. Contraintes et limites connues

### 6.1 Contraintes techniques actuelles

| Contrainte | Impact | Mitigation prévue |
|------------|--------|-------------------|
| RxDB in-memory (MS2, MS3) | Perte des données au redémarrage | Migration vers stockage persistant (LevelDB, MongoDB) en production |
| Pas d'authentification | Toutes les routes sont publiques | Intégration JWT / OAuth2 prévue en phase 2 |
| Pas de rate limiting | Exposition aux abus | Middleware `express-rate-limit` prévu |
| Consumer Kafka `fromBeginning: false` | MS3 ne traite pas les événements antérieurs à son premier démarrage | Acceptable en développement |

### 6.2 Limites structurelles de la conception

**Cohérence éventuelle**

La communication entre MS2 et MS3 étant asynchrone via Kafka, il existe un
délai structurellement non nul entre la création d'une facture dans MS2 et la
mise à jour des KPIs dans MS3. Le système est **eventuellement cohérent** sur
ce point — propriété inhérente aux architectures événementielles.

**Absence de garantie de livraison forte**

Le pattern fire-and-forget utilisé pour la publication Kafka (`.catch()` qui
logue l'erreur sans faire échouer la requête principale) accepte le risque
qu'un événement ne soit pas publié en cas de panne Kafka au moment exact de
la publication. Un pattern **outbox** serait nécessaire pour une cohérence
garantie en production.

**Dénormalisation**

Les champs `client_nom` et `cabinet_nom` sont dénormalisés dans les documents
MS2 et MS3. Si le nom d'un client change dans MS1, les documents existants ne
sont pas mis à jour automatiquement. Ce choix est intentionnel pour optimiser
les performances de lecture — il évite des appels gRPC vers MS1 à chaque
restitution d'un document.

---

## 7. Tests

### 7.1 Workspace Postman

L'ensemble des endpoints REST et GraphQL de la plateforme est couvert par des
collections Postman organisées par service.

**Lien :**  
[https://blue-comet-423439.postman.co/workspace/771f21e8-c154-4de0-b582-39f8c3bf263d](https://blue-comet-423439.postman.co/workspace/771f21e8-c154-4de0-b582-39f8c3bf263d)

### 7.2 Collections disponibles

| Collection | Couverture |
|------------|-----------|
| `MS1_REST_API` | Cabinets, Comptables, Clients, Assignations |
| `MS1_graphql` | Queries et mutations GraphQL MS1 |
| `MS2_RESTAPI` | Factures, Déclarations |
| `MS2_graphql` | Queries et mutations GraphQL MS2 |
| `MS3_Rest-API` | Alertes, Rapports, Stats, Audit, Dashboard |

### 7.3 Ordre de test recommandé

Les entités ayant des dépendances entre elles, l'ordre suivant doit être respecté :

```
1. POST /api/cabinets          → créer un cabinet
2. POST /api/comptables        → créer un comptable (utiliser cabinet_id)
3. POST /api/clients           → créer un client (utiliser cabinet_id)
4. POST /api/assignations      → assigner le comptable au client
5. POST /api/invoices          → créer une facture
6. PUT  /api/invoices/:id      → passer la facture en "validee"
7. PUT  /api/invoices/:id/sign → signer la facture
8. POST /api/invoices/declarations     → créer une déclaration
9. PUT  /api/invoices/declarations/:id/validate → valider la déclaration
10. GET /api/analytics/dashboard/:client_id     → vérifier KPIs et audit logs
```

---

## 8. Index de la documentation

Ce document est le point d'entrée de la documentation technique du projet.
Les détails d'implémentation sont répartis dans les fichiers suivants :

| Document | Contenu |
|----------|---------|
| [`02-endpoints-rest.md`](./02-endpoints-rest.md) | Description complète de tous les endpoints REST — méthodes, routes, body, réponses, codes d'erreur |
| [`03-schema-graphql.md`](./03-schema-graphql.md) | Types GraphQL, queries, mutations avec exemples complets |
| [`04-kafka-topics.md`](./04-kafka-topics.md) | Les 7 topics Kafka — payloads, producteurs, consommateurs, actions déclenchées |
| [`05-bases-de-donnees.md`](./05-bases-de-donnees.md) | Schémas SQLite et RxDB complets — tables, collections, contraintes, requêtes |
| [`06-installation-execution.md`](./06-installation-execution.md) | Prérequis, installation, Docker Compose, exécution locale, résolution des problèmes |
| [`07-proto-files.md`](./07-proto-files.md) | Description de tous les fichiers `.proto` — messages, services, conventions |
| [`architecture-diagram.drawio`](./architecture-diagram.drawio) | Schéma d'architecture importable dans draw.io |
| [`README.md`](./README.md) | Guide de démarrage rapide |
