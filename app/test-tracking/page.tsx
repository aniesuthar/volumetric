"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestTrackingPage() {
  const [awb, setAwb] = useState("")
  const [courier, setCourier] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/meesho/test-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awb, courier: courier || undefined })
      })

      const data = await res.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Tracking API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">AWB Number</label>
            <Input
              placeholder="Enter AWB number"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Courier (optional - leave empty for auto-detect)
            </label>
            <Input
              placeholder="Delhivery, XPressBees, or Shadowfax"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
            />
          </div>

          <Button onClick={handleTest} disabled={!awb || loading}>
            {loading ? "Testing..." : "Test Tracking"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>

              {result.logs && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">Logs:</h4>
                  <div className="bg-yellow-50 p-4 rounded">
                    {result.logs.map((log: string, i: number) => (
                      <div key={i} className="text-sm font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.result && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">Tracking Info:</h4>
                  <div className="bg-blue-50 p-4 rounded space-y-2">
                    <div><strong>Courier:</strong> {result.result.courier}</div>
                    <div><strong>Status:</strong> {result.result.status}</div>
                    <div><strong>Status Message:</strong> {result.result.statusMessage}</div>
                    <div><strong>Last Update:</strong> {result.result.lastUpdate}</div>
                    {result.result.estimatedDelivery && (
                      <div><strong>Expected Delivery:</strong> {result.result.estimatedDelivery}</div>
                    )}
                    {result.result.currentLocation && (
                      <div><strong>Location:</strong> {result.result.currentLocation}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 p-4 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">Sample AWB Numbers (from your logs):</h3>
        <div className="space-y-1 text-sm font-mono">
          <div>Delhivery: 1490819517086804</div>
          <div>XPressBees: 134095797958842</div>
          <div>Shadowfax: SF2291784559FPL</div>
        </div>
      </div>
    </div>
  )
}
