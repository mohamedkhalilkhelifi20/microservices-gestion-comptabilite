'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const initDatabase = require('./db/database');
const { disconnect: kafkaOff } = require('./kafka/producer');
const handlers= require('./handlers/documentHandlers');

const PORT      = process.env.MS2_PORT || '50052';
const PROTO_DIR = path.join(__dirname, 'proto');

const LOADER_OPTIONS = {
    keepCase:    true,
    longs:       String,
    enums:       String,
    defaults:    true,
    oneofs:      true,
    includeDirs: [PROTO_DIR],
};

const invoicePkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'invoice.proto'), LOADER_OPTIONS)
).invoice;

const declarationPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'declaration.proto'), LOADER_OPTIONS)
).declaration;


function buildServer() {
    const server = new grpc.Server();

    server.addService(invoicePkg.InvoiceService.service, {
        createInvoice:     handlers.createInvoice,
        updateInvoice:     handlers.updateInvoice,
        deleteInvoice:     handlers.deleteInvoice,
        signInvoice:       handlers.signInvoice,
        getInvoice:        handlers.getInvoice,
        getClientInvoices: handlers.getClientInvoices,
        getAllInvoices:     handlers.getAllInvoices,
    });

    server.addService(declarationPkg.DeclarationService.service, {
        createDeclaration:     handlers.createDeclaration,
        updateDeclaration:     handlers.updateDeclaration,
        deleteDeclaration:     handlers.deleteDeclaration,
        validateDeclaration:   handlers.validateDeclaration,
        getDeclaration:        handlers.getDeclaration,
        getClientDeclarations: handlers.getClientDeclarations,
        getAllDeclarations:     handlers.getAllDeclarations,
    });

    return server;
}

async function start() {
    await initDatabase();

    const server = buildServer();

    server.bindAsync(
        `0.0.0.0:${PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error('[MS2] Erreur démarrage gRPC :', err.message);
                process.exit(1);
            }
            console.log(`[MS2] gRPC server démarré sur le port ${port}`);
        }
    );

    process.on('SIGINT',  () => shutdown(server));
    process.on('SIGTERM', () => shutdown(server));
}

async function shutdown(server) {
    console.log('\n[MS2] Arrêt en cours...');
    await kafkaOff();
    server.tryShutdown(() => {
        console.log('[MS2] Serveur gRPC arrêté');
        process.exit(0);
    });
}

start();
