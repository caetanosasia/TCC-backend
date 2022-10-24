const express = require('express');

const DataController = require('./Controllers/DataController');
const UserController = require('./Controllers/UserController');
const ExperimentController = require('./Controllers/ExperimentController');

const routes = express.Router();

const logged = require('./Middleware/Logged');


//DataController
routes.post('/insert-data', DataController.create);
routes.get('/get-data/:experimentId',logged , DataController.index);
routes.delete('/delete-data', DataController.drop);

//UserController
routes.post('/create-user', UserController.create);
routes.delete('/delete-user', UserController.drop);
routes.post('/login', UserController.login);
routes.post('/session', UserController.session);
routes.post('/patch-password', UserController.patchPassword);
routes.get('/verify-account/:token', UserController.verifyAccount);
routes.post('/resend-email-verification', logged, UserController.resendEmailVerification);

//ExperimentController
routes.get('/experiments',logged, ExperimentController.index);
routes.post('/experiments',logged, ExperimentController.create);
routes.delete('/experiments',logged, ExperimentController.deleteExperiment);
routes.post('/resend-experiment-token', logged, ExperimentController.resendExperimentToken);
routes.get('/experiment-to-export/:experimentId', logged, ExperimentController.experimentToExport);

module.exports = routes;