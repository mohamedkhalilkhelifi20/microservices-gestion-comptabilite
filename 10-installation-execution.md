# Instructions d'installation et d'exécution

> Ce guide permet à une personne externe de cloner, configurer et démarrer la plateforme
> complète sur sa machine, que ce soit via Docker Compose (recommandé) ou en mode
> développement local service par service.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Cloner le dépôt](#2-cloner-le-dépôt)
3. [Structure des dossiers](#3-structure-des-dossiers)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Option A — Docker Compose (recommandé)](#5-option-a--docker-compose-recommandé)
6. [Option B — Exécution locale](#6-option-b--exécution-locale)
7. [Vérification de l'installation](#7-vérification-de-linstallation)
8. [Ordre de démarrage obligatoire](#8-ordre-de-démarrage-obligatoire)
9. [Arrêt des services](#9-arrêt-des-services)
10. [Résolution des problèmes courants](#10-résolution-des-problèmes-courants)

---

## 1. Prérequis

Avant de commencer, vérifier que les outils suivants sont installés sur la machine.

### Outils obligatoires

| Outil | Version minimale | Commande de vérification | Lien d'installation |
|-------|-----------------|--------------------------|---------------------|
| Node.js | 20.0.0 | `node --version` | https://nodejs.org |
| npm | 10.0.0 | `npm --version` | Inclus avec Node.js |
| Docker | 24.0.0 | `docker --version` | https://docs.docker.com/get-docker |
| Docker Compose | 2.0.0 | `docker compose version` | Inclus avec Docker Desktop |
| Git | 2.x | `git --version` | https://git-scm.com |

### Vérification rapide

Exécuter ces commandes pour confirmer que tout est en place :

```bash
node --version      # Doit afficher v20.x.x ou supérieur
npm --version       # Doit afficher 10.x.x ou supérieur
docker --version    # Doit afficher Docker version 24.x.x ou supérieur
docker compose version  # Doit afficher Docker Compose version v2.x.x ou supérieur
git --version       # Doit afficher git version 2.x.x
```

### Ports requis

Les ports suivants doivent être disponibles sur la machine hôte.  
Vérifier qu'aucun autre service ne les utilise avant de démarrer.

| Port | Service |
|------|---------|
| `3000` | API Gateway (REST + GraphQL) |
| `50051` | MS1 — Identity Service (gRPC) |
| `50052` | MS2 — Document Service (gRPC) |
| `50053` | MS3 — Analytics Service (gRPC) |
| `9092` | Apache Kafka |
| `2181` | Zookeeper (requis par Kafka) |

#### Vérifier qu'un port est libre (Linux / macOS)

```bash
lsof -i :3000
# Si aucune sortie → port libre
# Si une sortie → port occupé, identifier le processus et l'arrêter
```

#### Vérifier qu'un port est libre (Windows)

```powershell
netstat -ano | findstr :3000
# Si aucune sortie → port libre
```

---

## 2. Cloner le dépôt

```bash
git clone <url-du-depot>
cd accounting-platform
```

---

## 3. Structure des dossiers

Après le clonage, la structure du projet est la suivante :

```
accounting-platform/
├── api-gateway/               # API Gateway — REST + GraphQL
│   ├── grpc/
│   ├── resolvers/
│   ├── routes/
│   ├── schemas/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── MS1-User-Service/          # Identity Service — port gRPC 50051
│   ├── proto/
│   ├── db/
│   ├── handlers/
│   ├── services/
│   ├── kafka/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── MS2-Document-Service/      # Document Service — port gRPC 50052
│   ├── proto/
│   ├── db/
│   ├── handlers/
│   ├── services/
│   ├── grpc/
│   ├── kafka/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── MS3-Analytics-Service/     # Analytics Service — port gRPC 50053
│   ├── proto/
│   ├── db/
│   ├── handlers/
│   ├── services/
│   ├── grpc/
│   ├── kafka/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml         # Orchestration complète
```

---

## 4. Variables d'environnement

Chaque service lit ses variables d'environnement au démarrage.  
Les valeurs par défaut permettent un lancement sans configuration supplémentaire.

### Tableau complet des variables

| Variable | Valeur par défaut | Service(s) | Description |
|----------|-------------------|-----------|-------------|
| `PORT` | `3000` | Gateway | Port HTTP du Gateway |
| `MS1_ADDR` | `localhost:50051` | Gateway, MS2, MS3 | Adresse gRPC du service MS1 |
| `MS2_ADDR` | `localhost:50052` | Gateway, MS3 | Adresse gRPC du service MS2 |
| `MS3_ADDR` | `localhost:50053` | Gateway | Adresse gRPC du service MS3 |
| `MS1_PORT` | `50051` | MS1 | Port gRPC exposé par MS1 |
| `MS2_PORT` | `50052` | MS2 | Port gRPC exposé par MS2 |
| `MS3_PORT` | `50053` | MS3 | Port gRPC exposé par MS3 |
| `KAFKA_BROKER` | `localhost:9092` | MS1, MS2, MS3 | Adresse du broker Kafka |
| `NODE_ENV` | `development` | MS2, MS3 | Active le mode debug RxDB si `development` |

### Configuration pour Docker Compose

En mode Docker Compose, les services communiquent via le réseau Docker interne.
Les adresses `localhost` sont remplacées par les noms des services définis dans
`docker-compose.yml` :

| Variable | Valeur Docker Compose |
|----------|-----------------------|
| `MS1_ADDR` | `ms1:50051` |
| `MS2_ADDR` | `ms2:50052` |
| `MS3_ADDR` | `ms3:50053` |
| `KAFKA_BROKER` | `kafka:9092` |
| `NODE_ENV` | `production` |

Ces valeurs sont définies directement dans `docker-compose.yml` — aucun fichier
`.env` n'est nécessaire en mode Docker.

### Configuration pour l'exécution locale (optionnel)

Pour le mode développement local, les valeurs par défaut suffisent.  
Si besoin de les surcharger, créer un fichier `.env` dans le dossier de chaque service :

```bash
# Exemple : MS1-User-Service/.env
MS1_PORT=50051
KAFKA_BROKER=localhost:9092
NODE_ENV=development
```

---

## 5. Option A — Docker Compose (recommandé)

Docker Compose est la méthode la plus simple. Il démarre automatiquement tous les
services dans le bon ordre avec les bonnes configurations réseau.

### Ce que Docker Compose démarre

```
Zookeeper      (coordination Kafka)
    │
    ▼
Kafka          (broker de messages)
    │
    ▼
MS1            (Identity Service — attend que Kafka soit prêt)
MS2            (Document Service — attend que MS1 et Kafka soient prêts)
MS3            (Analytics Service — attend que Kafka soit prêt)
    │
    ▼
Gateway        (attend que MS1, MS2 et MS3 soient prêts)
```

### Étape 1 — Construire et démarrer tous les services

```bash
docker compose up --build
```

L'option `--build` force la reconstruction des images Docker à chaque démarrage.
À utiliser après une modification du code source.

Pour démarrer sans reconstruire les images (si le code n'a pas changé) :

```bash
docker compose up
```

Pour démarrer en arrière-plan (mode détaché) :

```bash
docker compose up --build -d
```

### Étape 2 — Suivre les logs

Si démarré en mode détaché, suivre les logs en temps réel :

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f gateway
docker compose logs -f ms1
docker compose logs -f ms2
docker compose logs -f ms3
docker compose logs -f kafka
```

### Étape 3 — Vérifier que tout est démarré

Les logs attendus lors d'un démarrage réussi :

```
ms1      | [MS1] SQLite3 connecté et tables initialisées → /app/ms1_identity.sqlite
ms1      | [MS1] ✅ gRPC server démarré sur le port 50051

ms2      | [MS2] RxDB initialisé — 2 collections : factures, declarations
ms2      | [MS2] gRPC server démarré sur le port 50052

ms3      | [MS3] RxDB initialisée — 4 collections : alertes, reports, stats, audit_logs
ms3      | [MS3][Consumer] Connecté à Kafka
ms3      | [MS3][Consumer] Abonné aux topics : user.created, comptable.assigned, ...
ms3      | [MS3] gRPC démarré sur port 50053

ms1      | [MS1][Kafka] Producer connecté ✅
ms2      | [MS2][Kafka] Producer connecté

gateway  | [Gateway] REST    → http://localhost:3000/api
gateway  | [Gateway] GraphQL → http://localhost:3000/graphql
```

---

## 6. Option B — Exécution locale

Cette option est recommandée pour le développement et le débogage. Chaque service
est démarré dans un terminal séparé pour pouvoir observer ses logs indépendamment.

### Étape 1 — Démarrer Kafka et Zookeeper

Kafka doit être démarré en premier car MS1, MS2 et MS3 en dépendent.

```bash
docker compose up zookeeper kafka -d
```

Attendre que Kafka soit complètement initialisé avant de continuer.  
Vérifier avec :

```bash
docker compose logs kafka | grep "started"
# Doit afficher : [KafkaServer id=1] started
```

> **Temps d'attente habituel :** 10 à 15 secondes après le démarrage du conteneur Kafka.

### Étape 2 — Installer les dépendances

Installer les dépendances `npm` de chaque service :

```bash
# MS1
cd MS1-User-Service
npm install
cd ..

# MS2
cd MS2-Document-Service
npm install
cd ..

# MS3
cd MS3-Analytics-Service
npm install
cd ..

# Gateway
cd api-gateway
npm install
cd ..
```

Ou en une seule commande depuis la racine du projet :

```bash
for service in MS1-User-Service MS2-Document-Service MS3-Analytics-Service api-gateway; do
    echo "Installing $service..."
    cd $service && npm install && cd ..
done
```

### Étape 3 — Démarrer MS1

Ouvrir un **Terminal 1** :

```bash
cd MS1-User-Service
node server.js
```

**Logs attendus :**

```
[MS1] SQLite3 connecté et tables initialisées → /path/to/ms1_identity.sqlite
[MS1] ✅ gRPC server démarré sur le port 50051
[MS1][Kafka] Producer connecté ✅
```

> MS1 doit être complètement démarré avant de lancer MS2,
> car MS2 interroge MS1 via gRPC dès les premières requêtes.

### Étape 4 — Démarrer MS2

Ouvrir un **Terminal 2** :

```bash
cd MS2-Document-Service
node server.js
```

**Logs attendus :**

```
[MS2] RxDB initialisé — 2 collections : factures, declarations
[MS2] gRPC server démarré sur le port 50052
[MS2][Kafka] Producer connecté
```

### Étape 5 — Démarrer MS3

Ouvrir un **Terminal 3** :

```bash
cd MS3-Analytics-Service
node server.js
```

**Logs attendus :**

```
[MS3] RxDB initialisée — 4 collections : alertes, reports, stats, audit_logs
[MS3][Consumer] Connecté à Kafka
[MS3][Consumer] Abonné aux topics : user.created, comptable.assigned, invoice.created,
                                    invoice.signed, invoice.paid, declaration.submitted,
                                    declaration.validated
[MS3] gRPC démarré sur port 50053
```

> Si MS3 affiche des messages de retry Kafka (`Kafka pas prêt, retry dans 5s...`),
> c'est normal si Kafka vient juste d'être démarré. MS3 réessaie automatiquement
> jusqu'à 10 fois avant d'abandonner.

### Étape 6 — Démarrer le Gateway

Ouvrir un **Terminal 4** :

```bash
cd api-gateway
node index.js
```

**Logs attendus :**

```
[Gateway] REST    → http://localhost:3000/api
[Gateway] GraphQL → http://localhost:3000/graphql
```

---

## 7. Vérification de l'installation

### Test 1 — Health check du Gateway

```bash
curl http://localhost:3000/
```

**Réponse attendue :** objet JSON listant toutes les routes REST disponibles et
confirmant que le service GraphQL est actif sur `/graphql`.

```json
{
  "service": "API Gateway",
  "status":  "running",
  "rest": { ... },
  "graphql": "POST /graphql  (Apollo Sandbox sur GET /graphql)"
}
```

### Test 2 — Créer un cabinet (premier appel MS1)

```bash
curl -X POST http://localhost:3000/api/cabinets \
  -H "Content-Type: application/json" \
  -d '{
    "nom":   "Cabinet Test",
    "email": "test@cabinet.tn"
  }'
```

**Réponse attendue `201 Created` :**

```json
{
  "id":         "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "nom":        "Cabinet Test",
  "email":      "test@cabinet.tn",
  "adresse":    null,
  "telephone":  null,
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

### Test 3 — Apollo Sandbox (interface GraphQL)

Ouvrir dans un navigateur :

```
http://localhost:3000/graphql
```

L'interface Apollo Sandbox permet d'explorer le schéma GraphQL et d'exécuter
des queries et mutations directement depuis le navigateur.

Tester avec cette query simple :

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

## 8. Ordre de démarrage obligatoire

L'ordre de démarrage des services est critique. Ne pas le respecter provoquera
des erreurs de connexion gRPC ou Kafka.

```
1. Zookeeper          (requis par Kafka)
       ↓
2. Kafka              (requis par MS1, MS2, MS3)
       ↓
3. MS1                (requis par MS2 pour les vérifications d'assignation)
       ↓
4. MS2                (peut démarrer en parallèle avec MS3 une fois MS1 prêt)
4. MS3                (peut démarrer en parallèle avec MS2 une fois Kafka prêt)
       ↓
5. Gateway            (doit démarrer en dernier)
```

> En mode Docker Compose, cet ordre est géré automatiquement par les directives
> `depends_on` et `healthcheck` du fichier `docker-compose.yml`.
> En mode local, l'ordre doit être respecté manuellement.

---

## 9. Arrêt des services

### Arrêt Docker Compose

```bash
# Arrêter tous les services (conteneurs stoppés mais conservés)
docker compose stop

# Arrêter et supprimer les conteneurs
docker compose down

# Arrêter, supprimer les conteneurs ET les volumes (données perdues)
docker compose down -v
```

> **Attention :** `docker compose down -v` supprime les volumes Docker,
> dont le volume SQLite de MS1. Toutes les données MS1 seront perdues.
> À utiliser uniquement pour repartir sur une base propre.

### Arrêt en mode local

Dans chaque terminal, appuyer sur `Ctrl+C`.

Chaque service intercepte le signal `SIGINT` et effectue un arrêt propre :

```
# Exemple pour MS1
^C
[MS1] Arrêt en cours...
[MS1][Kafka] Producer déconnecté
[MS1] Serveur gRPC arrêté

# Exemple pour MS3
^C
[MS3] Arrêt en cours...
[MS3][Consumer] Déconnecté de Kafka
[MS3] Arrêt terminé
```

Arrêter ensuite Kafka et Zookeeper :

```bash
docker compose stop kafka zookeeper
```

---

## 10. Résolution des problèmes courants

---

### Problème — Port déjà utilisé

**Symptôme :**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution :**

Identifier et arrêter le processus utilisant le port :

```bash
# Linux / macOS
lsof -ti :3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### Problème — MS3 ne se connecte pas à Kafka

**Symptôme :**
```
[MS3][Consumer] Kafka pas prêt, retry dans 5s... (9 restants)
[MS3][Consumer] Kafka pas prêt, retry dans 5s... (8 restants)
```

**Causes possibles et solutions :**

1. **Kafka n'est pas encore démarré** — attendre 15 secondes supplémentaires
   et vérifier les logs Kafka :
   ```bash
   docker compose logs kafka | tail -20
   ```

2. **Variable `KAFKA_BROKER` incorrecte** — en mode local, vérifier que
   `KAFKA_BROKER=localhost:9092`. En mode Docker, vérifier que
   `KAFKA_BROKER=kafka:9092`.

3. **Kafka a planté** — redémarrer :
   ```bash
   docker compose restart kafka
   ```

---

### Problème — MS2 ne peut pas vérifier les assignations (erreur gRPC MS1)

**Symptôme :**
```
[MS2][MS1Client] ERREUR verifyClientExists : 14 UNAVAILABLE: ...
```

**Cause :** MS1 n'est pas démarré ou son adresse est incorrecte.

**Solution :**

1. Vérifier que MS1 est bien démarré et écoute sur le bon port :
   ```bash
   # En mode local
   curl -v telnet://localhost:50051
   ```

2. Vérifier la variable `MS1_ADDR` dans MS2 :
   - Mode local : `MS1_ADDR=localhost:50051`
   - Mode Docker : `MS1_ADDR=ms1:50051`

---

### Problème — Erreur de dépendances npm

**Symptôme :**
```
Error: Cannot find module 'rxdb'
```

**Solution :**

```bash
# Dans le dossier du service concerné
rm -rf node_modules package-lock.json
npm install
```

---

### Problème — Erreur SQLite au démarrage de MS1

**Symptôme :**
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Cause :** le dossier de destination du fichier `.sqlite` n'a pas les droits
d'écriture.

**Solution :**

```bash
# Vérifier les droits du dossier
ls -la MS1-User-Service/

# Donner les droits d'écriture si nécessaire
chmod 755 MS1-User-Service/
```

---

### Problème — Le Gateway retourne 503 sur toutes les routes

**Symptôme :**
```json
{ "error": "14 UNAVAILABLE: No connection established" }
```

**Cause :** le Gateway ne peut pas joindre un ou plusieurs microservices via gRPC.

**Solution :** vérifier que MS1, MS2 et MS3 sont tous démarrés et accessibles
sur leurs ports respectifs avant de démarrer le Gateway.

```bash
# Vérifier les ports en écoute
ss -tlnp | grep -E '5005[123]'
# Doit afficher les 3 ports : 50051, 50052, 50053
```

---

### Problème — Apollo Sandbox inaccessible

**Symptôme :** `http://localhost:3000/graphql` retourne une page vide ou une erreur.

**Cause :** Apollo Sandbox n'est disponible qu'en mode `development`.

**Solution :** vérifier que `NODE_ENV=development` est bien défini pour le Gateway,
ou utiliser directement un client HTTP (Postman, curl) pour tester les mutations
et queries GraphQL via `POST /graphql`.
