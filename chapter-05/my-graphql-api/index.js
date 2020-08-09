const Koa = require('koa');
const { ApolloServer, gql } = require('apollo-server-koa');
const fs = require('fs');
const koaRouter = require('koa-router');
const koaPlayground = require('graphql-playground-middleware-koa').default;
const router = new koaRouter();
const { MongoClient } = require('mongodb');

require('dotenv').config();

async function start() {
    const typeDefs = fs.readFileSync('schema.graphql', 'utf8');
    const resolvers = require('./resolver');

    // 连接数据库
    const MONGO_DB = process.env.DB_HOST;
    const client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db()
    const context = { db };

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ ctx: { req }}) => {
            const githubToken = req.headers.authorization;
            const currentUser = await db.collection('users').findOne({ githubToken });
            return { db, currentUser };
        }
    });
    const app = new Koa();
    server.applyMiddleware({ app });
    
    router.all('/playground', koaPlayground({ endpoint: '/graphql' }))
    app.use(router.routes());

    app.listen({ port: 4000 }, () => {
        console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
    });
}

start();