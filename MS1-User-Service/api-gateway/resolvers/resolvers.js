'use strict';

const { cabinetClient, comptableClient, clientClient, assignationClient, call } = require('../grpc/grpcClients');

const resolvers = {

    Query: {
        // ── Cabinet ───────────────────────────────
        cabinet:  (_, { id }) =>
            call(cabinetClient, 'getCabinet', { id }).then(r => r.cabinet),

        cabinets: () =>
            call(cabinetClient, 'getAllCabinets', {}).then(r => r.cabinets),

        // ── Comptable ─────────────────────────────
        comptable: (_, { id }) =>
            call(comptableClient, 'getComptable', { id }).then(r => r.comptable),

        comptables: () =>
            call(comptableClient, 'getAllComptables', {}).then(r => r.comptables),

        comptablesBySpecialite: (_, { specialite }) =>
            call(comptableClient, 'getComptablesBySpecialite', { specialite }).then(r => r.comptables),

        // ── Client ────────────────────────────────
        client:  (_, { id }) =>
            call(clientClient, 'getClient', { id }).then(r => r.client),

        clients: () =>
            call(clientClient, 'getAllClients', {}).then(r => r.clients),

        // ── Assignation ───────────────────────────
        assignationsByClient: (_, { client_id }) =>
            call(assignationClient, 'getAssignationsByClient', { client_id }).then(r => r.assignations),
    },

    Mutation: {
        // ── Cabinet ───────────────────────────────
        createCabinet: (_, args) =>
            call(cabinetClient, 'createCabinet', args).then(r => r.cabinet),

        // ── Comptable ─────────────────────────────
        createComptable: (_, args) =>
            call(comptableClient, 'createComptable', args).then(r => r.comptable),

        // ── Client ────────────────────────────────
        createClient: (_, args) =>
            call(clientClient, 'createClient', args).then(r => r.client),

        // ── Assignation ───────────────────────────
        assignComptableToClient: (_, args) =>
            call(assignationClient, 'assignComptableToClient', args),
    },
};

module.exports = resolvers;


