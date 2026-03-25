// Data Sources replace "Feeds" in the old Content API
import { DataSourcesServiceClient } from '@google-shopping/datasources'
import { GoogleAuth } from 'google-auth-library'
import { ACCOUNT_NAME, FEED_LABEL, LANGUAGE } from './client'

let _dsClient: DataSourcesServiceClient | null = null

function getDSClient() {
  if (_dsClient) return _dsClient
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  _dsClient = new DataSourcesServiceClient({
    auth: new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/content'] }),
  })
  return _dsClient
}

export async function getOrCreatePrimaryDataSource(): Promise<string> {
  const client = getDSClient()

  // List existing data sources
  const [sources] = (await client.listDataSources({ parent: ACCOUNT_NAME })) as any
  const existing = sources.find(
    (s: any) =>
      s.primaryProductDataSource?.feedLabel === FEED_LABEL &&
      s.primaryProductDataSource?.contentLanguage === LANGUAGE
  )

  if (existing?.name) return existing.name

  // Create a new Primary API data source
  const [created] = (await client.createDataSource({
    parent: ACCOUNT_NAME,
    dataSource: {
      displayName: `${FEED_LABEL}-${LANGUAGE}-primary`,
      input: 'API',
      primaryProductDataSource: {
        feedLabel:       FEED_LABEL,
        contentLanguage: LANGUAGE,
        countries:       [process.env.GMC_TARGET_COUNTRY ?? 'MY'],
      },
    },
  })) as any

  return created.name!
}
