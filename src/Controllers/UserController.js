const connection = require('../database/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


module.exports = {
     async create(request, response){
        const { name, password, email } = request.body;
         bcrypt.hash(password, 10, async (errBcrypt, hash) => {
            try {
                if(errBcrypt) return response.status(500).send(({ error: errBcrypt }));
                const result  = await connection('users').select('*').where({ email });
                if(result.length > 0) return response.status(409).send({ msg: 'Usuário já cadastrado' });
                await connection('users').insert({
                    email,
                    password: hash,
                    name,
                    verified: false
                })
                const emailToken = jwt.sign({ email }, process.env.EMAIL_KEY);
                await connection('verify_email').insert({
                    token: emailToken,
                    send_date: new Date(),
                })
                sendEmailVerification(email, emailToken);
                return response.status(200).send({ msg: 'Usuário criado com sucesso', createdUser: { email } });
            } catch (err) {
                return response.status(500).send({ msg: err });
            }
        });
    },
     async drop(request, response){
        try {
            const { email } = request.body;
            const result = connection('users').select('*').where({ email });

            if(result.length === 0) return response.status(404).send({ msg: 'Usuário inexistente' });

            await connection('users').where('email', email).delete();

            return response.status(200).send({ msg: 'Usuário deletado com sucesso', deletedUser: { email } });
        } catch (err) {
            return response.status(500).send({ msg: err });
        }
    },
    async login(request, response){
        try {
            const { email, password } = request.body;
            const result = await connection('users').select('*').where({ email });
            if(result.length === 0) return response.status(403).send({ msg: 'Falha na autenticação' });
            bcrypt.compare(password, result[0].password, (err, res) => {
                if(err) return response.status(401).send({ msg: 'Falha na autenticação' });
                if(res) {
                    const token = jwt.sign({ email, name: result[0].name }, process.env.JWT_KEY, { expiresIn: '1y' });
                    return response.status(200).send({ token, user: result[0] });
                }
                return response.status(401).send({ msg: 'Falha na autenticação' });
            })

        } catch(err) {
            return response.status(500).send({ msg: err });
        }
    },
    async session(request, response){ 
        try {
            const { token } = request.body;
            const decode = jwt.verify(token, process.env.JWT_KEY);
            const user = await connection('users').select('*').where({ email: decode.email });
            return response.status(200).send({ msg: 'Sessão válida', user: user[0] });
        } catch(err) {
            return response.status(401).send({ msg: 'Falha na autenticação, faça login novamente' });
        }
    },
    async generateToken(request, response){
        try {
            const token = request.headers.authorization.split(' ')[1];
            const { email, name } = jwt.verify(token, process.env.JWT_KEY);
            const tokenToReturn = jwt.sign({ email, name }, process.env.SERVER_SECRET, { expiresIn: '1y' });
            await connection('users').update({ token: tokenToReturn }).where({ email });
            return response.status(200).send({ token: tokenToReturn });
        } catch(err) {
            return response.status(500).send({ msg: err });
        }
    },
    async patchPassword(request, response){ 
        const { email, password, role } = request.body;
        if(!password) return response.status(400).send({ msg: 'Senha inválida'});

        bcrypt.hash(password, 10, async (errBcrypt, hash) => {
            try {
                if(errBcrypt) return response.status(500).send(({ error: errBcrypt }));

                const result = await connection('users').select('*').where({ email });
                if(result.length === 0) return response.status(404).send({ msg: 'Usuário não encontrado'})
            
                await connection('users').where({ email }).update({ password: hash, role });
                return response.status(200).send({ msg: 'Usuário atualizado com sucesso'});

            }   catch(err) {
                return response.status(500).send({ msg: err });
            }
        });
    },
    async verifyAccount(request, response){
        try {
            const { token } = request.params;
            const { email } = jwt.verify(token, process.env.EMAIL_KEY);
            const result = await connection('verify_email').select('*').where({ token });
            if(result.length === 0) return response.status(404).send({ msg: 'Token inválido' });
            await connection('users').where({ email }).update({ verified: true });
            await connection('verify_email').where({ token }).delete();
            return response.status(200).send("conta verificada com sucesso");
        } catch(err) {
            return response.status(500).send({ msg: err });
        }
    },
    async resendEmailVerification(request, response){
        try {
            const { email } = request.body;
            const result = await connection('users').select('*').where({ email });
            if(result.length === 0) return response.status(404).send({ msg: 'Usuário não encontrado'});
            const emailToken = jwt.sign({ email }, process.env.EMAIL_KEY);
            await connection('verify_email').insert({
                token: emailToken,
                send_date: new Date(),
            })
            sendEmailVerification(email, emailToken);
            return response.status(200).send({ msg: 'Email reenviado com sucesso' });
        } catch (err) {
            return response.status(500).send({ msg: err });
        }
    },
}

function sendEmailVerification(email, token) {
    const link = `${process.env.HOST}/verify-account/${token}`
    const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secureConnection: false,
        auth: {
            user: 'tccvinicae@outlook.com',
            pass: 'caevini123'
        },
        tls: {
            ciphers:'SSLv3'
        }
    });
    const mailOptions = {
        from: 'tccvinicae@outlook.com',
        to: email,
        subject: 'Verificação de conta',
        html: "Oi,<br> Por favor, clicar no seguinte link para verificar o seu email: <br><a href="+link+">Clique aqui.</a>"
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if(err) return console.log(err);
        console.log(info);
    } );
}