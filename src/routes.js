const express = require('express');


const DataController = require('./Controllers/DataController');


const routes = express.Router();


//DataController
routes.post('/insert-data', DataController.create);
routes.get('/get-data', DataController.index);
routes.get('/drop-table', DataController.dropTable);


module.exports = routes;