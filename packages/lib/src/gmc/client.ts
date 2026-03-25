import { GoogleAuth } from 'google-auth-library'
import { ProductInputsServiceClient, ProductsServiceClient } from '@google-shopping/products'

export interface GMCClientConfig {
  merchantId?: string
  serviceAccountJson?: string
}

export function getMerchantId(config?: GMCClientConfig): string {
  return config?.merchantId || process.env.GOOGLE_MERCHANT_ID!
}

export function getAccountName(config?: GMCClientConfig): string {
  return `accounts/${getMerchantId(config)}`
}

function getAuth(config?: GMCClientConfig): GoogleAuth {
  const jsonStr = config?.serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON!
  const credentials = JSON.parse(jsonStr)
  return new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/content'],
  })
}

export function getProductInputsClient(config?: GMCClientConfig): ProductInputsServiceClient {
  return new ProductInputsServiceClient({ auth: getAuth(config) })
}

export function getProductsClient(config?: GMCClientConfig): ProductsServiceClient {
  return new ProductsServiceClient({ auth: getAuth(config) })
}

export const TARGET_COUNTRY = process.env.GMC_TARGET_COUNTRY    ?? 'MY'
export const LANGUAGE       = process.env.GMC_CONTENT_LANGUAGE  ?? 'en'
export const FEED_LABEL     = process.env.GMC_FEED_LABEL        ?? 'MY'
export const CURRENCY       = process.env.GMC_CURRENCY          ?? 'MYR'
export const APP_URL        = process.env.NEXT_PUBLIC_APP_URL   ?? 'https://yourdomain.com'
