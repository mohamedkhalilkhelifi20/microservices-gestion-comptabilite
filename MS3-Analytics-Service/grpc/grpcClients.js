'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const MS1_ADDR = process.env.MS1_ADDR || 'localhost:50051';
const MS2_ADDR = process.env.MS2_ADDR || 'localhost:50052';

const PROTO_MS1 = path.join(__dirname, '..', '..', 'ms1-user-service',     'proto');
const PROTO_MS2 = path.join(__dirname, '..', '..', 'ms2-document-service', 'proto');

function loaderOptions(protoDir) {
    return {
        keepCase:    true,
        longs:       String,
        enums:       String,
        defaults:    true,
        oneofs:      true,
        includeDirs: [protoDir],
    };
}


//MS1
const cabinetPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_MS1, 'cabinet.proto'), loaderOptions(PROTO_MS1))
).cabinet;

const comptablePkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_MS1, 'comptable.proto'), loaderOptions(PROTO_MS1))
).comptable;

const clientPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_MS1, 'client.proto'), loaderOptions(PROTO_MS1))
).client;

const assignationPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_MS1, 'assignation.proto'), loaderOptions(PROTO_MS1))
).assignation;

// Clients MS2
const facturePkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_MS2, 'facture.proto'), loaderOptions(PROTO_MS2))
).facture;

const declarationPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_MS2, 'declaration.proto'), loaderOptions(PROTO_MS2))
).declaration;

// Instanciation des clients
const credentials = grpc.credentials.createInsecure();
// MS1 clients
const cabinetClient     = new cabinetPkg.CabinetService(MS1_ADDR,     credentials);
const comptableClient   = new comptablePkg.ComptableService(MS1_ADDR, credentials);
const clientClient      = new clientPkg.ClientService(MS1_ADDR,       credentials);
const assignationClient = new assignationPkg.AssignationService(MS1_ADDR, credentials);

// MS2 clients
const factureClient     = new facturePkg.FactureService(MS2_ADDR,     credentials);
const declarationClient = new declarationPkg.DeclarationService(MS2_ADDR, credentials);

// ── Helper — promisify gRPC call
function callGrpc(client, method, request) {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

module.exports = {
    getClient:      (req) => callGrpc(clientClient,      'GetClient',      req),
    getComptable:   (req) => callGrpc(comptableClient,   'GetComptable',   req),
    getCabinet:     (req) => callGrpc(cabinetClient,     'GetCabinet',     req),
    getAssignation: (req) => callGrpc(assignationClient, 'GetAssignation', req),

    getFacture:     (req) => callGrpc(factureClient,     'GetFacture',     req),
    getDeclaration: (req) => callGrpc(declarationClient, 'GetDeclaration', req),
};
