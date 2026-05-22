# Description des Endpoints gRPC

> Les endpoints gRPC sont les interfaces de communication **directe entre microservices**.
> Contrairement au REST qui passe par l'API Gateway, les appels gRPC s'effectuent
> directement sur les ports des microservices via Protocol Buffers (proto3).
>
> **Outil de test :** Postman (New → gRPC Request) ou grpcurl  
> **Prérequis :** importer le fichier `.proto` correspondant dans Postman  
> **Sérialisation :** binaire (Protocol Buffers) — pas de JSON sur le réseau

---

## Table des matières

1. [Comment tester les endpoints gRPC](#1-comment-tester-les-endpoints-grpc)
2. [MS1 — Identity Service](#2-ms1--identity-service-port-50051)
   - [CabinetService](#21-cabinetservice)
   - [ComptableService](#22-comptableservice)
   - [ClientService](#23-clientservice)
   - [AssignationService](#24-assignationservice)
3. [MS2 — Document Service](#3-ms2--document-service-port-50052)
   - [InvoiceService](#31-invoiceservice)
   - [DeclarationService](#32-declarationservice)
4. [MS3 — Analytics Service](#4-ms3--analytics-service-port-50053)
   - [AlerteService](#41-alerteservice)
   - [ReportService](#42-reportservice)
   - [StatService](#43-statservice)
   - [AuditService](#44-auditservice)
5. [Codes d'erreur gRPC](#5-codes-derreur-grpc)
6. [Ordre de test recommandé](#6-ordre-de-test-recommandé)

---

## 1. Comment tester les endpoints gRPC

### Configuration dans Postman

```
1. Ouvrir Postman
2. Cliquer New → gRPC Request
3. Entrer l'URL du service (sans http://)
4. Cliquer "Import a .proto file"
5. Sélectionner le fichier proto depuis le projet
6. Choisir le service et la méthode
7. Aller dans l'onglet "Message" (pas Metadata)
8. Écrire le body JSON
9. Cliquer Invoke
```

### Localisation des fichiers proto

```
MS1 : projet/MS1-User-Service/proto/
      ├── common.proto
      ├── cabinet.proto
      ├── comptable.proto
      ├── client.proto
      └── assignation.proto

MS2 : projet/MS2-Document-Service/proto/
      ├── common.proto
      ├── invoice.proto
      └── declaration.proto

MS3 : projet/MS3-Analytics-Service/proto/
      ├── common.proto
      ├── alerte.proto
      ├── report.proto
      ├── stat.proto
      └── audit.proto
```

### Différence entre gRPC et REST

| Aspect | gRPC | REST |
|--------|------|------|
| Port | `50051` `50052` `50053` | `3000` |
| Format | Protocol Buffers (binaire) | JSON |
| Contrat | Fichier `.proto` obligatoire | Optionnel (OpenAPI) |
| Usage | Communication inter-services | Interface publique clients |
| Test | Postman gRPC / grpcurl | Postman REST / curl |

### Pourquoi tester gRPC directement ?

Tester gRPC directement prouve que chaque microservice fonctionne
**indépendamment du Gateway**. C'est une démonstration de l'architecture
microservices — chaque service est autonome et accessible sur son port propre.

---

## 2. MS1 — Identity Service (Port `50051`)

> **URL Postman :** `localhost:50051`  
> **Base de données :** SQLite — `ms1_identity.sqlite`  
> **Proto à importer :** selon le service testé

---

### 2.1 CabinetService

**Proto à importer :** `cabinet.proto`

---

#### `CreateCabinet` — Créer un cabinet

**Explication :** crée un nouveau cabinet comptable. Le cabinet est la structure
de base — il doit exister avant de créer des comptables ou des clients.

```
Service : CabinetService / CreateCabinet
Onglet  : Message
```

**Body :**
```json
{
  "nom":       "Cabinet Expertise Comptable",
  "email":     "contact@cabinet.tn",
  "adresse":   "Lac 2, Tunis",
  "telephone": "+216 71 000 000"
}
```

**Champs obligatoires :** `nom`, `email`  
**Champs optionnels :** `adresse`, `telephone`

**Réponse attendue :**
```json
{
  "cabinet": {
    "id":         "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
    "nom":        "Cabinet Expertise Comptable",
    "email":      "contact@cabinet.tn",
    "adresse":    "Lac 2, Tunis",
    "telephone":  "+216 71 000 000",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

> ⚠️ **Sauvegarder le `id`** — utilisé dans toutes les étapes suivantes.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `6 ALREADY_EXISTS` | Email déjà utilisé | Un cabinet avec cet email existe déjà |
| `13 INTERNAL` | Erreur serveur | Problème base de données |

---

#### `GetCabinet` — Obtenir un cabinet par ID

**Explication :** retourne les détails d'un cabinet spécifique.

```
Service : CabinetService / GetCabinet
Onglet  : Message
```

**Body :**
```json
{
  "id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890"
}
```

**Réponse attendue :**
```json
{
  "cabinet": {
    "id":         "a1b2c3d4-...",
    "nom":        "Cabinet Expertise Comptable",
    "email":      "contact@cabinet.tn",
    "adresse":    "Lac 2, Tunis",
    "telephone":  "+216 71 000 000",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Cabinet non trouvé : {id} | ID inexistant |

---

#### `GetAllCabinets` — Lister tous les cabinets

**Explication :** retourne la liste complète des cabinets triés par nom.
Utilise `EmptyRequest` car aucun paramètre n'est nécessaire.

```
Service : CabinetService / GetAllCabinets
Onglet  : Message
```

**Body :**
```json
{}
```

**Réponse attendue :**
```json
{
  "cabinets": [
    {
      "id":         "a1b2c3d4-...",
      "nom":        "Cabinet Expertise Comptable",
      "email":      "contact@cabinet.tn",
      "adresse":    "Lac 2, Tunis",
      "telephone":  "+216 71 000 000",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 2.2 ComptableService

**Proto à importer :** `comptable.proto`

---

#### `CreateComptable` — Créer un comptable

**Explication :** crée un expert-comptable certifié rattaché à un cabinet.
MS1 vérifie que le `cabinet_id` existe avant l'insertion.

```
Service : ComptableService / CreateComptable
Onglet  : Message
```

**Body :**
```json
{
  "nom":            "Ahmed Ben Ali",
  "email":          "ahmed@cabinet.tn",
  "telephone":      "+216 99 000 001",
  "specialite":     "fiscal",
  "cabinet_id":     "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "ordre_ordinal":  "OEC-2025-001",
  "numero_licence": "LIC-2025-001"
}
```

**Champs obligatoires :** `nom`, `email`, `specialite`, `cabinet_id`  
**Valeurs `specialite` :** `fiscal` `audit` `paie` `juridique`

**Réponse attendue :**
```json
{
  "comptable": {
    "id":             "b2c3d4e5-...",
    "nom":            "Ahmed Ben Ali",
    "email":          "ahmed@cabinet.tn",
    "telephone":      "+216 99 000 001",
    "specialite":     "fiscal",
    "cabinet_id":     "a1b2c3d4-...",
    "cabinet_nom":    "Cabinet Expertise Comptable",
    "ordre_ordinal":  "OEC-2025-001",
    "numero_licence": "LIC-2025-001",
    "created_at":     "2025-01-15T10:31:00.000Z"
  }
}
```

> Le champ `cabinet_nom` est retourné directement — dénormalisé depuis la table `cabinets`.

> ⚠️ **Sauvegarder le `id`** du comptable.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Cabinet non trouvé : {id} | `cabinet_id` inexistant |
| `6 ALREADY_EXISTS` | Email déjà utilisé | Doublon email |

---

#### `GetComptable` — Obtenir un comptable par ID

```
Service : ComptableService / GetComptable
Onglet  : Message
```

**Body :**
```json
{
  "id": "b2c3d4e5-..."
}
```

**Réponse attendue :**
```json
{
  "comptable": {
    "id":          "b2c3d4e5-...",
    "nom":         "Ahmed Ben Ali",
    "specialite":  "fiscal",
    "cabinet_nom": "Cabinet Expertise Comptable",
    "created_at":  "2025-01-15T10:31:00.000Z"
  }
}
```

---

#### `GetAllComptables` — Lister tous les comptables

**Explication :** retourne tous les comptables avec leur cabinet associé,
triés par nom.

```
Service : ComptableService / GetAllComptables
Onglet  : Message
```

**Body :**
```json
{}
```

---

#### `GetComptablesBySpecialite` — Filtrer par spécialité

**Explication :** retourne uniquement les comptables d'une spécialité donnée.
Utile pour trouver un comptable fiscal, d'audit, etc.

```
Service : ComptableService / GetComptablesBySpecialite
Onglet  : Message
```

**Body :**
```json
{
  "specialite": "fiscal"
}
```

**Valeurs acceptées :** `fiscal` `audit` `paie` `juridique`

**Réponse attendue :**
```json
{
  "comptables": [
    {
      "id":          "b2c3d4e5-...",
      "nom":         "Ahmed Ben Ali",
      "specialite":  "fiscal",
      "cabinet_nom": "Cabinet Expertise Comptable"
    }
  ]
}
```

---

### 2.3 ClientService

**Proto à importer :** `client.proto`

---

#### `CreateClient` — Créer un client

**Explication :** crée un client (entreprise ou professionnel). MS1 vérifie
que le `cabinet_id` existe. Après la création, MS1 publie automatiquement
l'événement Kafka `user.created` → MS3 crée un audit log.

```
Service : ClientService / CreateClient
Onglet  : Message
```

**Body :**
```json
{
  "nom":              "SARL TechTunisie",
  "email":            "contact@techtunisie.tn",
  "telephone":        "+216 71 000 002",
  "type":             "societe",
  "matricule_fiscal": "1234567/A/M/000",
  "cabinet_id":       "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "adresse":          "Lac 2, Tunis"
}
```

**Champs obligatoires :** `nom`, `email`, `type`, `cabinet_id`  
**Valeurs `type` :** `societe` `patente` `personne_physique`

**Réponse attendue :**
```json
{
  "client": {
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
}
```

> ⚠️ **Sauvegarder le `id`** du client.

**Effet Kafka :** publication automatique de `user.created` → MS3 crée un `AuditLog`.

---

#### `GetClient` — Obtenir un client par ID

**Explication :** cette méthode est aussi appelée par MS2 via gRPC pour
vérifier l'existence du client avant toute création de facture ou déclaration.

```
Service : ClientService / GetClient
Onglet  : Message
```

**Body :**
```json
{
  "id": "c3d4e5f6-..."
}
```

**Réponse attendue :**
```json
{
  "client": {
    "id":               "c3d4e5f6-...",
    "nom":              "SARL TechTunisie",
    "type":             "societe",
    "matricule_fiscal": "1234567/A/M/000",
    "cabinet_nom":      "Cabinet Expertise Comptable"
  }
}
```

---

#### `GetAllClients` — Lister tous les clients

```
Service : ClientService / GetAllClients
Onglet  : Message
```

**Body :**
```json
{}
```

---

### 2.4 AssignationService

**Proto à importer :** `assignation.proto`

---

#### `AssignComptableToClient` — Créer une assignation

**Explication :** crée le lien contractuel entre un comptable et un client
pour une spécialité donnée. Cette assignation est **obligatoire** avant
toute création de facture ou déclaration dans MS2. MS1 vérifie l'existence
du comptable ET du client avant d'insérer. Publie `comptable.assigned`
sur Kafka → MS3 crée un audit log.

```
Service : AssignationService / AssignComptableToClient
Onglet  : Message
```

**Body :**
```json
{
  "comptable_id": "b2c3d4e5-...",
  "client_id":    "c3d4e5f6-...",
  "specialite":   "fiscal"
}
```

**Valeurs `specialite` :** `fiscal` `audit` `paie` `juridique`

**Réponse attendue :**
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

**Règle métier :** `UNIQUE (comptable_id, client_id, specialite)` —
si l'assignation existe déjà, elle est remplacée (`INSERT OR REPLACE`).

**Effet Kafka :** publication automatique de `comptable.assigned` → MS3 crée un `AuditLog`.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Comptable non trouvé : {id} | `comptable_id` inexistant |
| `5 NOT_FOUND` | Client non trouvé : {id} | `client_id` inexistant |

---

#### `GetAssignationsByClient` — Lister les assignations d'un client

**Explication :** retourne toutes les assignations actives d'un client.
Cette méthode est aussi appelée par MS2 pour vérifier qu'une assignation
active existe entre un client et un comptable avant toute opération.

```
Service : AssignationService / GetAssignationsByClient
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

**Réponse attendue :**
```json
{
  "assignations": [
    {
      "id":           "d4e5f6a7-...",
      "comptable_id": "b2c3d4e5-...",
      "client_id":    "c3d4e5f6-...",
      "specialite":   "fiscal",
      "date_debut":   "2025-01-15T10:33:00.000Z",
      "statut":       "actif"
    }
  ]
}
```

---

## 3. MS2 — Document Service (Port `50052`)

> **URL Postman :** `localhost:50052`  
> **Base de données :** RxDB in-memory — `ms2_documents`  
> **Prérequis :** avoir `client_id`, `comptable_id` et une assignation active depuis MS1

---

### 3.1 InvoiceService

**Proto à importer :** `invoice.proto`

#### Cycle de vie d'une facture

```
brouillon → validee → signee → envoyee → payee
                   ↘                  ↗
```

- Montants modifiables : **brouillon uniquement**
- Signature possible : **validee uniquement**
- `payee` : état final — aucune modification possible

---

#### `CreateInvoice` — Créer une facture

**Explication :** crée une facture en statut `brouillon`. Avant l'insertion,
MS2 appelle MS1 via gRPC pour vérifier : existence du client, existence du
comptable, assignation active. Calcule automatiquement `tva_montant` et
`montant_ttc`. Publie `invoice.created` sur Kafka → MS3 met à jour les stats.

```
Service : InvoiceService / CreateInvoice
Onglet  : Message
```

**Body :**
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

**Valeurs `type` :** `standard` `steg` `sonede` `internet` `loyer` `honoraires`  
**Valeurs `tva_rate` :** `7.0` `13.0` `19.0`

**Calculs automatiques :**
```
tva_montant = montant_ht × tva_rate / 100  → 1000 × 19 / 100 = 190.000
montant_ttc = montant_ht + tva_montant     → 1000 + 190 = 1190.000
numero      = TYPE-YYYYMMDD-RAND4          → STA-20250115-4823
```

**Réponse attendue :**
```json
{
  "invoice": {
    "id":             "e5f6a7b8-...",
    "type":           "standard",
    "numero":         "STA-20250115-4823",
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
}
```

> ⚠️ **Sauvegarder le `id`** de la facture.

**Effet Kafka :** `invoice.created` → MS3 met à jour `chiffre_affaires`,
`tva_nette`, `nb_factures` dans les stats + crée un `AuditLog`.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Client non trouvé | `client_id` inexistant dans MS1 |
| `5 NOT_FOUND` | Comptable non trouvé | `comptable_id` inexistant dans MS1 |
| `9 FAILED_PRECONDITION` | Aucune assignation active | Assignation manquante |

---

#### `GetInvoice` — Obtenir une facture par ID

```
Service : InvoiceService / GetInvoice
Onglet  : Message
```

**Body :**
```json
{
  "id": "e5f6a7b8-..."
}
```

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Facture non trouvée : {id} | Facture inexistante |

---

#### `GetAllInvoices` — Lister toutes les factures

```
Service : InvoiceService / GetAllInvoices
Onglet  : Message
```

**Body :**
```json
{}
```

---

#### `GetClientInvoices` — Factures d'un client

**Explication :** retourne toutes les factures d'un client spécifique,
triées par date de création décroissante.

```
Service : InvoiceService / GetClientInvoices
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

---

#### `UpdateInvoice` — Modifier une facture

**Explication :** permet deux types de modifications selon le contexte :
- Modifier les montants → seulement en statut `brouillon`
- Changer le statut → selon les transitions autorisées

```
Service : InvoiceService / UpdateInvoice
Onglet  : Message
```

**Test A — Modifier les montants (statut brouillon) :**
```json
{
  "invoice_id":   "e5f6a7b8-...",
  "montant_ht":   1200.000,
  "tva_rate":     19.0,
  "details_json": "{\"description\": \"Consultation fiscale Q1 2025 révisée\"}",
  "statut":       ""
}
```

**Test B — Passer en `validee` :**
```json
{
  "invoice_id":   "e5f6a7b8-...",
  "montant_ht":   0,
  "tva_rate":     0,
  "details_json": "",
  "statut":       "validee"
}
```

**Test C — Passer en `envoyee` (après signature) :**
```json
{
  "invoice_id":   "e5f6a7b8-...",
  "montant_ht":   0,
  "tva_rate":     0,
  "details_json": "",
  "statut":       "envoyee"
}
```

**Test D — Passer en `payee` (état final) :**
```json
{
  "invoice_id":   "e5f6a7b8-...",
  "montant_ht":   0,
  "tva_rate":     0,
  "details_json": "",
  "statut":       "payee"
}
```

**Transitions autorisées :**

| Statut actuel | Transitions possibles |
|---------------|----------------------|
| `brouillon` | `validee` |
| `validee` | `envoyee` `payee` |
| `signee` | `envoyee` `payee` |
| `envoyee` | `payee` |
| `payee` | aucune (état final) |

**Effet Kafka (si passage à `payee`) :** publication de `invoice.paid` →
MS3 crée un `AuditLog` avec action `pay`.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Facture non trouvée | ID inexistant |
| `9 FAILED_PRECONDITION` | Transition invalide | Statut non autorisé |
| `9 FAILED_PRECONDITION` | Impossible de modifier les montants | Hors statut brouillon |
| `9 FAILED_PRECONDITION` | Aucun champ à modifier | Body vide |

---

#### `SignInvoice` — Signer une facture

**Explication :** signe une facture validée avec un hash SHA-256 unique.
Avant la signature, MS2 vérifie que le comptable est bien assigné au client.
Le hash est calculé sur les données immuables de la facture.

```
Service : InvoiceService / SignInvoice
Onglet  : Message
```

**Body :**
```json
{
  "invoice_id":   "e5f6a7b8-...",
  "comptable_id": "b2c3d4e5-..."
}
```

**Calcul du hash SHA-256 :**
```javascript
content = {
  invoice_id, numero, client_id,
  montant_ttc, comptable_id, signed_at
}
signature_hash = SHA256(JSON.stringify(content))
```

**Réponse attendue :**
```json
{
  "success":        true,
  "signature_hash": "a3f9c2d8e1b4f7a2c5d9e3b6f8a1c4d7e2b5f9a3c6d8e1b4...",
  "signed_at":      "2025-01-15T11:00:00.000Z"
}
```

**Effet Kafka :** publication de `invoice.signed` → MS3 crée un `AuditLog`
avec `action: "sign"` et `details: { signature_hash }`.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Facture non trouvée | ID inexistant |
| `9 FAILED_PRECONDITION` | Facture déjà signée | Statut déjà `signee` |
| `9 FAILED_PRECONDITION` | Facture en brouillon | Doit être validée d'abord |
| `9 FAILED_PRECONDITION` | Impossible de signer — statut `payee` | Statut final |
| `9 FAILED_PRECONDITION` | Aucune assignation active | Comptable non assigné |

---

#### `DeleteInvoice` — Supprimer une facture

**Explication :** supprime définitivement une facture. Seules les factures
en statut `brouillon` peuvent être supprimées — une facture validée ou
signée ne peut pas être effacée.

```
Service : InvoiceService / DeleteInvoice
Onglet  : Message
```

**Body :**
```json
{
  "invoice_id": "e5f6a7b8-..."
}
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Facture e5f6a7b8-... supprimée avec succès"
}
```

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `5 NOT_FOUND` | Facture non trouvée | ID inexistant |
| `9 FAILED_PRECONDITION` | Impossible de supprimer — statut : "validee" | Hors statut brouillon |

---

### 3.2 DeclarationService

**Proto à importer :** `declaration.proto`

#### Cycle de vie d'une déclaration

```
brouillon → soumise → validee
```

- Modifiable : **brouillon uniquement**
- Supprimable : **brouillon uniquement**
- Validation : nécessite une assignation active vérifiée dans MS1

---

#### `CreateDeclaration` — Créer une déclaration fiscale

**Explication :** crée une déclaration fiscale en statut `brouillon`. MS2
vérifie client, comptable et assignation dans MS1. Règle métier : un seul
brouillon par triplet `(client_id, type, periode)`. Publie
`declaration.submitted` sur Kafka → MS3 met à jour les stats et crée une alerte.

```
Service : DeclarationService / CreateDeclaration
Onglet  : Message
```

**Body :**
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

**Valeurs `type` :** `TVA` `IS` `IRPP` `CNSS`  
**Format `periode` :** `YYYY-MM` (ex: `2025-01`)

**Réponse attendue :**
```json
{
  "declaration": {
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
}
```

> ⚠️ **Sauvegarder le `id`** de la déclaration.

**Effet Kafka :** `declaration.submitted` → MS3 met à jour `total_charges`,
`nb_declarations` dans les stats + crée `AuditLog` + crée `Alerte` de type `echeance`.

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `9 FAILED_PRECONDITION` | Déclaration TVA déjà en brouillon pour période 2025-01 | Doublon métier |
| `5 NOT_FOUND` | Client non trouvé | `client_id` inexistant |
| `9 FAILED_PRECONDITION` | Aucune assignation active | Assignation manquante |

---

#### `GetDeclaration` — Obtenir une déclaration par ID

```
Service : DeclarationService / GetDeclaration
Onglet  : Message
```

**Body :**
```json
{
  "id": "f6a7b8c9-..."
}
```

---

#### `GetAllDeclarations` — Lister toutes les déclarations

```
Service : DeclarationService / GetAllDeclarations
Onglet  : Message
```

**Body :**
```json
{}
```

---

#### `GetClientDeclarations` — Déclarations d'un client

```
Service : DeclarationService / GetClientDeclarations
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

---

#### `UpdateDeclaration` — Modifier une déclaration

**Explication :** modifie le montant ou la période d'une déclaration en
statut `brouillon` uniquement. Au moins un champ doit être fourni.

```
Service : DeclarationService / UpdateDeclaration
Onglet  : Message
```

**Body :**
```json
{
  "declaration_id": "f6a7b8c9-...",
  "montant":        4200.000,
  "periode":        "2025-02"
}
```

**Réponse attendue :**
```json
{
  "declaration": {
    "id":      "f6a7b8c9-...",
    "montant": 4200.000,
    "periode": "2025-02",
    "statut":  "brouillon"
  }
}
```

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `9 FAILED_PRECONDITION` | Impossible de modifier — statut : "validee" | Hors brouillon |
| `9 FAILED_PRECONDITION` | Déclaration TVA déjà en brouillon pour 2025-02 | Conflit période |
| `9 FAILED_PRECONDITION` | Aucun champ à modifier | Body vide |

---

#### `ValidateDeclaration` — Valider une déclaration

**Explication :** passe la déclaration en statut `validee`. Vérifie
l'assignation active dans MS1. Publie `declaration.validated` sur Kafka →
MS3 crée un `AuditLog` et une `Alerte` d'information.

```
Service : DeclarationService / ValidateDeclaration
Onglet  : Message
```

**Body :**
```json
{
  "declaration_id": "f6a7b8c9-...",
  "comptable_id":   "b2c3d4e5-..."
}
```

**Réponse attendue :**
```json
{
  "declaration": {
    "id":           "f6a7b8c9-...",
    "statut":       "validee",
    "validated_by": "b2c3d4e5-...",
    "validated_at": "2025-01-15T11:30:00.000Z"
  }
}
```

**Effet Kafka :** `declaration.validated` → MS3 crée `AuditLog` (action:
`validate`) + `Alerte` (type: `echeance`, severity: `info`).

**Erreurs possibles :**

| Code gRPC | Message | Cause |
|-----------|---------|-------|
| `9 FAILED_PRECONDITION` | Déclaration déjà validée | Statut déjà `validee` |
| `9 FAILED_PRECONDITION` | Aucune assignation active | Comptable non assigné |

---

#### `DeleteDeclaration` — Supprimer une déclaration

**Explication :** supprime une déclaration en statut `brouillon` uniquement.

```
Service : DeclarationService / DeleteDeclaration
Onglet  : Message
```

**Body :**
```json
{
  "declaration_id": "f6a7b8c9-..."
}
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Déclaration f6a7b8c9-... supprimée avec succès"
}
```

---

## 4. MS3 — Analytics Service (Port `50053`)

> **URL Postman :** `localhost:50053`  
> **Base de données :** RxDB in-memory — `ms3_analytics`  
> **Note :** les stats et audit logs sont créés automatiquement par Kafka —
> MS3 expose uniquement des interfaces de lecture pour ces deux entités.

---

### 4.1 AlerteService

**Proto à importer :** `alerte.proto`

---

#### `CreateAlerte` — Créer une alerte manuellement

**Explication :** crée une alerte manuellement. Dans le flux normal, les
alertes sont créées automatiquement par le consumer Kafka de MS3 — cette
méthode permet de créer des alertes ponctuelles sans passer par un événement.

```
Service : AlerteService / CreateAlerte
Onglet  : Message
```

**Body :**
```json
{
  "client_id":   "c3d4e5f6-...",
  "type":        "anomalie",
  "message":     "Test alerte manuelle depuis Postman gRPC",
  "severity":    "critical",
  "entity_id":   "e5f6a7b8-...",
  "entity_type": "facture"
}
```

**Valeurs `type` :** `echeance` `impayee` `anomalie`  
**Valeurs `severity` :** `info` `warning` `critical`  
**Valeurs `entity_type` :** `facture` `declaration`

**Réponse attendue :**
```json
{
  "alerte": {
    "id":          "a7b8c9d0-...",
    "client_id":   "c3d4e5f6-...",
    "type":        "anomalie",
    "message":     "Test alerte manuelle depuis Postman gRPC",
    "severity":    "critical",
    "entity_id":   "e5f6a7b8-...",
    "entity_type": "facture",
    "is_read":     false,
    "created_at":  "2025-01-15T12:00:00.000Z"
  }
}
```

---

#### `GetAlertes` — Alertes d'un client

**Explication :** retourne toutes les alertes d'un client spécifique,
triées par date décroissante. Inclut les alertes créées manuellement ET
celles créées automatiquement par Kafka.

```
Service : AlerteService / GetAlertes
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

**Réponse attendue :**
```json
{
  "alertes": [
    {
      "type":        "anomalie",
      "message":     "Test alerte manuelle depuis Postman gRPC",
      "severity":    "critical",
      "is_read":     false
    },
    {
      "type":        "echeance",
      "message":     "Déclaration TVA validée pour la période 2025-01",
      "severity":    "info",
      "entity_type": "declaration",
      "is_read":     false
    },
    {
      "type":        "echeance",
      "message":     "Déclaration TVA soumise pour la période 2025-01",
      "severity":    "info",
      "entity_type": "declaration",
      "is_read":     false
    }
  ]
}
```

> Les deux dernières alertes ont été créées **automatiquement par Kafka**
> lors des tests MS2 — preuve du fonctionnement du bus d'événements.

---

#### `GetAllAlertes` — Lister toutes les alertes

```
Service : AlerteService / GetAllAlertes
Onglet  : Message
```

**Body :**
```json
{}
```

---

### 4.2 ReportService

**Proto à importer :** `report.proto`

---

#### `CreateReport` — Créer un rapport

**Explication :** crée un rapport financier ou fiscal. MS3 enrichit
automatiquement le contenu en appelant MS1 (données client) et MS2
(factures, déclarations) via gRPC.

```
Service : ReportService / CreateReport
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-...",
  "type":      "fiscal",
  "periode":   "2025-Q1",
  "contenu":   "{}"
}
```

**Valeurs `type` :** `financier` `fiscal` `tresorerie`  
**Format `periode` :** `YYYY-Q{n}` ou `YYYY-MM`

**Réponse attendue :**
```json
{
  "report": {
    "id":         "b8c9d0e1-...",
    "client_id":  "c3d4e5f6-...",
    "type":       "fiscal",
    "periode":    "2025-Q1",
    "statut":     "genere",
    "contenu":    "{\"client\":{\"id\":\"...\",\"nom\":\"SARL TechTunisie\",\"matricule_fiscal\":\"1234567/A/M/000\"}}",
    "created_at": "2025-01-15T12:10:00.000Z"
  }
}
```

> Le champ `contenu` est enrichi automatiquement — MS3 a appelé MS1 via
> gRPC pour récupérer les données du client.

> ⚠️ **Sauvegarder le `id`** du rapport.

---

#### `GetReport` — Obtenir un rapport par ID

```
Service : ReportService / GetReport
Onglet  : Message
```

**Body :**
```json
{
  "id": "b8c9d0e1-..."
}
```

---

#### `GetAllReports` — Lister tous les rapports

```
Service : ReportService / GetAllReports
Onglet  : Message
```

**Body :**
```json
{}
```

---

#### `GetReportsByClient` — Rapports d'un client

```
Service : ReportService / GetReportsByClient
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

---

#### `UpdateReport` — Modifier un rapport

**Explication :** modifie le statut ou le contenu d'un rapport existant.

```
Service : ReportService / UpdateReport
Onglet  : Message
```

**Body :**
```json
{
  "id":      "b8c9d0e1-...",
  "statut":  "valide",
  "contenu": "{\"synthese\": \"Rapport Q1 2025 validé par le comptable\"}"
}
```

**Valeurs `statut` :** `genere` `valide` `archive`

**Réponse attendue :**
```json
{
  "report": {
    "id":     "b8c9d0e1-...",
    "statut": "valide"
  }
}
```

---

#### `DeleteReport` — Supprimer un rapport

```
Service : ReportService / DeleteReport
Onglet  : Message
```

**Body :**
```json
{
  "id": "b8c9d0e1-..."
}
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Rapport b8c9d0e1-... supprimé avec succès"
}
```

---

### 4.3 StatService

**Proto à importer :** `stat.proto`

> **Important :** les statistiques sont créées et mises à jour **exclusivement**
> par le consumer Kafka de MS3. Il n'existe pas de méthode `CreateStat` via gRPC —
> ce service expose uniquement des interfaces de lecture.

---

#### `GetAllStats` — Lister toutes les statistiques

**Explication :** retourne les KPIs mensuels de tous les clients, calculés
automatiquement par Kafka lors des créations de factures et déclarations.

```
Service : StatService / GetAllStats
Onglet  : Message
```

**Body :**
```json
{}
```

**Réponse attendue :**
```json
{
  "stats": [
    {
      "id":               "c9d0e1f2-...",
      "client_id":        "c3d4e5f6-...",
      "periode":          "2025-01",
      "chiffre_affaires": 1200.000,
      "total_charges":    4200.000,
      "tva_nette":        228.000,
      "resultat_net":     -3000.000,
      "nb_factures":      1,
      "nb_declarations":  1,
      "created_at":       "2025-01-15T10:34:00.000Z"
    }
  ]
}
```

> Ces stats ont été calculées **automatiquement par Kafka** — aucun appel
> direct n'a été effectué pour les créer.

---

#### `GetStatsByClient` — KPIs d'un client

**Explication :** retourne l'historique mensuel des KPIs d'un client.

```
Service : StatService / GetStatsByClient
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

---

#### `GetStat` — Obtenir une stat par ID

```
Service : StatService / GetStat
Onglet  : Message
```

**Body :**
```json
{
  "id": "c9d0e1f2-..."
}
```

---

### 4.4 AuditService

**Proto à importer :** `audit.proto`

> **Important :** les audit logs sont créés **exclusivement** par le consumer
> Kafka de MS3 — ce service expose uniquement des interfaces de lecture.
> Aucune méthode d'écriture n'est exposée via gRPC.

---

#### `GetAllAuditLogs` — Lister tous les audit logs

**Explication :** retourne la traçabilité complète de toutes les opérations
effectuées sur la plateforme. Chaque action métier (création, signature,
validation) génère automatiquement un log via Kafka.

```
Service : AuditService / GetAllAuditLogs
Onglet  : Message
```

**Body :**
```json
{}
```

**Réponse attendue :**
```json
{
  "audit_logs": [
    {
      "id":           "d0e1f2a3-...",
      "client_id":    "c3d4e5f6-...",
      "action":       "create",
      "entity_type":  "user",
      "entity_id":    "c3d4e5f6-...",
      "performed_by": "system",
      "details":      "{\"cabinet_id\":\"a1b2c3d4-...\"}",
      "created_at":   "2025-01-15T10:32:00.000Z"
    },
    {
      "action":       "create",
      "entity_type":  "assignation",
      "performed_by": "system",
      "created_at":   "2025-01-15T10:33:00.000Z"
    },
    {
      "action":       "create",
      "entity_type":  "facture",
      "performed_by": "system",
      "created_at":   "2025-01-15T10:34:00.000Z"
    },
    {
      "action":       "sign",
      "entity_type":  "facture",
      "performed_by": "b2c3d4e5-...",
      "details":      "{\"signature_hash\":\"a3f9c2...\",\"numero\":\"STA-20250115-4823\"}",
      "created_at":   "2025-01-15T11:00:00.000Z"
    },
    {
      "action":       "submit",
      "entity_type":  "declaration",
      "performed_by": "system",
      "created_at":   "2025-01-15T11:10:00.000Z"
    },
    {
      "action":       "validate",
      "entity_type":  "declaration",
      "performed_by": "b2c3d4e5-...",
      "created_at":   "2025-01-15T11:30:00.000Z"
    }
  ]
}
```

> Tous ces logs ont été créés **automatiquement par Kafka** — preuve de la
> traçabilité complète via le bus d'événements.

---

#### `GetAuditLogsByClient` — Audit logs d'un client

```
Service : AuditService / GetAuditLogsByClient
Onglet  : Message
```

**Body :**
```json
{
  "client_id": "c3d4e5f6-..."
}
```

---

#### `GetAuditLogsByEntity` — Historique d'une entité spécifique

**Explication :** retourne tout l'historique d'une entité précise. Permet
de voir toutes les actions effectuées sur une facture ou une déclaration
depuis sa création jusqu'à son état final.

```
Service : AuditService / GetAuditLogsByEntity
Onglet  : Message
```

**Test A — Historique complet d'une facture :**
```json
{
  "entity_type": "facture",
  "entity_id":   "e5f6a7b8-..."
}
```

**Réponse attendue :**
```json
{
  "audit_logs": [
    {
      "action":       "create",
      "performed_by": "system",
      "created_at":   "2025-01-15T10:34:00.000Z"
    },
    {
      "action":       "sign",
      "performed_by": "b2c3d4e5-...",
      "details":      "{\"signature_hash\":\"a3f9c2...\"}",
      "created_at":   "2025-01-15T11:00:00.000Z"
    }
  ]
}
```

**Test B — Historique complet d'une déclaration :**
```json
{
  "entity_type": "declaration",
  "entity_id":   "f6a7b8c9-..."
}
```

**Test C — Historique d'un utilisateur :**
```json
{
  "entity_type": "user",
  "entity_id":   "c3d4e5f6-..."
}
```

**Test D — Historique d'une assignation :**
```json
{
  "entity_type": "assignation",
  "entity_id":   "b2c3d4e5-..."
}
```

**Valeurs `entity_type` acceptées :**

| Valeur | Quand créé |
|--------|-----------|
| `user` | Création d'un client (topic `user.created`) |
| `assignation` | Création d'une assignation (topic `comptable.assigned`) |
| `facture` | Création, signature, paiement (topics `invoice.*`) |
| `declaration` | Soumission, validation (topics `declaration.*`) |

---

## 5. Codes d'erreur gRPC

| Code | Nom | HTTP équivalent | Cause dans ce projet |
|------|-----|-----------------|----------------------|
| `5` | `NOT_FOUND` | `404` | Ressource introuvable (cabinet, client, facture...) |
| `6` | `ALREADY_EXISTS` | `409` | Email en doublon, ressource déjà existante |
| `9` | `FAILED_PRECONDITION` | `400` | Règle métier non respectée (transition invalide, assignation manquante...) |
| `13` | `INTERNAL` | `500` | Erreur serveur interne |
| `14` | `UNAVAILABLE` | `503` | Service gRPC inaccessible |

---

## 6. Ordre de test recommandé

```
── MS1 : localhost:50051 ─────────────────────────────────────────────

1.  CabinetService   / CreateCabinet           → sauvegarder cabinet_id
2.  CabinetService   / GetAllCabinets          → vérifier création
3.  CabinetService   / GetCabinet              → vérifier par ID
4.  ComptableService / CreateComptable         → sauvegarder comptable_id
5.  ComptableService / GetAllComptables        → vérifier création
6.  ComptableService / GetComptable            → vérifier par ID
7.  ComptableService / GetComptablesBySpecialite → filtrer par "fiscal"
8.  ClientService    / CreateClient            → sauvegarder client_id
9.  ClientService    / GetAllClients           → vérifier création
10. ClientService    / GetClient               → vérifier par ID
11. AssignationService / AssignComptableToClient → lier comptable ↔ client
12. AssignationService / GetAssignationsByClient → vérifier assignation active

── MS2 : localhost:50052 ─────────────────────────────────────────────

13. InvoiceService     / CreateInvoice         → sauvegarder invoice_id
14. InvoiceService     / GetAllInvoices        → vérifier création
15. InvoiceService     / GetInvoice            → vérifier par ID
16. InvoiceService     / GetClientInvoices     → factures du client
17. InvoiceService     / UpdateInvoice         → modifier montants (brouillon)
18. InvoiceService     / UpdateInvoice         → passer en "validee"
19. InvoiceService     / SignInvoice           → signer → sauvegarder signature_hash
20. InvoiceService     / UpdateInvoice         → passer en "envoyee"
21. InvoiceService     / UpdateInvoice         → passer en "payee" (final)
22. InvoiceService     / CreateInvoice         → nouvelle facture pour test
23. InvoiceService     / DeleteInvoice         → supprimer (brouillon)
24. DeclarationService / CreateDeclaration     → sauvegarder declaration_id
25. DeclarationService / GetAllDeclarations    → vérifier création
26. DeclarationService / GetDeclaration        → vérifier par ID
27. DeclarationService / GetClientDeclarations → déclarations du client
28. DeclarationService / UpdateDeclaration     → modifier montant et période
29. DeclarationService / ValidateDeclaration   → valider → statut "validee"
30. DeclarationService / CreateDeclaration     → nouvelle pour test suppression
31. DeclarationService / DeleteDeclaration     → supprimer (brouillon)

── MS3 : localhost:50053 ─────────────────────────────────────────────

32. AlerteService / CreateAlerte               → alerte manuelle
33. AlerteService / GetAllAlertes              → voir toutes (Kafka + manuelle)
34. AlerteService / GetAlertes                 → alertes du client
35. ReportService / CreateReport               → rapport enrichi depuis MS1/MS2
36. ReportService / GetAllReports              → lister tous
37. ReportService / GetReport                  → par ID
38. ReportService / GetReportsByClient         → rapports du client
39. ReportService / UpdateReport               → changer statut en "valide"
40. ReportService / DeleteReport               → supprimer
41. StatService   / GetAllStats                → KPIs calculés automatiquement
42. StatService   / GetStatsByClient           → KPIs du client
43. StatService   / GetStat                    → par ID
44. AuditService  / GetAllAuditLogs            → tous les logs (créés par Kafka)
45. AuditService  / GetAuditLogsByClient       → logs du client
46. AuditService  / GetAuditLogsByEntity       → historique d'une facture
47. AuditService  / GetAuditLogsByEntity       → historique d'une déclaration
```

---