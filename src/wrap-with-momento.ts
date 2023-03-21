import {
  CacheGet,
  CacheSet,
  CacheClient,
  Configurations,
  CredentialProvider,
} from '@gomomento/sdk';
import mongoose from 'mongoose';

export function setCaching(enabled: boolean) {
  // @ts-ignore
  mongoose.Query.prototype.cachedQueries = enabled ? ['count', 'countDocuments', 'find', 'findOne', 'distinct'] : [];
}

export default function wrapWithMomento() {
  const momento = new CacheClient({
    configuration: Configurations.Laptop.v1(),
    credentialProvider: CredentialProvider.fromEnvironmentVariable({
      environmentVariableName: 'MOMENTO_AUTH_TOKEN',
    }),
    defaultTtlSeconds: 60,
  });

  // @ts-ignore
  mongoose.Query.prototype.cachedQueries = ['count', 'countDocuments', 'find', 'findOne', 'distinct'];

  const exec = mongoose.Query.prototype.exec;

  mongoose.Query.prototype.exec = async function () {
    // @ts-ignore
    if (!mongoose.Query.prototype.cachedQueries.includes(this.op)) {
      // only cache read operations
      return exec.apply(this);
    }
    const key = JSON.stringify(
      {
        // @ts-ignore
        o: this.op,
        q: this.getQuery(),
        opt: this.getOptions(),
      },
    );
    const getResponse = await momento.get(process.env.COLLECTION_NAME!, key);
    if (getResponse instanceof CacheGet.Hit) {
      //console.log(`cache hit: ${(getResponse as CacheGet.Hit).valueString().length} chars`)
      return (JSON.parse((getResponse as CacheGet.Hit).valueString()) as [object]).map(
        x => this.model.hydrate(x),
      );
    } else if (getResponse instanceof CacheGet.Miss) {
      // no worries
    } else if (getResponse instanceof CacheGet.Error) {
      console.log(`Error: ${(getResponse as CacheGet.Error).message()}`);
    }

    const result = await exec.apply(this);

    if (result) {
      const setResponse = await momento.set(process.env.COLLECTION_NAME!, key, JSON.stringify(result));
      if (setResponse instanceof CacheSet.Success) {
        //console.log('Key stored successfully!')
      } else {
        console.log(`Error setting key: ${setResponse.toString()}`);
      }
    }
    return result;
  };
}