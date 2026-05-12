'use strict';


const express      = require('express');
const cors         = require('cors');
const bodyParser   = require('body-parser');
const fs           = require('fs');
const path         = require('path');

const { ApolloServer }       = require('@apollo/server');
const { expressMiddleware }  = require('@as-integrations/express5');
const { buildSchema }        = require('graphql');
const { addResolversToSchema } = require('@graphql-tools/schema');

const resolvers = require('./resolvers/resolvers');

// ── Routes REST ───────────────────────────────────
const cabinetRoutes     = require('./routes/cabinets');
const comptableRoutes   = require('./routes/comptables');
const clientRoutes      = require('./routes/clients');
const assignationRoutes = require('./routes/assignations');

const PORT = process.env.PORT || 3000;

async function start() {
    const app = express();

    // Middlewares
    app.use(cors());
    app.use(bodyParser.json());

    // Routes REST
    app.use('/api/cabinets',     cabinetRoutes);
    app.use('/api/comptables',   comptableRoutes);
    app.use('/api/clients',      clientRoutes);
    app.use('/api/assignations', assignationRoutes);

    // Health check
    app.get('/', (req, res) => res.json({
        service: 'API Gateway',
        status:  'running',
        rest: [
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
        graphql: 'POST /graphql  (Apollo Sandbox sur GET /graphql)',
    }));

    // ── GraphQL ───────────────────────────────────
    const typeDefs  = fs.readFileSync(path.join(__dirname, 'schemas', 'schema.gql'), 'utf8');
    const schema    = buildSchema(typeDefs);
    const schemaWithResolvers = addResolversToSchema({ schema, resolvers });

    const apollo = new ApolloServer({ schema: schemaWithResolvers });
    await apollo.start();

    app.use('/graphql', expressMiddleware(apollo));

    // ── Start ─────────────────────────────────────
    app.listen(PORT, () => {
        console.log(`[Gateway] REST    → http://localhost:${PORT}/api`);
        console.log(`[Gateway] GraphQL → http://localhost:${PORT}/graphql`);
    });
}

start();
