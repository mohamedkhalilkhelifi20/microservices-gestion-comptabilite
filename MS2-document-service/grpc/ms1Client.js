'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_MS1 = path.join(__dirname, '..', '..', 'ms1-user-service', 'proto');
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

// ── Vérifier que le client existe dans MS1 ────────────────────────────────
async function verifyClientExists(client_id) {
    try {
        const res = await call(clientClient, 'getClient', { id: client_id });
        if (!res.client || !res.client.id) {
            throw new Error(`Client introuvable : ${client_id}`);
        }
        return res.client;
    } catch (err) {
        throw new Error(`Client introuvable : ${client_id}`);
    }
}

// ── Vérifier que le comptable existe dans MS1 ─────────────────────────────
async function verifyComptableExists(comptable_id) {
    try {
        const res = await call(comptableClient, 'getComptable', { id: comptable_id });
        if (!res.comptable || !res.comptable.id) {
            throw new Error(`Comptable introuvable : ${comptable_id}`);
        }
        return res.comptable;
    } catch (err) {
        throw new Error(`Comptable introuvable : ${comptable_id}`);
    }
}

// ── Vérifier que l'assignation client↔comptable est active dans MS1 ───────
async function verifyAssignation(client_id, comptable_id) {
    try {
        const res = await call(assignationClient, 'getAssignationsByClient', { client_id });
        const assignations = res.assignations || [];

        const active = assignations.find(a =>
            a.comptable_id === comptable_id && a.statut === 'actif'
        );

        if (!active) {
            throw new Error(
                `Aucune assignation active entre le client ${client_id} et le comptable ${comptable_id}`
            );
        }
        return active;
    } catch (err) {
        if (err.message.includes('Aucune assignation')) throw err;
        throw new Error(
            `Impossible de vérifier l'assignation client↔comptable : ${err.message}`
        );
    }
}

module.exports = { verifyClientExists, verifyComptableExists, verifyAssignation };
