"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DebugOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meesho/orders?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const json = await res.json()
      if (json.data) {
        setOrders(json.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Debug Orders - Raw Database Data</CardTitle>
          <Button onClick={fetchOrders} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border p-4 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Order ID:</strong> {order.order_id}</div>
                  <div><strong>AWB:</strong> {order.awb_number}</div>
                  <div><strong>Courier:</strong> {order.courier_partner}</div>
                  <div><strong>Status (DB):</strong> <span className="text-red-600 font-bold">{order.status}</span></div>
                  <div><strong>Last Update:</strong> {order.last_status_update || 'Never'}</div>
                  <div><strong>Updated At:</strong> {new Date(order.updated_at).toLocaleString()}</div>
                </div>

                {order.tracking_history && order.tracking_history.length > 0 && (
                  <div className="mt-2">
                    <strong>Latest Tracking:</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                      {JSON.stringify(order.tracking_history[order.tracking_history.length - 1], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
