import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const env = process.env.NODE_ENV;
const options = {};

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (env !== 'production') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// close the connection once the server has been stopped
process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});

export default clientPromise;

export async function connectToDb(databaseName?: string, collectionName?: string) {
  const client = await clientPromise;
  const db = databaseName ? client.db(databaseName) : null;
  const collection = collectionName ? db?.collection(collectionName) : null;
  return { client, db, collection };
}
