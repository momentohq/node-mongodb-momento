import { Context, APIGatewayProxyEventV2 } from 'aws-lambda';
import { Schema, model, connect } from 'mongoose';
import wrapWithMomento, { setCaching } from './wrap-with-momento';

interface IPlayer {
  game: string;
  name: string;
  score: number;
}

const playerSchema = new Schema<IPlayer>({
  game: { type: String, required: true },
  name: { type: String, required: true },
  score: Number,
});

const Player = model<IPlayer>('Player', playerSchema);

wrapWithMomento();

export const addScore = async (game: string, name: string) => {
  return Player.findOneAndUpdate(
    {
      game,
      name,
    },
    {
      game,
      name,
      $inc: { score: 1 },
    },
    { new: true, upsert: true });
};

export const getLeaders = async (game: string) => {
  let players = await Player.find().where('game').equals(game).sort({ score: 'desc', name: 'asc' }).limit(20);
  return players;
};

const submitMetric = (start: Date, awsRequestId: string, cached: boolean) => {
  const now = (new Date()).getTime()
  console.log(JSON.stringify({
    "_aws": {
      "Timestamp": now,
      "CloudWatchMetrics": [
        {
          "Namespace": "momento-mongodb",
          "Dimensions": [["cached"]],
          "Metrics": [
            {
              "Name": "duration",
              "Unit": "Milliseconds",
              "StorageResolution": 60
            }
          ]
        }
      ]
    },
    "cached": cached ? 'momento' : 'mongodb',
    "duration": now - start.getTime(),
    "requestId": awsRequestId
  }))
}

export const handler = async (event: any, context: Context) => {
  if (event.requestContext === null || event.requestContext === undefined) {
    await benchMark(context)
    return {}
  }

  event = event as APIGatewayProxyEventV2

  if (event.queryStringParameters === undefined) {
    return { error: 'Provide query string params ?game=... to list scores, or ?game=...&name=... to score' };
  }

  await connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });

  const game = event.queryStringParameters.game || 'default';
  let result;
  let start = new Date();
  if (event.requestContext.http.method === 'POST') {
    if (event.queryStringParameters.name === undefined) {
      return { error: 'Provide query string param ?name=... to add to your score' };
    }
    result = await addScore(game, event.queryStringParameters.name);
  } else if (event.requestContext.http.method === 'GET') {
    result = await getLeaders(game);
  }

  return { elapsed: (new Date()).getTime() - start.getTime(), game, result };
};

const benchMark = async (context: Context) => {
  const game = "benchmark";

  await connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });
  await addScore(game, 'test')
  await getLeaders(game);

  let start;
  setCaching(true)
  for (let count = 0; count < 1200; count++) {
    start = new Date();
    await getLeaders(game);
    submitMetric(start, context.awsRequestId, true)
  }

  setCaching(false)

  for (let count = 0; count < 1200; count++) {
    start = new Date();
    await getLeaders(game);
    submitMetric(start, context.awsRequestId, false)
  }
};