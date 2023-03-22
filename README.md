# Momento MongoDB Read-Through Cache Demo

This demo script runs a performance comparison between querying a MongoDB database with and without read-through caching using Momento.

## Description

This demo uses the `mongoose` package to query a MongoDB Atlas database for data. It first runs 500 queries looking for data randomly in the provided database. Then, it overrides the `Query` function in the Mongoose package to perform a read-through cache operation to Momento. This override is functionally the same code, with a simple call to a `wrapWithMomento()` function to perform the overriding. 

Once overridden, read operations will first look at Momento Cache for the data. If the data already exists in the cache, it will be immediately returned. If the data does not exist, it will query MongoDB and save the result to the cache before it returns.

When complete, an analytics chart will open in your browser with the results comparing MongoDB with cache hits and cache misses.

## Prerequisites

Before running the demo, make sure you have the following installed:

* Node.js (version 14.0 or higher)
* MongoDB (running locally or accessible via a connection string)

Additionally, you will need the following environment variables set:

- `COLLECTION_NAME=` the name of both your Momento cache and the MongoDB
  database where the data is located. Create the Momento cache with 
  `momento cache create <collection name>` and a MongoDB database with the same name. 
  This demo uses the default data when creating a MongoDB cluster via the web interface.
- `MONGODB_URI=` a URI from MongoDB Atlas like `mongodb+srv://USER:PASSWORD@cluster....mongodb.net`
- `MOMENTO_AUTH_TOKEN=` the JWT token to access Momento and store the lookaside cache

Set these values in a file named `.env` in the root directory.

## How to Run

Clone the repository containing the demo script.

Navigate to the project directory and run `npm install` in a terminal to install the required dependencies.

To run the default demo of 500 iterations of MongoDB and MongoDB with Momento, run the following command in the terminal.

```bash
npm run demo
```

If you wish to change the number of iterations, you can either change the `demo` script in the `package.json` file or simply run the following command in the terminal.

```bash
npx ts-node index.ts <iteration count>
```

## What to Expect

The demo script will:

1. Run the specified number of queries against the MongoDB collection without caching.
2. Run the specified number of queries against the MongoDB collection with caching.
3. Generate an HTML file (performance_comparison.html) containing a bar chart comparing the performance statistics of the three scenarios: without cache, with cache (hits), and with cache (misses).

The performance statistics displayed in the chart include the number of requests, average duration (in milliseconds), P99 (in milliseconds), minimum duration (in milliseconds), maximum duration (in milliseconds), median duration (in milliseconds), and standard deviation (in milliseconds).

4. Automatically open the generated HTML file in your default web browser.
5. Display a "Completed the demo" message in the console and a printed version of the analytics.

The generated analytics will look similar to the image below:

![](./images/analytics.png)