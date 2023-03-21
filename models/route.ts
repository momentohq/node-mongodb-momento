import mongoose from 'mongoose';

const { Schema } = mongoose;

const routeSchema = new Schema({
  _id: Schema.Types.ObjectId,
  airline: {
    id: Number,
    name: String,
    alias: String,
    iata: String,
  },
  src_airport: String,
  dst_airport: String,
  codeshare: String,
  stops: Number,
  airplane: String,
});

const Route = mongoose.model('Route', routeSchema);

export default Route;