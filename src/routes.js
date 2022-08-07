const express = require('express');

const DataController = require('./Controllers/DataController');
const UserController = require('./Controllers/UserController');

const routes = express.Router();

const logged = require('./Middleware/Logged');


//DataController
routes.post('/insert-data', DataController.create);
routes.get('/get-data',logged , DataController.index);
routes.delete('/delete-data', DataController.drop);

//UserController
routes.post('/create-user', UserController.create);
routes.delete('/delete-user', UserController.drop);
routes.post('/login', UserController.login);
routes.post('/session', UserController.session);
routes.post('/patch-password', UserController.patchPassword);
routes.get('/generate-token', logged, UserController.generateToken);
routes.get('/verify-account/:token', UserController.verifyAccount);
routes.post('/resend-email-verification', UserController.resendEmailVerification);

module.exports = routes;