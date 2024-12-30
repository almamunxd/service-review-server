// Import required modules
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@servicereview.cy8aq.mongodb.net/?retryWrites=true&w=majority&appName=ServiceReview`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// Middleware
app.use(cors());
app.use(express.json());

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const db = client.db("serviceReview");
        const servicesCollection = db.collection("services");
        const reviewsCollection = db.collection("reviews");

        // Routes

        // Get all services with pagination, search, and filter
        app.get('/services', async (req, res) => {
            const { page = 1, limit = 6, search = '', category } = req.query;
            const query = {};
            if (search) {
                query.title = { $regex: search, $options: 'i' };
            }
            if (category) {
                query.category = category;
            }

            try {
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

        // Get a specific service by ID with reviews
        app.get('/services/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const service = await servicesCollection.findOne({ _id: new ObjectId(id) });
                const reviews = await reviewsCollection.find({ serviceId: id }).toArray();
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

        // Add a new service
        app.post('/services', async (req, res) => {
            const service = req.body;
            if (!service.title || !service.description || !service.price || !service.userEmail) {
                return res.status(400).send({ success: false, message: 'Missing required fields' });
            }
            try {
                const result = await servicesCollection.insertOne(service);
                res.status(201).send({ success: true, message: 'Service added successfully', data: result });
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to add service', error });
            }
        });

        // Update a service by ID
        app.put('/services/:id', async (req, res) => {
            const { id } = req.params;
            const updatedService = req.body;
            try {
                const result = await servicesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedService }
                );
                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: 'Service updated successfully' });
                } else {
                    res.status(404).send({ success: false, message: 'Service not found or no changes made' });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to update service', error });
            }
        });

        // Delete a service by ID
        app.delete('/services/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.send({ success: true, message: 'Service deleted successfully' });
                } else {
                    res.status(404).send({ success: false, message: 'Service not found' });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to delete service', error });
            }
        });

        // Add a review for a service
        // Add a review for a service
        // Add a review for a service
        app.post('/reviews', async (req, res) => {
            const { serviceId, userId, userName, userPhoto, reviewText, rating, postedDate } = req.body;

            // Validate the request body
            if (!serviceId || !userId || !reviewText || rating === undefined) {
                return res.status(400).send({ success: false, message: 'Missing required fields' });
            }

            try {
                // Fetch the service to get its title
                const service = await servicesCollection.findOne({ _id: new ObjectId(serviceId) });
                if (!service) {
                    return res.status(404).send({ success: false, message: 'Service not found' });
                }

                const review = {
                    serviceId,
                    userId,
                    userName: userName || 'Anonymous', // Default to "Anonymous" if userName is not provided
                    userPhoto: userPhoto || '/default-avatar.png', // Default photo if not provided
                    reviewText,
                    rating,
                    postedDate: postedDate || new Date().toISOString(),
                    title: service.title, // Include the service title in the review
                };

                // Insert the review into the database
                const result = await reviewsCollection.insertOne(review);
                res.status(201).send({ success: true, message: 'Review added successfully', data: result });
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to add review', error });
            }
        });



        // Get reviews for a specific service
        app.get('/services/:id/reviews', async (req, res) => {
            const { id } = req.params; // Service ID
            try {
                const reviews = await reviewsCollection.find({ serviceId: id }).toArray();
                res.send({ success: true, data: reviews });
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to fetch reviews', error });
            }
        });

        // Get reviews for a specific user
        // Get reviews for a specific user
        app.get('/myReviews', async (req, res) => {
            const { email } = req.query;

            if (!email) {
                return res.status(400).send({ success: false, message: 'Email is required to fetch reviews.' });
            }

            try {
                // Fetch reviews directly from the reviews collection
                const reviews = await reviewsCollection.find({ userId: email }).toArray();

                res.send({ success: true, data: reviews });
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ success: false, message: 'Failed to fetch reviews.', error });
            }
        });





        // Delete a review by ID
        app.delete('/reviews/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await reviewsCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.send({ success: true, message: 'Review deleted successfully' });
                } else {
                    res.status(404).send({ success: false, message: 'Review not found' });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to delete review', error });
            }
        });
 
        // Update a review by ID
        app.put('/reviews/:id', async (req, res) => {
            const { id } = req.params;
            const updatedReview = req.body;

            try {
                const result = await reviewsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedReview }
                );

                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: 'Review updated successfully' });
                } else {
                    res.status(404).send({ success: false, message: 'Review not found or no changes made' });
                }
            } catch (error) {
                console.error('Error updating review:', error);
                res.status(500).send({ success: false, message: 'Failed to update review', error });
            }
        });



        // Get services created by a specific user
        app.get('/myServices', async (req, res) => {
            const { email } = req.query;
            if (!email) {
                return res.status(400).send({ success: false, message: 'Email is required to fetch services.' });
            }
            try {
                const services = await servicesCollection.find({ userEmail: email }).toArray();
                res.send({ success: true, services });
            } catch (error) {
                res.status(500).send({ success: false, message: 'Failed to fetch services', error });
            }
        });
    } finally {
        // Optionally close the connection
    }
}

run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
    res.send('Service Review System API is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});