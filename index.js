const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@servicereview.cy8aq.mongodb.net/?retryWrites=true&w=majority&appName=ServiceReview`;

// MongoDB Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB!");

        const servicesCollection = client.db("serviceReview").collection("services");





        // Middleware
        app.use(cors());
        app.use(express.json());

        // GET all services
        app.get('/services', async (req, res) => {
            try {
                const { page = 1, limit = 6, search = '', category } = req.query;

                const query = {};
                if (search) {
                    query.title = { $regex: search, $options: 'i' }; // Case-insensitive search
                }
                if (category) {
                    query.category = category;
                }

                const services = await servicesCollection
                    .find(query)
                    .skip((page - 1) * parseInt(limit))
                    .limit(parseInt(limit))
                    .toArray();

                const totalCount = await servicesCollection.countDocuments(query);

                res.send({
                    success: true,
                    data: services,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                });
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to fetch services', error });
            }
        });


        // POST a new service
        app.post('/services', async (req, res) => {
            const service = req.body;
            console.log('Received Service:', service);

            // Validate required fields
            if (!service.title || !service.description || !service.price || !service.userEmail) {
                return res.status(400).send({ success: false, message: 'Missing required fields' });
            }

            try {
                // Insert service into MongoDB
                const result = await servicesCollection.insertOne(service);
                console.log('Service inserted:', result);
                res.status(201).send({ success: true, message: 'Service added successfully', result });
            } catch (error) {
                console.error('Error inserting service:', error);
                res.status(500).send({ success: false, message: 'Failed to add service', error });
            }
        });

        app.get('/myServices', async (req, res) => {
            const { email } = req.query;

            if (!email) {
                return res.status(400).send({ success: false, message: 'Email is required to fetch services.' });
            }

            try {
                const services = await servicesCollection.find({ userEmail: email }).toArray();
                res.status(200).send({ success: true, services });
            } catch (error) {
                console.error('Error fetching services:', error);
                res.status(500).send({ success: false, message: 'Failed to fetch services.' });
            }
        });

        app.delete('/services/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 1) {
                    res.status(200).send({ success: true, message: 'Service deleted successfully' });
                } else {
                    res.status(404).send({ success: false, message: 'Service not found' });
                }
            } catch (error) {
                console.error('Error deleting service:', error);
                res.status(500).send({ success: false, message: 'Failed to delete service' });
            }
        });

        app.put('/services/:id', async (req, res) => {
            const { id } = req.params;
            const updatedService = req.body;

            try {
                const result = await servicesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedService }
                );

                if (result.modifiedCount === 1) {
                    res.status(200).send({ success: true, message: 'Service updated successfully' });
                } else {
                    res.status(404).send({ success: false, message: 'Service not found or no changes made' });
                }
            } catch (error) {
                console.error('Error updating service:', error);
                res.status(500).send({ success: false, message: 'Failed to update service' });
            }
        });

        // Get service details by ID, including reviews
        app.get('/services/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const service = await servicesCollection.findOne({ _id: new ObjectId(id) });
                const reviews = await reviewsCollection.find({ serviceId: id }).toArray(); // Fetch reviews for the service
                if (service) {
                    res.send({
                        success: true,
                        data: { ...service, reviews },
                    });
                } else {
                    res.status(404).send({ success: false, message: 'Service not found' });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to fetch service details', error });
            }
        });





    } finally {
        // Ensure proper cleanup if needed
        // await client.close();
    }
}

run().catch(console.dir);

// Default route  
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
