const noStoreHeaders = {
  "Cache-Control": "no-store",
}

export function GET() {
  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      headers: noStoreHeaders,
    }
  )
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: noStoreHeaders,
  })
}
