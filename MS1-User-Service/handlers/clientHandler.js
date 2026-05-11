'use strict';

const grpc    = require('@grpc/grpc-js');
const service = require('../services/clientService');

// CreateClient
async function createClient(call, callback) {
    try {
        const client = await service.createClient(call.request);
        callback(null, { client });
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

//GetClient
async function getClient(call, callback) {
    try {
        const client = await service.getClient(call.request);
        callback(null, { client });
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetAllClients
async function getAllClients(call, callback) {
    try {
        const clients = await service.getAllClients();
        callback(null, { clients });
    } catch (err) {
        callback({
            code:    grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

module.exports = { createClient, getClient, getAllClients };
