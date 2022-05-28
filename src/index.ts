import express from 'express'
import http from 'http'
import cors from 'cors';
import YAML from 'yamljs';

//swagger
import swaggerUi from 'swagger-ui-express';
const swaggerDocument = YAML.load('openapi.yml');

// body parser

import bodyParser from 'body-parser'
import serviceApi from '../dist/index'
import { serviceImpl } from './impl/types'
const app = express();
const impl = new serviceImpl();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: true }));
var options = {
    swaggerOptions: {
        url: "/api-docs/swagger.json"
    },
}
app.get('/',(re,res)=>{return res.send('hello world')})
app.get("/api-docs/swagger.json", (req, res) => res.json(swaggerDocument));
app.use('/api-docs', swaggerUi.serveFiles(undefined, options), swaggerUi.setup(undefined, options));


serviceApi(app,impl)

const port = Number(process.env.PORT ?? 8000)

http.createServer(app).listen(port,'0.0.0.0',()=>{
	console.log(`server running at http://localhost:${port}`)
})

