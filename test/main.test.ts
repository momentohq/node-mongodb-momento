import dotenv from 'dotenv';
dotenv.config();

import { connect, disconnect } from 'mongoose';
import { addScore, getLeaders } from '../src/players.lambda';
import { setCaching } from '../src/wrap-with-momento';

const REQUESTS = 100;

test('MongoDB with no cache at all', async () => {
  setCaching(false);
  await connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });

  for (let count = 0; count < 10; count++) {
    await addScore('uncached', `test${count}`);
  }

  let start = new Date();
  for (let count = 0; count < REQUESTS; count++) {
    await getLeaders('uncached');
  }
  console.log(`${REQUESTS} reads without cache: ${(new Date()).getTime() - start.getTime()}ms elapsed`);

  await disconnect();
}, 15000);

test('MongoDB with a high hit rate for Momento cache', async () => {
  setCaching(true);
  await connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });

  let start = new Date();
  for (let count = 0; count < REQUESTS; count++) {
    await getLeaders('cached');
  }
  console.log(`${REQUESTS} reads with cache: ${(new Date()).getTime() - start.getTime()}ms elapsed`);

  await disconnect();
}, 15000);

test('MongoDB with a 0 hit rate for Momento cache', async () => {
  setCaching(true);
  await connect(`${process.env.MONGODB_URI!}/${process.env.COLLECTION_NAME}`, { connectTimeoutMS: 1000 });

  let start = new Date();
  for (let count = 0; count < REQUESTS / 2; count++) {
    await getLeaders(`cached${count}`);
  }
  console.log(`${REQUESTS / 2} reads with cache: ${(new Date()).getTime() - start.getTime()}ms elapsed`);

  await disconnect();
}, 15000);