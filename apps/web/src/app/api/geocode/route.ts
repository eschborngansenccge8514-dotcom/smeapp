import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress } from '@repo/lib'

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const result = await geocodeAddress(address)

    if (!result) {
      return NextResponse.json({ error: 'Could not geocode address' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
