const knex = require('knex');
const configuration = require('../../knexfile');


const connection = knex(configuration[process.env.DB_ENV] || configuration.development);
connection.migrate.latest([configuration])



module.exports = connection;


