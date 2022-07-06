const connection = require('../database/connection');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Data = require('../database/Schemas/Data');

mongoose.connect("mongodb://localhost:");


module.exports = {
    async index(request, response) {
        try {
            const data = await Data.find();
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
            const values = Object.values(body);
            const keys = Object.keys(body);
            const data = {};
            keys.forEach((key, i) => {
                data[key] = {
                    key,
                    value: values[i],
                } 
            });
            const row = await Data.create({ data });
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