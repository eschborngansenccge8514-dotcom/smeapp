import { DataSourcesServiceClient } from '@google-shopping/datasources'
import { GoogleAuth } from 'google-auth-library'
import { getAccountName, FEED_LABEL, LANGUAGE, GMCClientConfig } from './client'

function getDSClient(config?: GMCClientConfig): DataSourcesServiceClient {
  const jsonStr = config?.serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON!
  const credentials = JSON.parse(jsonStr)
  return new DataSourcesServiceClient({
    auth: new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/content'] }),
  })
}

export async function getOrCreatePrimaryDataSource(config?: GMCClientConfig): Promise<string> {
  const client = getDSClient(config)
  const accountName = getAccountName(config)

  // List existing data sources
  const [sources] = (await client.listDataSources({ parent: accountName })) as any
  const existing = sources.find(
    (s: any) =>
      s.primaryProductDataSource?.feedLabel === FEED_LABEL &&
      s.primaryProductDataSource?.contentLanguage === LANGUAGE
  )

  if (existing?.name) return existing.name

  // Create a new Primary API data source
  const [created] = (await client.createDataSource({
    parent: accountName,
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
