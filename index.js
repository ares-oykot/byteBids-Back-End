const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.202owzh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const jobsCollection = client.db('ByteBidsDB').collection('Jobs');
        const bidsCollection = client.db('ByteBidsDB').collection('bids');

        app.get('/jobs/:category', async (req, res) => {
            const category = req.params.category;
            const cursor = jobsCollection.find({ category });
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/job/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        });

        app.post('/bids', async (req, res) => {
            const bidInfo = req.body;
            const result = await bidsCollection.insertOne(bidInfo);
            res.send(result);
        });

        app.get('/bids', async (req, res) => {
            let query = {};
            if(req.query?.email){
                query = { email: req.query?.email }
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.Secret, { expiresIn: '1h' });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                })
                .send({ success: true });
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    };
};
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("ByteBids-back-end is running");
});
app.listen(port, () => {
    console.log(`Server is running on port : ${port}`);
});
