'use strict';

const grpc    = require('@grpc/grpc-js');
const service = require('../services/assignationService');

// AssignComptableToClient
async function assignComptableToClient(call, callback) {
    try {
        const result = await service.assignComptableToClient(call.request);
        callback(null, result);
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetAssignationsByClient
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
