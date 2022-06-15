const connection = require('../database/connection');
const crypto = require('crypto');


module.exports = {
    async index(request, response) {
        connection('data_table')
        .select('*')
        .then(result =>{
            const answ = {
                "data": result
            }
            return response.json(answ)
        }).catch(err => {
            return response.status(409).send({msg: err})
        });
    },
     async create(request, response){
        const { temperatura } = request.query;
        console.log('create method');
        console.log('temperatura => ', temperatura)
        let hora = new Date().getTime();
        console.log(hora);
        if(!hora || !temperatura) {
            return response.status(409).send({ msg: 'missing data' });
        }
        const id = crypto.randomBytes(4).toString('HEX');
        connection('data_table').insert({
            id,
            hora,
            temperatura, 
        }).then( result => {
            return response.status(201).send({ msg: 'Dado inserido no BD com sucesso', hora });
        }).catch(err => {
            return response.status(409).send({ msg: err });
        });
    },
    async dropTable(request, response){
        connection('data_table')
        .truncate()
        .then(result =>{
            return response.status(200).send({ msg: 'Tabela resetada' });
        }).catch(err => {
            return response.status(409).send({msg: err})
        });
    },
}