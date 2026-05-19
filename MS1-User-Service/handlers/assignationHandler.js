'use strict';

const grpc    = require('@grpc/grpc-js');
const service = require('../services/assignationService');
const kafka   = require('../kafka/producer');

// AssignComptableToClient
async function assignComptableToClient(call, callback) {
    try {
        const assignation = await service.assignComptableToClient(call.request);

        kafka.publishComptableAssigned(call.request).catch(err =>
            console.error('[MS1][Kafka] Erreur comptable.assigned :', err.message)
        );

        callback(null, { assignation });
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetAssignationsByClient — inchangé
async function getAssignationsByClient(call, callback) {
    try {
        const assignations = await service.getAssignationsByClient(call.request);
        callback(null, { assignations });
    } catch (err) {
        callback({
            code:    grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

module.exports = { assignComptableToClient, getAssignationsByClient };
