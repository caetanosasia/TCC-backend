const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const app = express();

app.use(express.json());

app.use((req, res, next) => {
	//allowing localhost:3000 conection
    res.header("Access-Control-Allow-Origin", "*");
	//methods
    res.header("Access-Control-Allow-Methods", 'GET,PATCH,POST,DELETE');
    res.header("Access-Control-Allow-Headers", ["Content-Type", "Authorization"]);
    app.use(cors());
    next();
});

app.use(routes);

// porta preenchida automaticamente pelo heroku em prod 
const port = process.env.PORT || 3333;
app.listen(port, () => console.log("Listening on port", port));

