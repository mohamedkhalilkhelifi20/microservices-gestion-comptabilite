'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_MS1 = path.join(__dirname, '..', 'ms1-user-service', 'proto');
const MS1_ADDR  = process.env.MS1_ADDR || 'localhost:50051';

const OPTS = {
    keepCase:    true,
    longs:       String,
    enums:       String,
    defaults:    true,
    oneofs:      true,
    includeDirs: [PROTO_MS1],
};

function loadClient(protoFile, packageName, serviceName) {
    const pkg = grpc.loadPackageDefinition(
        protoLoader.loadSync(path.join(PROTO_MS1, protoFile), OPTS)
    )[packageName];
    return new pkg[serviceName](MS1_ADDR, grpc.credentials.createInsecure());
}

const clientClient      = loadClient('client.proto',      'client',      'ClientService');
const comptableClient   = loadClient('comptable.proto',   'comptable',   'ComptableService');
const assignationClient = loadClient('assignation.proto', 'assignation', 'AssignationService');

function call(client, method, request = {}) {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) reject(err);
            else     resolve(response);
        });
    });
}

// ── Vérifier que le client existe dans MS1
async function verifyClientExists(client_id) {
    console.log(`[MS2][MS1Client] verifyClientExists → id: ${client_id} | MS1: ${MS1_ADDR}`);
    try {
        const res = await call(clientClient, 'getClient', { id: client_id });
        console.log(`[MS2][MS1Client] getClient réponse :`, JSON.stringify(res));

        if (!res || !res.client || !res.client.id) {
            throw new Error(`Client introuvable dans MS1 : ${client_id}`);
        }
        console.log(`[MS2][MS1Client] Client vérifié ✓ → ${res.client.nom}`);
        return res.client;
    } catch (err) {
        // Afficher la vraie erreur gRPC — ne pas masquer
        console.error(`[MS2][MS1Client] ERREUR verifyClientExists :`, err.message, '| code:', err.code);
        throw new Error(`Vérification client échouée (${err.code || 'ERR'}) : ${err.message}`);
    }
}

// ── Vérifier que le comptable existe dans MS1
async function verifyComptableExists(comptable_id) {
    console.log(`[MS2][MS1Client] verifyComptableExists → id: ${comptable_id}`);
    try {
        const res = await call(comptableClient, 'getComptable', { id: comptable_id });
        console.log(`[MS2][MS1Client] getComptable réponse :`, JSON.stringify(res));

        if (!res || !res.comptable || !res.comptable.id) {
            throw new Error(`Comptable introuvable dans MS1 : ${comptable_id}`);
        }
        console.log(`[MS2][MS1Client] Comptable vérifié ✓ → ${res.comptable.nom}`);
        return res.comptable;
    } catch (err) {
        console.error(`[MS2][MS1Client] ERREUR verifyComptableExists :`, err.message, '| code:', err.code);
        throw new Error(`Vérification comptable échouée (${err.code || 'ERR'}) : ${err.message}`);
    }
}

// ── Vérifier que l'assignation client↔comptable est active dans MS1 ───────
async function verifyAssignation(client_id, comptable_id) {
    console.log(`[MS2][MS1Client] verifyAssignation → client: ${client_id} | comptable: ${comptable_id}`);
    try {
        const res = await call(assignationClient, 'getAssignationsByClient', { client_id });
        console.log(`[MS2][MS1Client] getAssignationsByClient réponse :`, JSON.stringify(res));

        const assignations = res.assignations || [];
        console.log(`[MS2][MS1Client] ${assignations.length} assignation(s) trouvée(s) pour ce client`);

        const active = assignations.find(a =>
            a.comptable_id === comptable_id && a.statut === 'actif'
        );

        if (!active) {
            // Afficher toutes les assignations pour debug
            console.error(`[MS2][MS1Client] Assignations disponibles :`,
                assignations.map(a => `comptable=${a.comptable_id} statut=${a.statut}`).join(' | ')
            );
            throw new Error(
                `Aucune assignation active entre client ${client_id} et comptable ${comptable_id}`
            );
        }

        console.log(`[MS2][MS1Client] Assignation vérifiée ✓`);
        return active;
    } catch (err) {
        console.error(`[MS2][MS1Client] ERREUR verifyAssignation :`, err.message, '| code:', err.code);
        if (err.message.includes('Aucune assignation')) throw err;
        throw new Error(`Vérification assignation échouée (${err.code || 'ERR'}) : ${err.message}`);
    }
}

module.exports = { verifyClientExists, verifyComptableExists, verifyAssignation };
