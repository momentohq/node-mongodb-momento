import { Context, APIGatewayProxyEventV2 } from 'aws-lambda'
import { Schema, model, connect } from 'mongoose'
import wrapWithMomento from './wrap-with-momento'

interface IPlayer {
  game: string
  name: string
  score: number
}

const playerSchema = new Schema<IPlayer>({
  game: { type: String, required: true },
  name: { type: String, required: true },
  score: Number,
})

const Player = model<IPlayer>('Player', playerSchema)

wrapWithMomento()


const addScore = async (game: string, name: string) => {
  return Player.findOneAndUpdate(
    {
      game,
      name,
    },
    {
      game,
      name,
      $inc: { score: 1 }
    },
    { new: true, upsert: true })
}

const getLeaders = async (game: string) => {
  let players = await Player.find().where('game').equals(game).sort({ score: 'desc', name: 'asc' }).limit(20)
  console.log(`found ${players.length} players`)
  return players
}

export const handler = async (event: APIGatewayProxyEventV2, context: Context) => {
  // console.log(event.requestContext?.http?.path)
  let name = event.queryStringParameters
  console.log(name)
  if (event.queryStringParameters === undefined) {
    return { "error": "Provide query string params ?game=... to list scores, or ?game=...&name=... to score" }
  }

  await connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 })

  const game = event.queryStringParameters.game || 'default'
  let result
  let start = new Date()
  if (event.requestContext.http.method === 'POST') {
    if (event.queryStringParameters.name === undefined) {
      return { "error": "Provide query string param ?name=... to add to your score" }
    }
    result = await addScore(game, event.queryStringParameters.name)
  } else if (event.requestContext.http.method === 'GET') {
    result = await getLeaders(game)
  }


  return { "elapsed": (new Date()).getTime() - start.getTime(), game, result }

}