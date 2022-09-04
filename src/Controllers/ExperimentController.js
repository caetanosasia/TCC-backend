const connection = require('../database/connection');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

module.exports = {
    async index(request, response) {
        try {
            const sessionToken = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(sessionToken, process.env.JWT_KEY);
            const experiments = await connection('experiments').select('*').where({ email });
            return response.status(200).send({ experiments });
        } catch (err) {
            return response.status(500).send({ msg: err });
        }
    },
    async create(request, response){
         try {
            const { name, description } = request.body;

            if(!name) return response.status(500).send({ msg: 'missing name' });
            const id = crypto.randomBytes(4).toString('HEX');
            const token = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(token, process.env.JWT_KEY);
            const experimentToken = jwt.sign({ email, name, id }, process.env.EXP_SECRET);
            console.log('teste')
            sendEmailWithExperimentToken(email, experimentToken, name);
            await connection('experiments').insert({
                id,
                email,
                token: experimentToken,
                name,
                description
            })
            return response.status(200).send({ msg: 'Experimento criado com sucesso', createdExperiment: { id } });
        } catch (err) {
            return response.status(500).send({ msg: err });
        }
    },
    async resendExperimentToken(request, response){
        try {
            const sessionToken = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(sessionToken, process.env.JWT_KEY);
            const { experimentId } = request.body;
            const experiment = await connection('experiments').select('*').where({ id: experimentId });
            if(experiment.length === 0) return response.status(404).send({ msg: 'Experimento inexistente' });
            const experimentToken = experiment[0].token;
            const name = experiment[0].name;
            sendEmailWithExperimentToken(email, experimentToken, name);
            console.log('teste');
            return response.status(200).send({ msg: 'Token reenviado com sucesso' });
        } catch(err) {
            return response.status(500).send({ msg: err });
        }
    },
    async deleteExperiment(request, response){
        try {
            const sessionToken = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(sessionToken, process.env.JWT_KEY);
            const { experimentId } = request.body;
            const experiment = await connection('experiments').select('*').where({ id: experimentId });
            if(experiment.length === 0) return response.status(404).send({ msg: 'Experimento inexistente' });
            await connection('experiments').select('*').where({ id: experimentId }).delete();
            const name = experiment[0].name;
            sendMessage(email, `O experimento "${name}" foi deletado com sucesso.`, 'Experimento deletado');
            return response.status(200).send({ msg: 'Token reenviado com sucesso' });
        } catch(err) {
            return response.status(500).send({ msg: err });
        }
    },
}


function sendMessage(email, message, title) {
    const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secureConnection: false,
        auth: {
            user: process.env.EMAIL_TCC,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            ciphers:'SSLv3'
        }
    });
    const mailOptions = {
        from: process.env.EMAIL_TCC,
        to: email,
        subject: title,
        html: message
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if(err) return console.log(err);
        console.log(info);
    } );
}

function sendEmailWithExperimentToken(email, token, name) {
    const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secureConnection: false,
        auth: {
            user: process.env.EMAIL_TCC,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            ciphers:'SSLv3'
        }
    });
    const mailOptions = {
        from: process.env.EMAIL_TCC,
        to: email,
        subject: `Experimento: "${name}"`,
        html: `Oi, o token para o experimento "${name}" é: <br>${token}<br>`
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if(err) return console.log(err);
        console.log(info);
    } );
}