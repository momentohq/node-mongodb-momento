# Momento MongoDB Read-Through Cache Demo

This TypeScript application runs in Lambda and uses Momento's serverless cache
as a read-through cache for MongoDB. To deploy the application yourself you'll
need a running MongoDB serverless/cluster instance, a Momento account, and an
AWS account to deploy the app. Then copy `.env.template` to `.env` and fill in
each line. You will need:

- `AWS_ACCOUNT_ID=` the numeric AWS account ID to deploy to
- `COLLECTION_NAME=` the name of both your Momento cache and the MongoDB
  collection where your players will be stored. Create the Momento cache with
  `momento cache create myGame` and a MongoDB collection with the same name.
- `MONGODB_URI=` a URI from MongoDB Atlas like `mongodb+srv://USER:PASSWORD@cluster....mongodb.net`
- `MOMENTO_AUTH_TOKEN=` the JWT token to access Momento and store the lookaside cache

With the `.env` file ready, ship the app with `npm run deploy` and the CDK will
deploy and wait for the AWS resources needed to run the app.

## Caching Principles

Applications often have globally visible leaderboards, reports, or rankings that
don't change frequently but are relatively expensive to query. Caching those
commonly queried but long-lived values makes more system resources available for
other requests. In this app, we cache the values for `find`, `count`, and
`distinct` queries for 60 seconds. Caching is the ultimate "It Depends" in
application development. Sometimes real-time data is important, other times a
leaderboard might remain static for hours or days.

To make it easy for developers to use cached values, we add a shim to MongoDB
(via the Mongoose SDK) globally so any time a query is made we replicate the
result to Momento.

## The API

This application implements a simple game - one you can win by knowing how to
use `curl`. To add one point to your score, make a POST request like:
`curl -XPOST 'https://YOUR_API_URL.amazonaws.com/players?game=tennis&name=Alice'`

Your score will be sent back, along with the game you're participating in.
There's no limit on the number of games you can play, or how many times you can
increment your score. To see how you're doing, grab the leaderboard with a `GET`
request to the same
`curl -s https://YOUR_API_URL.amazonaws.com/players\?game\=tennis | jq .`
path (with JQ to make the output prettier). 

```json
{
  "elapsed": 28,
  "game": "tennis",
  "result": [
    {
      "_id": "641488e28ac88ffda14464fe",
      "game": "tennis",
      "name": "Alice",
      "score": 4
    },
    {
      "_id": "641488d28ac88ffda144550d",
      "game": "tennis",
      "name": "Candace",
      "score": 3
    },
    {
      "_id": "641489078ac88ffda1448ae7",
      "game": "tennis",
      "name": "David",
      "score": 3
    },
    {
      "_id": "641489038ac88ffda14486fd",
      "game": "tennis",
      "name": "Bob",
      "score": 1
    }
  ]
}
```