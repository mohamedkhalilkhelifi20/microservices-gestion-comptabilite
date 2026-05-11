const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const { initDatabase }         = require('./db/database');
const { disconnect: kafkaOff } = require('./kafka/producer');

const cabinetHandler     = require('./handlers/cabinetHandler');
const comptableHandler   = require('./handlers/comptableHandler');
const clientHandler      = require('./handlers/clientHandler');
const assignationHandler = require('./handlers/assignationHandler');

//  CONFIG
const PORT     = process.env.MS1_PORT || '50051';
const PROTO_DIR = path.join(__dirname, 'proto');

const LOADER_OPTIONS = {
    keepCase: false,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
    includeDirs: [PROTO_DIR],
};

//  CHARGEMENT DES PROTO
const cabinetPkg     = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'cabinet.proto'), LOADER_OPTIONS)
).cabinet;

const comptablePkg   = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'comptable.proto'), LOADER_OPTIONS)
).comptable;

const clientPkg      = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'client.proto'), LOADER_OPTIONS)
).client;

const assignationPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'assignation.proto'), LOADER_OPTIONS)
).assignation;

//  CRÉATION DU SERVEUR gRPC
function buildServer() {
    const server = new grpc.Server();

    server.addService(cabinetPkg.CabinetService.service, {
        createCabinet:  cabinetHandler.createCabinet,
        getCabinet:     cabinetHandler.getCabinet,
        getAllCabinets:  cabinetHandler.getAllCabinets,
    });

    server.addService(comptablePkg.ComptableService.service, {
        createComptable:           comptableHandler.createComptable,
        getComptable:              comptableHandler.getComptable,
        getAllComptables:           comptableHandler.getAllComptables,
        getComptablesBySpecialite: comptableHandler.getComptablesBySpecialite,
    });

    server.addService(clientPkg.ClientService.service, {
        createClient:  clientHandler.createClient,
        getClient:     clientHandler.getClient,
        getAllClients:  clientHandler.getAllClients,
    });

    server.addService(assignationPkg.AssignationService.service, {
        assignComptableToClient: assignationHandler.assignComptableToClient,
        getAssignationsByClient: assignationHandler.getAssignationsByClient,
    });

    return server;
}

//  DÉMARRAGE
async function start() {
    // 1. Initialiser la base de données SQLite
    await initDatabase();

    // 2. Créer et démarrer le serveur gRPC
    const server = buildServer();

    server.bindAsync(
        `0.0.0.0:${PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error('[MS1] Erreur démarrage gRPC :', err.message);
                process.exit(1);
            }
            console.log(`[MS1] gRPC server démarré sur le port ${port}`);
        }
    );

    // 3. Arrêt propre
    process.on('SIGINT',  () => shutdown(server));
    process.on('SIGTERM', () => shutdown(server));
}

async function shutdown(server) {
    console.log('\n[MS1] Arrêt en cours...');
    await kafkaOff();
    server.tryShutdown(() => {
        console.log('[MS1] Serveur gRPC arrêté');
        process.exit(0);
    });
}

start();
