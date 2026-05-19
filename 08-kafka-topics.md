# Description des Topics Kafka

> Apache Kafka est le bus d'événements asynchrone de la plateforme.  
> **Port :** `9092`  
> **Client ID producteur MS1 :** `ms1-user-service`  
> **Client ID producteur MS2 :** `ms2-document-service`  
> **Client ID consommateur MS3 :** `ms3-analytics-service`  
> **Group ID consommateur :** `ms3-analytics-group`

---

## Table des matières

1. [Présentation & rôle de Kafka](#1-présentation--rôle-de-kafka)
2. [Principes de conception](#2-principes-de-conception)
3. [Vue d'ensemble des topics](#3-vue-densemble-des-topics)
4. [Topics MS1 — Identity Service](#4-topics-ms1--identity-service)
   - [user.created](#41-usercreated)
   - [comptable.assigned](#42-comptableassigned)
5. [Topics MS2 — Document Service](#5-topics-ms2--document-service)
   - [invoice.created](#51-invoicecreated)
   - [invoice.signed](#52-invoicesigned)
   - [invoice.paid](#53-invoicepaid)
   - [declaration.submitted](#54-declarationsubmitted)
   - [declaration.validated](#55-declarationvalidated)
6. [Traitement MS3 — Consumer](#6-traitement-ms3--consumer)
7. [Résilience & gestion des pannes](#7-résilience--gestion-des-pannes)

---

## 1. Présentation & rôle de Kafka

Kafka assure la **communication asynchrone** entre les microservices. Concrètement, quand un événement métier se produit dans MS1 ou MS2 (création d'un client, signature d'une facture, validation d'une déclaration), un message est publié dans Kafka. MS3 consomme ces messages et réagit automatiquement : mise à jour des KPIs, création d'audit logs, génération d'alertes.

Ce mécanisme garantit un **découplage total** entre les services :

- MS1 et MS2 publient leurs événements **sans connaître MS3**. Ils ne savent pas ce que MS3 fera de ces événements.
- MS3 consomme les événements **sans impacter MS1 ou MS2**. Si MS3 redémarre, MS1 et MS2 continuent de fonctionner normalement.
- Si MS3 est temporairement indisponible, Kafka conserve les messages. Dès que MS3 redémarre, il reprend la consommation là où il s'était arrêté grâce à l'**offset Kafka** — aucun événement n'est perdu.

---

## 2. Principes de conception

### Convention de nommage des topics

Tous les topics suivent la convention `domaine.action` en minuscules :

```
{domaine}.{action}

Exemples :
  user.created
  invoice.signed
  declaration.validated
```

### Clé de partitionnement

Tous les messages utilisent le `client_id` comme **clé Kafka**. Cette convention garantit que tous les événements d'un même client arrivent dans le **même ordre** dans MS3. Sans cela, les KPIs d'un client pourraient être calculés dans le mauvais ordre.

```
Clé Kafka = client_id
→ Tous les événements du client X → partition P1 (toujours)
→ Tous les événements du client Y → partition P2 (toujours)
→ Ordre garanti par client
```

### Structure commune des payloads

Chaque message Kafka est sérialisé en **JSON**. Tous les payloads incluent :

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Nom de l'événement — identique au nom du topic |
| `timestamp` | string | Date et heure de publication ISO 8601 |
| `client_id` | string | Identifiant du client concerné (= clé de partitionnement) |

### Pattern fire-and-forget

La publication Kafka est **asynchrone et non bloquante**. Quand MS1 crée un client, il publie `user.created` et retourne immédiatement la réponse au Gateway — il n'attend pas que MS3 ait traité l'événement. Les erreurs Kafka sont loggées mais n'échouent pas la requête principale.

```javascript
// Pattern utilisé dans MS1 et MS2
kafka.publishUserCreated(client).catch(err =>
    console.error('[MS1][Kafka] Erreur user.created :', err.message)
);
// La réponse gRPC est retournée immédiatement après
callback(null, { client });
```

---

## 3. Vue d'ensemble des topics

| Topic | Producteur | Consommateur | Déclencheur REST |
|-------|-----------|--------------|-----------------|
| `user.created` | MS1 | MS3 | `POST /api/clients` |
| `comptable.assigned` | MS1 | MS3 | `POST /api/assignations` |
| `invoice.created` | MS2 | MS3 | `POST /api/invoices` |
| `invoice.signed` | MS2 | MS3 | `PUT /api/invoices/:id/sign` |
| `invoice.paid` | MS2 | MS3 | `PUT /api/invoices/:id` avec `statut: payee` |
| `declaration.submitted` | MS2 | MS3 | `POST /api/invoices/declarations` |
| `declaration.validated` | MS2 | MS3 | `PUT /api/invoices/declarations/:id/validate` |

### Flux global

```
MS1 ──publish──→ user.created          ──→ Kafka ──consume──→ MS3
MS1 ──publish──→ comptable.assigned    ──→ Kafka ──consume──→ MS3
MS2 ──publish──→ invoice.created       ──→ Kafka ──consume──→ MS3
MS2 ──publish──→ invoice.signed        ──→ Kafka ──consume──→ MS3
MS2 ──publish──→ invoice.paid          ──→ Kafka ──consume──→ MS3
MS2 ──publish──→ declaration.submitted ──→ Kafka ──consume──→ MS3
MS2 ──publish──→ declaration.validated ──→ Kafka ──consume──→ MS3
```

---

## 4. Topics MS1 — Identity Service

---

### 4.1 `user.created`

**Déclencheur :** création d'un nouveau client via `POST /api/clients`  
**Producteur :** MS1 — `clientHandler.js`  
**Consommateur :** MS3 — crée un `AuditLog` d'action `create` pour l'entité `user`

#### Payload

```json
{
  "event":      "user.created",
  "client_id":  "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "client_nom": "SARL TechTunisie",
  "type":       "societe",
  "cabinet_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "timestamp":  "2025-01-15T10:32:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Identifiant de l'événement — toujours `"user.created"` |
| `client_id` | string | UUID du client créé — utilisé comme clé Kafka |
| `client_nom` | string | Nom du client |
| `type` | string | Nature juridique : `societe` `patente` `personne_physique` |
| `cabinet_id` | string | UUID du cabinet auquel le client est rattaché |
| `timestamp` | string | Date et heure de création ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de user.created
        │
        ▼
Création AuditLog {
    client_id:    payload.client_id,
    action:       "create",
    entity_type:  "user",
    entity_id:    payload.client_id,
    performed_by: "system",
    details:      { cabinet_id: payload.cabinet_id }
}
```

---

### 4.2 `comptable.assigned`

**Déclencheur :** création d'une assignation via `POST /api/assignations`  
**Producteur :** MS1 — `assignationHandler.js`  
**Consommateur :** MS3 — crée un `AuditLog` d'action `create` pour l'entité `assignation`

#### Payload

```json
{
  "event":        "comptable.assigned",
  "comptable_id": "b2c3d4e5-e5f6-4789-abcd-ef1234567890",
  "client_id":    "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "specialite":   "fiscal",
  "timestamp":    "2025-01-15T10:33:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Toujours `"comptable.assigned"` |
| `comptable_id` | string | UUID du comptable assigné |
| `client_id` | string | UUID du client — utilisé comme clé Kafka |
| `specialite` | string | Spécialité de l'assignation : `fiscal` `audit` `paie` `juridique` |
| `timestamp` | string | Date et heure de l'assignation ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de comptable.assigned
        │
        ▼
Création AuditLog {
    client_id:    payload.client_id,
    action:       "create",
    entity_type:  "assignation",
    entity_id:    payload.comptable_id,
    performed_by: "system",
    details:      { comptable_id: payload.comptable_id }
}
```

---

## 5. Topics MS2 — Document Service

---

### 5.1 `invoice.created`

**Déclencheur :** création d'une facture via `POST /api/invoices`  
**Producteur :** MS2 — `documentHandlers.js`  
**Consommateur :** MS3 — met à jour les `Stat` mensuelles + crée un `AuditLog` + crée une `Alerte` si statut `impayee`

#### Payload

```json
{
  "event":       "invoice.created",
  "invoice_id":  "e5f6a7b8-e5f6-4789-abcd-ef1234567890",
  "client_id":   "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "type":        "standard",
  "montant_ttc": 1190.000,
  "statut":      "brouillon",
  "timestamp":   "2025-01-15T10:34:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Toujours `"invoice.created"` |
| `invoice_id` | string | UUID de la facture créée |
| `client_id` | string | UUID du client — utilisé comme clé Kafka |
| `type` | string | Type de facture : `standard` `steg` `sonede` `internet` `loyer` `honoraires` |
| `montant_ttc` | number | Montant TTC de la facture |
| `statut` | string | Statut initial — toujours `"brouillon"` à la création |
| `timestamp` | string | Date et heure de création ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de invoice.created
        │
        ├──→ Mise à jour Stat (période courante YYYY-MM) {
        │       chiffre_affaires += montant_ht
        │       tva_nette        += tva_montant
        │       nb_factures      += 1
        │       resultat_net      = chiffre_affaires - total_charges
        │   }
        │
        ├──→ Création AuditLog {
        │       action:      "create"
        │       entity_type: "facture"
        │       entity_id:   invoice_id
        │   }
        │
        └──→ Si statut == "impayee" :
                Création Alerte {
                    type:     "impayee"
                    severity: "warning"
                    message:  "Facture {invoice_id} en attente de paiement"
                }
```

---

### 5.2 `invoice.signed`

**Déclencheur :** signature d'une facture via `PUT /api/invoices/:id/sign`  
**Producteur :** MS2 — `documentHandlers.js`  
**Consommateur :** MS3 — crée un `AuditLog` d'action `sign`

#### Payload

```json
{
  "event":          "invoice.signed",
  "invoice_id":     "e5f6a7b8-e5f6-4789-abcd-ef1234567890",
  "client_id":      "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "comptable_id":   "b2c3d4e5-e5f6-4789-abcd-ef1234567890",
  "numero":         "STD-20250115-4823",
  "signature_hash": "a3f9c2d8e1b4f7a2c5d9e3b6f8a1c4d7e2b5f9a3c6d8e1b4",
  "timestamp":      "2025-01-15T11:00:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Toujours `"invoice.signed"` |
| `invoice_id` | string | UUID de la facture signée |
| `client_id` | string | UUID du client — utilisé comme clé Kafka |
| `comptable_id` | string | UUID du comptable signataire |
| `numero` | string | Numéro de la facture (ex: `STD-20250115-4823`) |
| `signature_hash` | string | Hash SHA-256 de la signature |
| `timestamp` | string | Date et heure de la signature ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de invoice.signed
        │
        ▼
Création AuditLog {
    client_id:    payload.client_id,
    action:       "sign",
    entity_type:  "facture",
    entity_id:    payload.invoice_id,
    performed_by: payload.comptable_id,
    details:      { numero, signature_hash }
}
```

---

### 5.3 `invoice.paid`

**Déclencheur :** passage d'une facture au statut `payee` via `PUT /api/invoices/:id` avec `{ "statut": "payee" }`  
**Producteur :** MS2 — `documentHandlers.js`  
**Consommateur :** MS3 — crée un `AuditLog` d'action `pay`

> Ce topic est publié **uniquement** lors de la transition vers `payee`. Si la facture passe de `brouillon` à `validee`, aucun événement `invoice.paid` n'est publié.

#### Payload

```json
{
  "event":       "invoice.paid",
  "invoice_id":  "e5f6a7b8-e5f6-4789-abcd-ef1234567890",
  "client_id":   "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "montant_ttc": 1190.000,
  "timestamp":   "2025-01-15T14:00:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Toujours `"invoice.paid"` |
| `invoice_id` | string | UUID de la facture payée |
| `client_id` | string | UUID du client — utilisé comme clé Kafka |
| `montant_ttc` | number | Montant TTC encaissé |
| `timestamp` | string | Date et heure du paiement ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de invoice.paid
        │
        ▼
Création AuditLog {
    client_id:    payload.client_id,
    action:       "pay",
    entity_type:  "facture",
    entity_id:    payload.invoice_id,
    performed_by: "system",
    details:      { montant_ttc: payload.montant_ttc }
}
```

---

### 5.4 `declaration.submitted`

**Déclencheur :** création d'une déclaration via `POST /api/invoices/declarations`  
**Producteur :** MS2 — `documentHandlers.js`  
**Consommateur :** MS3 — met à jour les `Stat` mensuelles + crée un `AuditLog` + crée une `Alerte` d'échéance fiscale

#### Payload

```json
{
  "event":          "declaration.submitted",
  "declaration_id": "f6a7b8c9-e5f6-4789-abcd-ef1234567890",
  "client_id":      "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "type":           "TVA",
  "periode":        "2025-01",
  "montant":        3570.000,
  "timestamp":      "2025-01-15T11:10:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Toujours `"declaration.submitted"` |
| `declaration_id` | string | UUID de la déclaration créée |
| `client_id` | string | UUID du client — utilisé comme clé Kafka |
| `type` | string | Nature fiscale : `TVA` `IS` `IRPP` `CNSS` |
| `periode` | string | Période concernée — format `YYYY-MM` |
| `montant` | number | Montant de la déclaration |
| `timestamp` | string | Date et heure de soumission ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de declaration.submitted
        │
        ├──→ Mise à jour Stat (période courante YYYY-MM) {
        │       total_charges   += montant
        │       nb_declarations += 1
        │       resultat_net     = chiffre_affaires - total_charges
        │   }
        │
        ├──→ Création AuditLog {
        │       action:      "submit"
        │       entity_type: "declaration"
        │       entity_id:   declaration_id
        │       details:     { type, montant, periode }
        │   }
        │
        └──→ Création Alerte {
                type:        "echeance"
                severity:    "info"
                message:     "Déclaration {type} soumise pour la période {periode}"
                entity_id:   declaration_id
                entity_type: "declaration"
            }
```

---

### 5.5 `declaration.validated`

**Déclencheur :** validation d'une déclaration via `PUT /api/invoices/declarations/:id/validate`  
**Producteur :** MS2 — `documentHandlers.js`  
**Consommateur :** MS3 — crée un `AuditLog` d'action `validate` + crée une `Alerte` d'information

#### Payload

```json
{
  "event":          "declaration.validated",
  "declaration_id": "f6a7b8c9-e5f6-4789-abcd-ef1234567890",
  "client_id":      "c3d4e5f6-e5f6-4789-abcd-ef1234567890",
  "type":           "TVA",
  "periode":        "2025-01",
  "validated_by":   "b2c3d4e5-e5f6-4789-abcd-ef1234567890",
  "timestamp":      "2025-01-15T11:30:00.000Z"
}
```

#### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `event` | string | Toujours `"declaration.validated"` |
| `declaration_id` | string | UUID de la déclaration validée |
| `client_id` | string | UUID du client — utilisé comme clé Kafka |
| `type` | string | Nature fiscale : `TVA` `IS` `IRPP` `CNSS` |
| `periode` | string | Période concernée — format `YYYY-MM` |
| `validated_by` | string | UUID du comptable validateur |
| `timestamp` | string | Date et heure de la validation ISO 8601 |

#### Actions déclenchées dans MS3

```
Réception de declaration.validated
        │
        ├──→ Création AuditLog {
        │       action:       "validate"
        │       entity_type:  "declaration"
        │       entity_id:    declaration_id
        │       performed_by: validated_by
        │       details:      { type, periode }
        │   }
        │
        └──→ Création Alerte {
                type:        "echeance"
                severity:    "info"
                message:     "Déclaration {type} validée pour la période {periode}"
                entity_id:   declaration_id
                entity_type: "declaration"
            }
```

---

## 6. Traitement MS3 — Consumer

### Abonnement

MS3 s'abonne à tous les topics au démarrage du service :

```javascript
const TOPICS = [
    'user.created',
    'comptable.assigned',
    'invoice.created',
    'invoice.signed',
    'invoice.paid',
    'declaration.submitted',
    'declaration.validated',
];
```

Configuration : `fromBeginning: false` — MS3 ne consomme que les nouveaux messages publiés après son démarrage.

### Routage des messages

Chaque message reçu est routé vers le handler correspondant selon le nom du topic :

```
Topic reçu              Handler appelé
─────────────────────────────────────────────────
user.created          → handleUserCreated()
comptable.assigned    → handleComptableAssigned()
invoice.created       → handleInvoiceCreated()
invoice.signed        → handleInvoiceSigned()
invoice.paid          → handleInvoicePaid()
declaration.submitted → handleDeclarationSubmitted()
declaration.validated → handleDeclarationValidated()
```

### Calcul des statistiques mensuelles

La logique d'agrégation des stats suit ce schéma pour chaque événement `invoice.created` ou `declaration.submitted` :

```
Période = YYYY-MM (mois courant au moment de l'événement)

┌─ Stat existe pour (client_id, periode) ?
│
├── OUI → patch de la Stat existante
│         invoice.created      : chiffre_affaires += montant_ht
│                                tva_nette        += tva_montant
│                                nb_factures      += 1
│         declaration.submitted: total_charges    += montant
│                                nb_declarations  += 1
│         Dans les deux cas    : resultat_net      = CA - charges
│
└── NON → insert d'une nouvelle Stat
          Initialisation à 0, puis application de l'événement
```

---

## 7. Résilience & gestion des pannes

### Reconnexion automatique

MS3 tente de se connecter à Kafka avec un mécanisme de retry au démarrage :

```
Tentative 1 — échec → attente 5s
Tentative 2 — échec → attente 5s
...
Tentative 10 — échec → le service s'arrête avec une erreur
```

Si Kafka n'est pas encore disponible au démarrage de MS3 (cas fréquent en Docker Compose), le service réessaie automatiquement jusqu'à 10 fois avant d'abandonner.

### Garantie de livraison

Les messages Kafka sont persistés sur disque par le broker. Si MS3 est temporairement indisponible :

- MS1 et MS2 continuent de publier normalement.
- Les messages s'accumulent dans Kafka.
- Dès que MS3 redémarre, il reprend la consommation à partir du dernier **offset** commité — aucun message n'est perdu.

### Isolation des erreurs

Chaque message est traité dans un bloc `try/catch` indépendant. Si le traitement d'un message échoue (ex: RxDB temporairement saturé), l'erreur est loggée mais MS3 continue de traiter les messages suivants sans s'arrêter :

```javascript
eachMessage: async ({ topic, message }) => {
    try {
        const payload = JSON.parse(message.value.toString());
        await processMessage(topic, payload);
    } catch (err) {
        // L'erreur est loggée — le consumer continue
        console.error(`[MS3][Consumer] Erreur: ${err.message}`);
    }
}
```

### Déconnexion propre

À l'arrêt du service (signal `SIGINT` ou `SIGTERM`), le consumer Kafka est déconnecté proprement avant l'arrêt du processus Node.js pour éviter la perte de messages en cours de traitement :

```
Signal SIGTERM reçu
        │
        ▼
kafkaConsumer.disconnect()   ← commit du dernier offset
        │
        ▼
gRPC server.forceShutdown()
        │
        ▼
process.exit(0)
```
