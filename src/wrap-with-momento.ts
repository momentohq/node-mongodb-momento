import mongoose from 'mongoose'
import {
    CacheGet,
    CacheSet,
    CacheClient,
    Configurations,
    CredentialProvider,
} from '@gomomento/sdk'

export default function wrapWithMomento() {
    const momento = new CacheClient({
        configuration: Configurations.InRegion.LowLatency.v1(),
        credentialProvider: CredentialProvider.fromEnvironmentVariable({
            environmentVariableName: 'MOMENTO_AUTH_TOKEN',
        }),
        defaultTtlSeconds: 60,
    })

    const exec = mongoose.Query.prototype.exec

    mongoose.Query.prototype.exec = async function (this: any) {
        if (!['count', 'countDocuments', 'find', 'findOne', 'distinct'].includes(this.op)) {
            // only cache read operations
            return exec.apply(this)
        }
        const key = JSON.stringify(
            {
                o: this.op,
                q: this.getQuery(),
                opt: this.getOptions(),
            }
        )
        console.log(`key: ${key}`)
        const getResponse = await momento.get(process.env.COLLECTION_NAME!, key)
        if (getResponse instanceof CacheGet.Hit) {
            //console.log(`cache hit: ${(getResponse as CacheGet.Hit).valueString().length} chars`)
            return (JSON.parse((getResponse as CacheGet.Hit).valueString()) as [object]).map(
                x => this.model.hydrate(x)
            )
        } else if (getResponse instanceof CacheGet.Miss) {
            // no worries
            console.log(`cache miss: ${key}`)
        } else if (getResponse instanceof CacheGet.Error) {
            console.log(`Error: ${(getResponse as CacheGet.Error).message()}`)
        }

        const result = await exec.apply(this)

        if (result) {
            const setResponse = await momento.set(process.env.COLLECTION_NAME!, key, JSON.stringify(result))
            if (setResponse instanceof CacheSet.Success) {
                //console.log('Key stored successfully!')
            } else {
                console.log(`Error setting key: ${setResponse.toString()}`)
            }
        }
        return result
    }
}