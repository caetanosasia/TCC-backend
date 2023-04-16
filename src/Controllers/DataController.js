const connection = require('../database/connection');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Data = require('../database/Schemas/Data');
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:");

module.exports = {
    async index(request, response) {
        try {
            const token = request.headers.authorization.split(' ')[1];
            const { email } = jwt.verify(token, process.env.JWT_KEY);
            const { experimentId } = request.params;

            const data = await Data.find({ email, experimentId });
            let cleanData = {};
            data.forEach((item) => {
                const { updatedAt, id } = item;
                if(!item.data) return;
                const itemData = Object.values(item.data);
                itemData.forEach(subItem => {
                    const { key, value } = subItem;
                    if(!cleanData[key]) {
                        cleanData[key] = {
                            key,
                            data: [{
                                value,
                                updatedAt,
                                id
                            }]
                        };
                    } else {
                        cleanData[key].data.push({
                            value,
                            updatedAt,
                            id
                        });
                    }
                })
            });
            return response.status(200).send(cleanData);
        } catch (err) {
            return response.status(500).send({ msg: err, func: 'get' });
        }
    },
     async create(request, response){
        try {
            const { body } = request;
            const { token } = request.headers;
            const { email, id } = jwt.verify(token, process.env.EXP_SECRET);
            const verifyToken = await connection('experiments').select('*').where({ id });

            if(verifyToken.length === 0) return response.status(404).send({ msg: 'Usuário inexistente' });
            if(verifyToken[0].token !== token) return response.status(401).send({ msg: 'Token expirado' });

            const values = Object.values(body);
            const keys = Object.keys(body);
            const data = {};
            keys.forEach((key, i) => {
                data[key] = {
                    key,
                    value: values[i],
                } 
            });
            const row = await Data.create({ data, email, experimentId: id });
            await row.save();
            return response.status(200).send({ msg: 'Dado inserido no BD com sucesso' });
        } catch (err) {
            return response.status(500).send({ msg: err, func: 'create' });
        }

    },
    async drop(request, response) {
        try {
            await Data.remove({});
            return response.status(200).send({ msg: 'Dados deletados com sucesso' });
        } catch (err) {
            return response.status(500).send({ msg: err, func: 'delete' });
        }
    }

}