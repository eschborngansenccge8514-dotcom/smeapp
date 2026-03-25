import { GoogleAuth } from 'google-auth-library'
import { ProductInputsServiceClient, ProductsServiceClient } from '@google-shopping/products'

let _auth: GoogleAuth | null = null
let _productInputsClient: ProductInputsServiceClient | null = null
let _productsClient: ProductsServiceClient | null = null

function getAuth(): GoogleAuth {
  if (_auth) return _auth
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  _auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/content'],
  })
  return _auth
}

export function getProductInputsClient(): ProductInputsServiceClient {
  if (_productInputsClient) return _productInputsClient
  _productInputsClient = new ProductInputsServiceClient({ auth: getAuth() })
  return _productInputsClient
}

export function getProductsClient(): ProductsServiceClient {
  if (_productsClient) return _productsClient
  _productsClient = new ProductsServiceClient({ auth: getAuth() })
  return _productsClient
}

export const MERCHANT_ID   = process.env.GOOGLE_MERCHANT_ID!
export const ACCOUNT_NAME  = `accounts/${MERCHANT_ID}`
export const TARGET_COUNTRY = process.env.GMC_TARGET_COUNTRY    ?? 'MY'
export const LANGUAGE       = process.env.GMC_CONTENT_LANGUAGE  ?? 'en'
export const FEED_LABEL     = process.env.GMC_FEED_LABEL        ?? 'MY'
export const CURRENCY       = process.env.GMC_CURRENCY          ?? 'MYR'
export const APP_URL        = process.env.NEXT_PUBLIC_APP_URL   ?? 'https://yourdomain.com'
