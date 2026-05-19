# Description des fichiers `.proto`

> Les fichiers Protocol Buffers (`.proto`) définissent les **contrats de communication**
> entre les microservices via gRPC. Ils sont la source de vérité pour toutes les
> interfaces inter-services : tout appel gRPC doit respecter strictement les types,
> champs et méthodes définis dans ces fichiers.
>
> **Syntaxe utilisée :** `proto3`  
> **Localisation :** chaque service possède son propre dossier `proto/`

---

## Table des matières

1. [Rôle des fichiers proto](#1-rôle-des-fichiers-proto)
2. [Organisation par service](#2-organisation-par-service)
3. [MS1 — Identity Service](#3-ms1--identity-service)
   - [common.proto](#31-commonproto)
   - [cabinet.proto](#32-cabinetproto)
   - [comptable.proto](#33-comptableproto)
   - [client.proto](#34-clientproto)
   - [assignation.proto](#35-assignationproto)
4. [MS2 — Document Service](#4-ms2--document-service)
   - [invoice.proto](#41-invoiceproto)
   - [declaration.proto](#42-declarationproto)
5. [MS3 — Analytics Service](#5-ms3--analytics-service)
   - [alerte.proto](#51-alerteproto)
   - [report.proto](#52-reportproto)
   - [stat.proto](#53-statproto)
   - [audit.proto](#54-auditproto)
6. [Conventions et types de données](#6-conventions-et-types-de-données)
7. [Correspondance proto ↔ JavaScript](#7-correspondance-proto--javascript)

---

## 1. Rôle des fichiers proto

Un fichier `.proto` définit trois éléments :

- **Les messages** : structures de données échangées entre services (équivalent des
  modèles ou DTOs). Chaque champ a un type, un nom et un numéro de champ unique.
- **Les services** : interfaces exposées par un microservice, listant les méthodes
  RPC disponibles avec leur message d'entrée et de sortie.
- **Les règles de sérialisation** : les messages sont sérialisés en binaire
  (Protocol Buffers) avant transmission, ce qui réduit la taille des payloads
  de 30 à 60% par rapport au JSON.

En pratique, le Gateway charge les fichiers `.proto` de chaque service au démarrage
via `@grpc/proto-loader` pour instancier les clients gRPC correspondants. Chaque
microservice charge ses propres fichiers `.proto` pour enregistrer ses handlers.

---

## 2. Organisation par service

```
MS1-User-Service/proto/
├── common.proto        ← Partagé entre tous les services MS1
├── cabinet.proto       ← Service CabinetService
├── comptable.proto     ← Service ComptableService
├── client.proto        ← Service ClientService
└── assignation.proto   ← Service AssignationService

MS2-Document-Service/proto/
├── common.proto        ← Copie locale du common.proto
├── invoice.proto       ← Service InvoiceService
└── declaration.proto   ← Service DeclarationService

MS3-Analytics-Service/proto/
├── common.proto        ← Copie locale du common.proto
├── alerte.proto        ← Service AlerteService
├── report.proto        ← Service ReportService
├── stat.proto          ← Service StatService
└── audit.proto         ← Service AuditService
```

> **Note :** `common.proto` est dupliqué dans chaque service pour garantir
> l'autonomie de déploiement. Chaque service peut être déployé indépendamment
> sans dépendre d'un dossier partagé externe.

---

## 3. MS1 — Identity Service

---

### 3.1 `common.proto`

**Package :** `common`  
**Utilisé par :** tous les services MS1, MS2, MS3

```protobuf
syntax = "proto3";

package common;

// EmptyRequest — utilisé par toutes les méthodes GetAll
// qui ne nécessitent pas de paramètre d'entrée
message EmptyRequest {}
```

**Rôle :** `EmptyRequest` est le message vide utilisé comme paramètre d'entrée pour
toutes les méthodes de liste (`GetAllCabinets`, `GetAllClients`, etc.). En proto3,
une méthode RPC doit toujours avoir un message d'entrée et de sortie — `EmptyRequest`
remplit ce rôle pour les méthodes sans paramètre.

---

### 3.2 `cabinet.proto`

**Package :** `cabinet`  
**Service exposé :** `CabinetService`  
**Port gRPC :** `50051`

```protobuf
syntax = "proto3";
import "common.proto";
package cabinet;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Cabinet {
  string id         = 1;
  string nom        = 2;
  string adresse    = 3;
  string email      = 4;
  string telephone  = 5;
  string created_at = 6;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateCabinetRequest {
  string nom       = 1;
  string adresse   = 2;
  string email     = 3;
  string telephone = 4;
}

message GetCabinetRequest {
  string id = 1;
}

// ── RESPONSES ────────────────────────────────────────────────────────────────
message CabinetResponse      { Cabinet          cabinet  = 1; }
message CabinetsListResponse { repeated Cabinet cabinets = 1; }

// ── SERVICE ──────────────────────────────────────────────────────────────────
service CabinetService {
  rpc CreateCabinet  (CreateCabinetRequest) returns (CabinetResponse);
  rpc GetCabinet     (GetCabinetRequest)    returns (CabinetResponse);
  rpc GetAllCabinets (common.EmptyRequest)  returns (CabinetsListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateCabinet` | `CreateCabinetRequest` | `CabinetResponse` | Crée un nouveau cabinet |
| `GetCabinet` | `GetCabinetRequest` | `CabinetResponse` | Retourne un cabinet par son `id` |
| `GetAllCabinets` | `EmptyRequest` | `CabinetsListResponse` | Retourne tous les cabinets |

**Description des champs — message `Cabinet`**

| Champ | Type proto3 | N° | Description |
|-------|-------------|-----|-------------|
| `id` | `string` | 1 | UUID v4 — identifiant unique |
| `nom` | `string` | 2 | Nom du cabinet |
| `adresse` | `string` | 3 | Adresse physique |
| `email` | `string` | 4 | Email unique du cabinet |
| `telephone` | `string` | 5 | Numéro de téléphone |
| `created_at` | `string` | 6 | Timestamp ISO 8601 |

---

### 3.3 `comptable.proto`

**Package :** `comptable`  
**Service exposé :** `ComptableService`  
**Port gRPC :** `50051`

```protobuf
syntax = "proto3";
import "common.proto";
package comptable;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Comptable {
  string id             = 1;
  string nom            = 2;
  string email          = 3;
  string telephone      = 4;
  string specialite     = 5;  // fiscal | audit | paie | juridique
  string cabinet_id     = 6;
  string cabinet_nom    = 7;  // dénormalisé
  string ordre_ordinal  = 8;
  string numero_licence = 9;
  string created_at     = 10;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateComptableRequest {
  string nom            = 1;
  string email          = 2;
  string telephone      = 3;
  string specialite     = 4;
  string cabinet_id     = 5;
  string ordre_ordinal  = 6;
  string numero_licence = 7;
}

message GetComptableRequest              { string id         = 1; }
message GetComptablesBySpecialiteRequest { string specialite = 1; }

// ── RESPONSES ────────────────────────────────────────────────────────────────
message ComptableResponse      { Comptable          comptable  = 1; }
message ComptablesListResponse { repeated Comptable comptables = 1; }

// ── SERVICE ──────────────────────────────────────────────────────────────────
service ComptableService {
  rpc CreateComptable           (CreateComptableRequest)            returns (ComptableResponse);
  rpc GetComptable              (GetComptableRequest)               returns (ComptableResponse);
  rpc GetAllComptables          (common.EmptyRequest)               returns (ComptablesListResponse);
  rpc GetComptablesBySpecialite (GetComptablesBySpecialiteRequest)  returns (ComptablesListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateComptable` | `CreateComptableRequest` | `ComptableResponse` | Crée un comptable rattaché à un cabinet |
| `GetComptable` | `GetComptableRequest` | `ComptableResponse` | Retourne un comptable par son `id` |
| `GetAllComptables` | `EmptyRequest` | `ComptablesListResponse` | Retourne tous les comptables |
| `GetComptablesBySpecialite` | `GetComptablesBySpecialiteRequest` | `ComptablesListResponse` | Filtre les comptables par spécialité |

**Description des champs — message `Comptable`**

| Champ | Type proto3 | N° | Description |
|-------|-------------|-----|-------------|
| `id` | `string` | 1 | UUID v4 |
| `nom` | `string` | 2 | Nom complet |
| `email` | `string` | 3 | Email unique |
| `telephone` | `string` | 4 | Numéro de téléphone |
| `specialite` | `string` | 5 | `fiscal` `audit` `paie` `juridique` |
| `cabinet_id` | `string` | 6 | UUID du cabinet d'appartenance |
| `cabinet_nom` | `string` | 7 | Nom du cabinet — dénormalisé, retourné directement |
| `ordre_ordinal` | `string` | 8 | Inscription à l'ordre des experts-comptables |
| `numero_licence` | `string` | 9 | Numéro de licence professionnelle |
| `created_at` | `string` | 10 | Timestamp ISO 8601 |

---

### 3.4 `client.proto`

**Package :** `client`  
**Service exposé :** `ClientService`  
**Port gRPC :** `50051`

```protobuf
syntax = "proto3";
import "common.proto";
package client;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Client {
  string id               = 1;
  string nom              = 2;
  string email            = 3;
  string telephone        = 4;
  string type             = 5;   // societe | patente | personne_physique
  string matricule_fiscal = 6;
  string cabinet_id       = 7;
  string cabinet_nom      = 8;   // dénormalisé
  string adresse          = 9;
  string created_at       = 10;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateClientRequest {
  string nom              = 1;
  string email            = 2;
  string telephone        = 3;
  string type             = 4;
  string matricule_fiscal = 5;
  string cabinet_id       = 6;
  string adresse          = 7;
}

message GetClientRequest { string id = 1; }

// ── RESPONSES ────────────────────────────────────────────────────────────────
message ClientResponse      { Client          client  = 1; }
message ClientsListResponse { repeated Client clients = 1; }

// ── SERVICE ──────────────────────────────────────────────────────────────────
service ClientService {
  rpc CreateClient  (CreateClientRequest) returns (ClientResponse);
  rpc GetClient     (GetClientRequest)    returns (ClientResponse);
  rpc GetAllClients (common.EmptyRequest) returns (ClientsListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateClient` | `CreateClientRequest` | `ClientResponse` | Crée un client — publie `user.created` sur Kafka |
| `GetClient` | `GetClientRequest` | `ClientResponse` | Retourne un client par son `id` — utilisé par MS2 pour vérification |
| `GetAllClients` | `EmptyRequest` | `ClientsListResponse` | Retourne tous les clients |

**Description des champs — message `Client`**

| Champ | Type proto3 | N° | Description |
|-------|-------------|-----|-------------|
| `id` | `string` | 1 | UUID v4 |
| `nom` | `string` | 2 | Nom de l'entité |
| `email` | `string` | 3 | Email unique |
| `telephone` | `string` | 4 | Numéro de téléphone |
| `type` | `string` | 5 | `societe` `patente` `personne_physique` |
| `matricule_fiscal` | `string` | 6 | Identifiant fiscal tunisien |
| `cabinet_id` | `string` | 7 | UUID du cabinet |
| `cabinet_nom` | `string` | 8 | Nom du cabinet — dénormalisé |
| `adresse` | `string` | 9 | Adresse physique |
| `created_at` | `string` | 10 | Timestamp ISO 8601 |

---

### 3.5 `assignation.proto`

**Package :** `assignation`  
**Service exposé :** `AssignationService`  
**Port gRPC :** `50051`

```protobuf
syntax = "proto3";
package assignation;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message ComptableClient {
  string id           = 1;
  string comptable_id = 2;
  string client_id    = 3;
  string specialite   = 4;
  string date_debut   = 5;
  string statut       = 6;   // actif | inactif
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message AssignComptableRequest {
  string comptable_id = 1;
  string client_id    = 2;
  string specialite   = 3;
}

message GetAssignationsRequest { string client_id = 1; }

// ── RESPONSES ────────────────────────────────────────────────────────────────
message ComptableClientResponse  { ComptableClient            assignation  = 1; }
message AssignationsListResponse { repeated ComptableClient   assignations = 1; }

// ── SERVICE ──────────────────────────────────────────────────────────────────
service AssignationService {
  rpc AssignComptableToClient (AssignComptableRequest)  returns (ComptableClientResponse);
  rpc GetAssignationsByClient (GetAssignationsRequest)  returns (AssignationsListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `AssignComptableToClient` | `AssignComptableRequest` | `ComptableClientResponse` | Crée une assignation — publie `comptable.assigned` sur Kafka |
| `GetAssignationsByClient` | `GetAssignationsRequest` | `AssignationsListResponse` | Retourne toutes les assignations actives d'un client — appelé par MS2 avant chaque création de document |

**Description des champs — message `ComptableClient`**

| Champ | Type proto3 | N° | Description |
|-------|-------------|-----|-------------|
| `id` | `string` | 1 | UUID v4 de l'assignation |
| `comptable_id` | `string` | 2 | UUID du comptable |
| `client_id` | `string` | 3 | UUID du client |
| `specialite` | `string` | 4 | `fiscal` `audit` `paie` `juridique` |
| `date_debut` | `string` | 5 | Date de début ISO 8601 |
| `statut` | `string` | 6 | `actif` `inactif` |

---

## 4. MS2 — Document Service

---

### 4.1 `invoice.proto`

**Package :** `invoice`  
**Service exposé :** `InvoiceService`  
**Port gRPC :** `50052`

```protobuf
syntax = "proto3";
import "common.proto";
package invoice;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Invoice {
  string id             = 1;
  string type           = 2;   // standard | steg | sonede | internet | loyer | honoraires
  string numero         = 3;
  string client_id      = 4;
  string client_nom     = 5;
  string comptable_id   = 6;
  double montant_ht     = 7;
  double tva_rate       = 8;   // 7.0 | 13.0 | 19.0
  double tva_montant    = 9;
  double montant_ttc    = 10;
  string statut         = 11;  // brouillon | validee | signee | envoyee | payee
  string signature_hash = 12;
  string signed_by      = 13;
  string signed_at      = 14;
  string details_json   = 15;
  string created_at     = 16;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateInvoiceRequest {
  string type         = 1;
  string client_id    = 2;
  string client_nom   = 3;
  string comptable_id = 4;
  double montant_ht   = 5;
  double tva_rate     = 6;
  string details_json = 7;
}

message UpdateInvoiceRequest {
  string invoice_id   = 1;
  double montant_ht   = 2;
  double tva_rate     = 3;
  string details_json = 4;
  string statut       = 5;
}

message DeleteInvoiceRequest   { string invoice_id = 1; }
message GetInvoiceRequest      { string id = 1; }
message GetClientInvoicesRequest { string client_id = 1; }

message SignInvoiceRequest {
  string invoice_id   = 1;
  string comptable_id = 2;
}

// ── RESPONSES ────────────────────────────────────────────────────────────────
message InvoiceResponse      { Invoice          invoice  = 1; }
message InvoicesListResponse { repeated Invoice invoices = 1; }

message SignResponse {
  bool   success        = 1;
  string signature_hash = 2;
  string signed_at      = 3;
}

message DeleteResponse {
  bool   success = 1;
  string message = 2;
}

// ── SERVICE ──────────────────────────────────────────────────────────────────
service InvoiceService {
  rpc CreateInvoice     (CreateInvoiceRequest)      returns (InvoiceResponse);
  rpc UpdateInvoice     (UpdateInvoiceRequest)      returns (InvoiceResponse);
  rpc DeleteInvoice     (DeleteInvoiceRequest)      returns (DeleteResponse);
  rpc SignInvoice       (SignInvoiceRequest)         returns (SignResponse);
  rpc GetInvoice        (GetInvoiceRequest)          returns (InvoiceResponse);
  rpc GetClientInvoices (GetClientInvoicesRequest)   returns (InvoicesListResponse);
  rpc GetAllInvoices    (common.EmptyRequest)        returns (InvoicesListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateInvoice` | `CreateInvoiceRequest` | `InvoiceResponse` | Crée une facture en `brouillon` — publie `invoice.created` |
| `UpdateInvoice` | `UpdateInvoiceRequest` | `InvoiceResponse` | Modifie statut ou montants — publie `invoice.paid` si `payee` |
| `DeleteInvoice` | `DeleteInvoiceRequest` | `DeleteResponse` | Supprime une facture en `brouillon` |
| `SignInvoice` | `SignInvoiceRequest` | `SignResponse` | Signe une facture validée — publie `invoice.signed` |
| `GetInvoice` | `GetInvoiceRequest` | `InvoiceResponse` | Retourne une facture par son `id` |
| `GetClientInvoices` | `GetClientInvoicesRequest` | `InvoicesListResponse` | Retourne les factures d'un client |
| `GetAllInvoices` | `EmptyRequest` | `InvoicesListResponse` | Retourne toutes les factures |

**Description des champs — message `Invoice`**

| Champ | Type proto3 | N° | Description |
|-------|-------------|-----|-------------|
| `id` | `string` | 1 | UUID v4 |
| `type` | `string` | 2 | Type de document |
| `numero` | `string` | 3 | Numéro généré automatiquement |
| `client_id` | `string` | 4 | UUID du client |
| `client_nom` | `string` | 5 | Nom du client — dénormalisé |
| `comptable_id` | `string` | 6 | UUID du comptable |
| `montant_ht` | `double` | 7 | Montant hors taxe |
| `tva_rate` | `double` | 8 | Taux TVA : `7.0` `13.0` `19.0` |
| `tva_montant` | `double` | 9 | TVA calculée |
| `montant_ttc` | `double` | 10 | TTC calculé |
| `statut` | `string` | 11 | État courant |
| `signature_hash` | `string` | 12 | Hash SHA-256 de la signature |
| `signed_by` | `string` | 13 | UUID du signataire |
| `signed_at` | `string` | 14 | Timestamp de signature |
| `details_json` | `string` | 15 | Métadonnées JSON stringifiées |
| `created_at` | `string` | 16 | Timestamp de création |

---

### 4.2 `declaration.proto`

**Package :** `declaration`  
**Service exposé :** `DeclarationService`  
**Port gRPC :** `50052`

```protobuf
syntax = "proto3";
import "common.proto";
package declaration;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Declaration {
  string id           = 1;
  string client_id    = 2;
  string client_nom   = 3;
  string comptable_id = 4;
  string type         = 5;   // TVA | IS | IRPP | CNSS
  string periode      = 6;
  double montant      = 7;
  string statut       = 8;   // brouillon | soumise | validee
  string validated_by = 9;
  string validated_at = 10;
  string created_at   = 11;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateDeclarationRequest {
  string client_id    = 1;
  string client_nom   = 2;
  string comptable_id = 3;
  string type         = 4;
  string periode      = 5;
  double montant      = 6;
}

message UpdateDeclarationRequest {
  string declaration_id = 1;
  double montant        = 2;
  string periode        = 3;
}

message DeleteDeclarationRequest   { string declaration_id = 1; }
message GetDeclarationRequest      { string id = 1; }
message GetClientDeclarationsRequest { string client_id = 1; }

message ValidateDeclarationRequest {
  string declaration_id = 1;
  string comptable_id   = 2;
}

// ── RESPONSES ────────────────────────────────────────────────────────────────
message DeclarationResponse      { Declaration          declaration  = 1; }
message DeclarationsListResponse { repeated Declaration declarations = 1; }

message DeleteResponse {
  bool   success = 1;
  string message = 2;
}

// ── SERVICE ──────────────────────────────────────────────────────────────────
service DeclarationService {
  rpc CreateDeclaration     (CreateDeclarationRequest)     returns (DeclarationResponse);
  rpc UpdateDeclaration     (UpdateDeclarationRequest)     returns (DeclarationResponse);
  rpc DeleteDeclaration     (DeleteDeclarationRequest)     returns (DeleteResponse);
  rpc ValidateDeclaration   (ValidateDeclarationRequest)   returns (DeclarationResponse);
  rpc GetDeclaration        (GetDeclarationRequest)        returns (DeclarationResponse);
  rpc GetClientDeclarations (GetClientDeclarationsRequest) returns (DeclarationsListResponse);
  rpc GetAllDeclarations    (common.EmptyRequest)          returns (DeclarationsListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateDeclaration` | `CreateDeclarationRequest` | `DeclarationResponse` | Crée une déclaration en `brouillon` — publie `declaration.submitted` |
| `UpdateDeclaration` | `UpdateDeclarationRequest` | `DeclarationResponse` | Modifie montant ou période (`brouillon` uniquement) |
| `DeleteDeclaration` | `DeleteDeclarationRequest` | `DeleteResponse` | Supprime une déclaration en `brouillon` |
| `ValidateDeclaration` | `ValidateDeclarationRequest` | `DeclarationResponse` | Valide — publie `declaration.validated` |
| `GetDeclaration` | `GetDeclarationRequest` | `DeclarationResponse` | Retourne une déclaration par son `id` |
| `GetClientDeclarations` | `GetClientDeclarationsRequest` | `DeclarationsListResponse` | Retourne les déclarations d'un client |
| `GetAllDeclarations` | `EmptyRequest` | `DeclarationsListResponse` | Retourne toutes les déclarations |

---

## 5. MS3 — Analytics Service

---

### 5.1 `alerte.proto`

**Package :** `alerte`  
**Service exposé :** `AlerteService`  
**Port gRPC :** `50053`

```protobuf
syntax = "proto3";
import "common.proto";
package alerte;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Alerte {
  string id          = 1;
  string client_id   = 2;
  string type        = 3;   // echeance | impayee | anomalie
  string message     = 4;
  string severity    = 5;   // info | warning | critical
  string entity_id   = 6;
  string entity_type = 7;   // facture | declaration
  bool   is_read     = 8;
  string created_at  = 9;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateAlerteRequest {
  string client_id   = 1;
  string type        = 2;
  string message     = 3;
  string severity    = 4;
  string entity_id   = 5;
  string entity_type = 6;
}

message GetAlertesRequest { string client_id = 1; }

// ── RESPONSES ────────────────────────────────────────────────────────────────
message AlerteResponse      { Alerte          alerte  = 1; }
message AlertesListResponse { repeated Alerte alertes = 1; }

// ── SERVICE ──────────────────────────────────────────────────────────────────
service AlerteService {
  rpc CreateAlerte  (CreateAlerteRequest) returns (AlerteResponse);
  rpc GetAlertes    (GetAlertesRequest)   returns (AlertesListResponse);
  rpc GetAllAlertes (common.EmptyRequest) returns (AlertesListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateAlerte` | `CreateAlerteRequest` | `AlerteResponse` | Crée une alerte (manuellement ou via Kafka consumer) |
| `GetAlertes` | `GetAlertesRequest` | `AlertesListResponse` | Retourne les alertes d'un client |
| `GetAllAlertes` | `EmptyRequest` | `AlertesListResponse` | Retourne toutes les alertes |

---

### 5.2 `report.proto`

**Package :** `report`  
**Service exposé :** `ReportService`  
**Port gRPC :** `50053`

```protobuf
syntax = "proto3";
import "common.proto";
package report;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Report {
  string id         = 1;
  string client_id  = 2;
  string type       = 3;   // financier | fiscal | tresorerie
  string periode    = 4;   // 2025-Q1 | 2025-01
  string statut     = 5;   // genere | valide | archive
  string contenu    = 6;   // JSON stringifié
  string created_at = 7;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message CreateReportRequest {
  string client_id = 1;
  string type      = 2;
  string periode   = 3;
  string contenu   = 4;
}

message GetReportRequest           { string id = 1; }
message GetReportsByClientRequest  { string client_id = 1; }
message DeleteReportRequest        { string id = 1; }

message UpdateReportRequest {
  string id      = 1;
  string statut  = 2;
  string contenu = 3;
}

// ── RESPONSES ────────────────────────────────────────────────────────────────
message ReportResponse      { Report          report  = 1; }
message ReportsListResponse { repeated Report reports = 1; }

message DeleteReportResponse {
  bool   success = 1;
  string message = 2;
}

// ── SERVICE ──────────────────────────────────────────────────────────────────
service ReportService {
  rpc CreateReport       (CreateReportRequest)      returns (ReportResponse);
  rpc GetReport          (GetReportRequest)         returns (ReportResponse);
  rpc GetReportsByClient (GetReportsByClientRequest) returns (ReportsListResponse);
  rpc GetAllReports      (common.EmptyRequest)      returns (ReportsListResponse);
  rpc UpdateReport       (UpdateReportRequest)      returns (ReportResponse);
  rpc DeleteReport       (DeleteReportRequest)      returns (DeleteReportResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `CreateReport` | `CreateReportRequest` | `ReportResponse` | Crée un rapport enrichi depuis MS1/MS2 |
| `GetReport` | `GetReportRequest` | `ReportResponse` | Retourne un rapport par son `id` |
| `GetReportsByClient` | `GetReportsByClientRequest` | `ReportsListResponse` | Retourne les rapports d'un client |
| `GetAllReports` | `EmptyRequest` | `ReportsListResponse` | Retourne tous les rapports |
| `UpdateReport` | `UpdateReportRequest` | `ReportResponse` | Modifie le statut ou le contenu |
| `DeleteReport` | `DeleteReportRequest` | `DeleteReportResponse` | Supprime un rapport |

---

### 5.3 `stat.proto`

**Package :** `stat`  
**Service exposé :** `StatService`  
**Port gRPC :** `50053`

```protobuf
syntax = "proto3";
import "common.proto";
package stat;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message Stat {
  string id               = 1;
  string client_id        = 2;
  string periode          = 3;   // YYYY-MM
  double chiffre_affaires = 4;
  double total_charges    = 5;
  double tva_nette        = 6;
  double resultat_net     = 7;
  int32  nb_factures      = 8;
  int32  nb_declarations  = 9;
  string created_at       = 10;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message GetStatRequest         { string id = 1; }
message GetStatsByClientRequest { string client_id = 1; }

// ── RESPONSES ────────────────────────────────────────────────────────────────
message StatResponse      { Stat          stat  = 1; }
message StatsListResponse { repeated Stat stats = 1; }

// ── SERVICE ──────────────────────────────────────────────────────────────────
service StatService {
  rpc GetStat          (GetStatRequest)          returns (StatResponse);
  rpc GetStatsByClient (GetStatsByClientRequest)  returns (StatsListResponse);
  rpc GetAllStats      (common.EmptyRequest)      returns (StatsListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `GetStat` | `GetStatRequest` | `StatResponse` | Retourne une stat par son `id` |
| `GetStatsByClient` | `GetStatsByClientRequest` | `StatsListResponse` | Retourne l'historique des KPIs d'un client |
| `GetAllStats` | `EmptyRequest` | `StatsListResponse` | Retourne toutes les stats |

> **Note :** `StatService` n'expose pas de méthode `CreateStat` via gRPC.
> Les stats sont créées et mises à jour **exclusivement** par le consumer Kafka
> de MS3 — elles ne sont jamais écrites directement via gRPC.

**Description des champs — message `Stat`**

| Champ | Type proto3 | N° | Description |
|-------|-------------|-----|-------------|
| `id` | `string` | 1 | UUID v4 |
| `client_id` | `string` | 2 | UUID du client |
| `periode` | `string` | 3 | Mois — format `YYYY-MM` |
| `chiffre_affaires` | `double` | 4 | Somme des `montant_ht` des factures du mois |
| `total_charges` | `double` | 5 | Somme des montants des déclarations du mois |
| `tva_nette` | `double` | 6 | Somme des `tva_montant` des factures du mois |
| `resultat_net` | `double` | 7 | `chiffre_affaires - total_charges` |
| `nb_factures` | `int32` | 8 | Nombre de factures créées ce mois |
| `nb_declarations` | `int32` | 9 | Nombre de déclarations soumises ce mois |
| `created_at` | `string` | 10 | Timestamp ISO 8601 |

---

### 5.4 `audit.proto`

**Package :** `audit`  
**Service exposé :** `AuditService`  
**Port gRPC :** `50053`

```protobuf
syntax = "proto3";
import "common.proto";
package audit;

// ── ENTITÉ ──────────────────────────────────────────────────────────────────
message AuditLog {
  string id           = 1;
  string client_id    = 2;
  string action       = 3;   // create | update | delete | submit | validate | sign | pay
  string entity_type  = 4;   // facture | declaration | user | assignation
  string entity_id    = 5;
  string performed_by = 6;   // UUID ou "system"
  string details      = 7;   // JSON stringifié
  string created_at   = 8;
}

// ── REQUESTS ─────────────────────────────────────────────────────────────────
message GetAuditLogsByClientRequest {
  string client_id = 1;
}

message GetAuditLogsByEntityRequest {
  string entity_type = 1;
  string entity_id   = 2;
}

// ── RESPONSES ────────────────────────────────────────────────────────────────
message AuditLogsListResponse { repeated AuditLog audit_logs = 1; }

// ── SERVICE — lecture uniquement ─────────────────────────────────────────────
service AuditService {
  rpc GetAuditLogsByClient (GetAuditLogsByClientRequest) returns (AuditLogsListResponse);
  rpc GetAuditLogsByEntity (GetAuditLogsByEntityRequest) returns (AuditLogsListResponse);
  rpc GetAllAuditLogs      (common.EmptyRequest)         returns (AuditLogsListResponse);
}
```

**Description des méthodes**

| Méthode RPC | Request | Response | Description |
|-------------|---------|----------|-------------|
| `GetAuditLogsByClient` | `GetAuditLogsByClientRequest` | `AuditLogsListResponse` | Retourne tous les logs d'un client |
| `GetAuditLogsByEntity` | `GetAuditLogsByEntityRequest` | `AuditLogsListResponse` | Retourne les logs d'une entité spécifique |
| `GetAllAuditLogs` | `EmptyRequest` | `AuditLogsListResponse` | Retourne tous les logs |

> **Note :** `AuditService` est un service **lecture uniquement**. Aucune méthode
> d'écriture n'est exposée via gRPC. Les audit logs sont créés exclusivement par
> le consumer Kafka de MS3 en réaction aux événements métier.

---

## 6. Conventions et types de données

### Types proto3 utilisés

| Type proto3 | Équivalent JavaScript | Usage dans le projet |
|-------------|----------------------|----------------------|
| `string` | `string` | UUIDs, noms, timestamps, JSON stringifiés |
| `double` | `number` | Montants financiers (montant_ht, tva_rate, etc.) |
| `int32` | `number` | Compteurs entiers (nb_factures, nb_declarations) |
| `bool` | `boolean` | Flags (is_read dans Alerte) |
| `repeated T` | `Array<T>` | Listes de ressources (invoices, clients, etc.) |

### Numérotation des champs

En proto3, chaque champ a un **numéro unique et immuable**. Ce numéro est utilisé
lors de la sérialisation binaire — c'est lui qui identifie le champ, pas son nom.

```protobuf
message Example {
  string id  = 1;   // ← Le "= 1" est le numéro de champ, pas la valeur
  string nom = 2;
}
```

> ⚠️ **Important :** ne jamais réutiliser un numéro de champ supprimé. Si un champ
> est retiré d'un message, son numéro doit rester réservé pour éviter des conflits
> de désérialisation avec des clients utilisant une ancienne version du proto.

### Valeurs par défaut proto3

En proto3, tous les champs ont une valeur par défaut si non renseignés :

| Type | Valeur par défaut |
|------|------------------|
| `string` | `""` (chaîne vide) |
| `double` | `0.0` |
| `int32` | `0` |
| `bool` | `false` |
| `repeated` | `[]` (liste vide) |

---

## 7. Correspondance proto ↔ JavaScript

Le chargement des fichiers `.proto` en Node.js est effectué avec `@grpc/proto-loader`
et l'option `keepCase: true` :

```javascript
const LOADER_OPTIONS = {
    keepCase: true,   // Conserve les noms en snake_case (montant_ht, client_id...)
    longs:    String, // Les types int64 sont convertis en string
    enums:    String, // Les enums sont convertis en string
    defaults: true,   // Inclut les champs avec leurs valeurs par défaut
    oneofs:   true,   // Inclut les champs oneof
};
```

**Impact de `keepCase: true`** : sans cette option, `@grpc/proto-loader` convertirait
les noms de champs en camelCase (`montantHt`, `clientId`). Avec `keepCase: true`,
les noms restent en snake_case (`montant_ht`, `client_id`) — cohérent avec les
noms de champs utilisés dans toute la base de code JavaScript.

**Impact sur les noms de méthodes** : avec `keepCase: true`, les méthodes RPC
sont également accessibles en camelCase dans les clients gRPC JavaScript :

```javascript
// Méthode proto : CreateCabinet
// Accessible en JavaScript comme :
cabinetClient.createCabinet(request, callback);

// Méthode proto : GetAllCabinets
// Accessible en JavaScript comme :
cabinetClient.getAllCabinets(request, callback);
```
