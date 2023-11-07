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

const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized' });
        }
        req.user = decoded;
        next();
    });
};

async function run() {
    try {
        await client.connect();
        const jobsCollection = client.db('ByteBidsDB').collection('Jobs');
        const bidsCollection = client.db('ByteBidsDB').collection('bids');

        app.post('/jobs', async (req, res) => {
            const jobInfo = req.body;
            const result = await jobsCollection.insertOne(jobInfo);
            res.send(result);
        });

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

        app.get('/jobs', verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            let query = {};
            if (req.query?.email) {
                query = { buyer_Email: req.query?.email }
            }
            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/bids', async (req, res) => {
            const bidInfo = req.body;
            const result = await bidsCollection.insertOne(bidInfo);
            res.send(result);
        });

        app.get('/bids', verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query?.email }
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                })
                .send({ success: true });
        });

        app.delete('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await jobsCollection.deleteOne(query);
            res.send(result);
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
