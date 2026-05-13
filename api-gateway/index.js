'use strict';

const express      = require('express');
const cors         = require('cors');
const bodyParser   = require('body-parser');
const fs           = require('fs');
const path         = require('path');

const { ApolloServer }         = require('@apollo/server');
const { expressMiddleware }    = require('@as-integrations/express5');
const { buildSchema }          = require('graphql');
const { addResolversToSchema } = require('@graphql-tools/schema');

const resolvers = require('./resolvers/resolvers');

// Routes REST MS1
const cabinetRoutes     = require('./routes/cabinets');
const comptableRoutes   = require('./routes/comptables');
const clientRoutes      = require('./routes/clients');
const assignationRoutes = require('./routes/assignations');

//  Routes REST MS2
const invoicesRoutes     = require('./routes/invoices');

//Routes REST MS3

const analyticsRoutes = require('./routes/analytics');

const PORT = process.env.PORT || 3000;

async function start() {
    const app = express();

    // Middlewares
    app.use(cors());
    app.use(bodyParser.json());

    //REST MS1
    app.use('/api/cabinets',     cabinetRoutes);
    app.use('/api/comptables',   comptableRoutes);
    app.use('/api/clients',      clientRoutes);
    app.use('/api/assignations', assignationRoutes);

    //REST MS2
    app.use('/api/invoices',     invoicesRoutes);

    //REST MS3
    app.use('/api/analytics',    analyticsRoutes);

    //Health check
    app.get('/', (req, res) => res.json({
        service: 'API Gateway — Nixam',
        status:  'running',
        rest: {
            'MS1 — Identity': [
                'POST   /api/cabinets',
                'GET    /api/cabinets',
                'GET    /api/cabinets/:id',
                'POST   /api/comptables',
                'GET    /api/comptables',
                'GET    /api/comptables/:id',
                'GET    /api/comptables/specialite/:specialite',
                'POST   /api/clients',
                'GET    /api/clients',
                'GET    /api/clients/:id',
                'POST   /api/assignations',
                'GET    /api/assignations/client/:client_id',
            ],
            'MS2 — Documents': [
                'POST   /api/invoices',
                'GET    /api/invoices',
                'GET    /api/invoices/:id',
                'GET    /api/invoices/client/:client_id',
                'PUT    /api/invoices/:id',
                'DELETE /api/invoices/:id',
                'POST   /api/declarations',
                'GET    /api/declarations',
                'GET    /api/declarations/:id',
                'GET    /api/declarations/client/:client_id',
                'PUT    /api/declarations/:id',
            ],
            'MS3 — Analytics': [
                'POST   /api/alertes',
                'GET    /api/alertes',
                'GET    /api/alertes/client/:client_id',
                'POST   /api/analytics/reports',
                'GET    /api/analytics/reports',
                'GET    /api/analytics/reports/:id',
                'GET    /api/analytics/reports/client/:client_id',
                'PUT    /api/analytics/reports/:id',
                'DELETE /api/analytics/reports/:id',
                'GET    /api/analytics/stats',
                'GET    /api/analytics/stats/:id',
                'GET    /api/analytics/stats/client/:client_id',
                'GET    /api/analytics/audit',
                'GET    /api/analytics/audit/client/:client_id',
                'GET    /api/analytics/audit/entity/:type/:id',
                'GET    /api/analytics/dashboard/:client_id',
            ],
        },
        graphql: 'POST /graphql  (Apollo Sandbox sur GET /graphql)',
    }));

    //GraphQL
    const typeDefs = fs.readFileSync(
        path.join(__dirname, 'schemas', 'schema.gql'), 'utf8'
    );
    const schema             = buildSchema(typeDefs);
    const schemaWithResolvers = addResolversToSchema(
        { schema, resolvers }
    );

    const apollo = new ApolloServer({ schema: schemaWithResolvers });
    await apollo.start();

    app.use('/graphql', expressMiddleware(apollo));

    //Start
    app.listen(PORT, () => {
        console.log(`[Gateway] REST    → http://localhost:${PORT}/api`);
        console.log(`[Gateway] GraphQL → http://localhost:${PORT}/graphql`);
    });
}

start();
