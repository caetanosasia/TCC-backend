const connection = require('../database/connection');
const crypto = require('crypto');
const Data = require('../database/Schemas/Data');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:");

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
            const { experimentId } = request.body;
            const experiment = await connection('experiments').select('*').where({ id: experimentId });
            if(experiment.length === 0) return response.status(404).send({ msg: 'Experimento inexistente' });
            const experimentToken = experiment[0].token;
            const name = experiment[0].name;
            sendEmailWithExperimentToken(experiment[0].email, experimentToken, name);
            return response.status(200).send({ msg: 'Token reenviado com sucesso' });
        } catch(err) {
            return response.status(500).send({ msg: err });
        }
    },
    async experimentToExport(request, response) {
        try {
            const token = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(token, process.env.JWT_KEY);
            const { experimentId } = request.params;
            const keys = {};
            const data = await Data.find({ email, experimentId });
            let cleanData = [];
            data.forEach((item) => {
                if(!item.data) return;
                const itemData = Object.values(item.data);
                itemData.forEach(subItem => {
                    const { key } = subItem;
                    if(keys[key] === undefined) {
                        keys[key] = null;
                    }
                })
            });
            data.forEach((item) => {
                const { updatedAt } = item;
                if(!item.data) return;
                const itemData = {};
                const data = Object.values(item.data);
                data.forEach(a => {
                    itemData[a.key] = a.value
                });
                cleanData.push({
                    ...keys,
                    ...itemData,
                    time: updatedAt
                });
            });
            return response.status(200).send(cleanData);
        } catch (err) {
            return response.status(500).send({ msg: err, func: 'get' });
        }
    },
    async deleteExperiment(request, response){
        try {
            const sessionToken = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(sessionToken, process.env.JWT_KEY);
            const { experimentId } = request.body;
            const experiment = await connection('experiments').select('*').where({ id: experimentId });
            if(email != experiment[0].email) {
                return response.status(403).send({ msg: 'Usuário inválido' });
            }
            if(experiment.length === 0) return response.status(404).send({ msg: 'Experimento inexistente' });
            await connection('experiments').select('*').where({ id: experimentId }).delete();
            Data.find({ experimentId }).deleteMany().exec();
            const name = experiment[0].name;
            sendMessage(experiment[0].email, `O experimento "${name}" foi deletado com sucesso.`, 'Experimento deletado');
            return response.status(200).send({ msg: 'Experimento deletado com sucesso' });
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
    transporter.sendMail(mailOptions);
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
    transporter.sendMail(mailOptions);
}