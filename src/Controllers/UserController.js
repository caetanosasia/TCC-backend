const connection = require('../database/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


module.exports = {
     async create(request, response){
        console.log("create user", request.body);
        const { name, password, email } = request.body;
         bcrypt.hash(password, 10, async (errBcrypt, hash) => {
            try {
                console.log("bcrypt", errBcrypt);
                if(errBcrypt) return response.status(500).send(({ error: errBcrypt }));
                const result  = await connection('users').select('*').where({ email });
                if(result.length > 0) return response.status(409).send({ msg: 'User already exists' });
                await connection('users').insert({
                    email,
                    password: hash,
                    name,
                    verified: false
                })
                console.log("inseriu no banco");
                const emailToken = jwt.sign({ email }, process.env.EMAIL_KEY);
                await connection('verify_email').insert({
                    token: emailToken,
                    send_date: new Date(),
                })
                console.log("enviando email");
                sendEmailVerification(email, emailToken);
                return response.status(201).send({ msg: 'Usuário criado com sucesso', createdUser: { email } });
            } catch (error) {
                return response.status(500).send({ error });
            }
        });
    }, 
    async recoverPasswordSendEmail(request, response){
        const { email } = request.body;
        try {
            const result  = await connection('users').select('*').where({ email }); //verifico se o e-mail existe   
            if(result.length === 0) return response.status(204).send(); //se não existir apenas respondo que tá ok para não dar dica de que o e-mail existe
            const emailToken = jwt.sign({ email }, process.env.EMAIL_KEY); //crio o token para consumir na rota de troca de senha
            await connection('forgot_password').insert({
                token: emailToken,
                changed: false,
                email,
                send_date: new Date(),
                expires_in: new Date(Date.now() + 3600000)
            }) //crio o histórico de troca de senha e adiciono uma data de expiração e o token
            sendEmailToChangePassword(email, emailToken); //envio o e-mail para o usuário
            return response.status(204).send();
        } catch (error) {
            return response.status(500).send({ error });
        }
    }, 
    async changePassword(request, response){
        const { token, password } = request.body;
        try {
            const { email } = jwt.verify(token, process.env.EMAIL_KEY);
            const result  = await connection('users').select('*').where({ email }); //verifico se o e-mail existe   
            const tokenResult  = await connection('forgot_password').select('*').where({ token }); //verifico se o token existe   
            if(result.length === 0 || tokenResult.length === 0) return response.status(404).send({ error: 'email not found' }); //se não existir apenas respondo que tá ok para não dar dica de que o e-mail existe
            if(tokenResult[0].changed) return response.status(409).send({ error: 'Token already used' }); //se o token já foi usado
            if(tokenResult[0].expires_in < new Date()) return response.status(409).send({ error: 'Token expired' }); //se o token já foi expirou
            bcrypt.hash(password, 10, async (errBcrypt, hash) => {
                if(errBcrypt) return response.status(500).send(({ error: errBcrypt }));
                await connection('users').where('email', email).update({ password: hash });
                await connection('forgot_password').where('token', token).update({ changed: true });
                sendChangedPasswordNotification(email);
                return response.status(204).send();
            });
        } catch (error) {
            return response.status(500).send({ error });
        }
    },
     async drop(request, response){
        try {
            const { email } = request.body;
            const result = connection('users').select('*').where({ email });

            if(result.length === 0) return response.status(404).send({ msg: 'Usuário inexistente' });

            await connection('users').where('email', email).delete();

            return response.status(200).send({ msg: 'Usuário deletado com sucesso', deletedUser: { email } });
        } catch (error) {
            return response.status(500).send({ error });
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
                    const token = jwt.sign({ email, name: result[0].name }, process.env.JWT_KEY, { expiresIn: '1d' });
                    return response.status(200).send({ token, user: {
                        "email": result[0].email,
                        "verified": result[0].verified,
                        "name": result[0].name
                    } });
                }
                return response.status(401).send({ msg: 'Falha na autenticação' });
            })

        } catch(error) {
            return response.status(500).send({ error });
        }
    },
    async session(request, response){ 
        try {
            const { token } = request.body;
            const decode = jwt.verify(token, process.env.JWT_KEY);
            const user = await connection('users').select('*').where({ email: decode.email });
            return response.status(200).send({ msg: 'Sessão válida', user: {
                "email": user[0].email,
                "verified": user[0].verified,
                "name": user[0].name
            }});
        } catch(error) {
            return response.status(401).send({ error: 'Falha na autenticação, faça login novamente' });
        }
    },
    async generateToken(request, response){
        try {
            const token = request.headers.authorization.split(' ')[1];
            const { email, name } = jwt.verify(token, process.env.JWT_KEY);
            const tokenToReturn = jwt.sign({ email, name }, process.env.SERVER_SECRET, { expiresIn: '1y' });
            await connection('users').update({ token: tokenToReturn }).where({ email });
            return response.status(200).send({ token: tokenToReturn });
        } catch(error) {
            return response.status(500).send({ error });
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

            }   catch(error) {
                return response.status(500).send({ error });
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
        } catch(error) {
            return response.status(500).send({ error });
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
        } catch (error) {
            return response.status(500).send({ error });
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
        subject: 'Verificação de conta',
        html: "Oi,<br> Por favor, clicar no seguinte link para verificar o seu email: <br><a href="+link+">Clique aqui.</a>"
    };
    transporter.sendMail(mailOptions);
}

function sendChangedPasswordNotification(email) {
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
        subject: 'Senha alterada',
        html: "Oi,<br>sua senha foi alterada com sucesso.<br>"
    };
    transporter.sendMail(mailOptions);
}
function sendEmailToChangePassword(email, token) {
    const link = `${process.env.FRONT_HOST}/change-password/${token}`
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
        subject: 'Recupração de senha',
        html: `Oi,<br> Por favor, clicar no seguinte link para recuperar sua senha: <br><a href="${link}">Clique aqui.</a>
                <span>Se você não solicitou a recuperação de senha, por favor, ignore este email.</span>` //o link expira em 1 hora
    };
    transporter.sendMail(mailOptions);
}