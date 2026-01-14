"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, Plus, Pencil, Trash2, FileText, Package, TrendingUp, Clock, CheckCircle2, XCircle, RefreshCw, AlertCircle, Radio, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { getTrackingUrl } from "@/lib/courier-tracking"

type OrderStatus = "pending" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "rto" | "cancelled"

interface MeeshoOrder {
  id: string
  order_id: string
  product_name?: string
  sku?: string
  quantity?: number
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  customer_city?: string
  customer_state?: string
  customer_pincode?: string
  awb_number?: string
  courier_partner?: string
  status: OrderStatus
  last_status_update?: string
  expected_delivery_date?: string
  delivered_date?: string
  label_file_url?: string
  label_file_name?: string
  notes?: string
  created_at: string
  updated_at: string
}

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-gray-500",
  shipped: "bg-blue-500",
  in_transit: "bg-yellow-500",
  out_for_delivery: "bg-orange-500",
  delivered: "bg-green-500",
  rto: "bg-red-500",
  cancelled: "bg-red-700",
}

const statusIcons: Record<OrderStatus, any> = {
  pending: Clock,
  shipped: Package,
  in_transit: TrendingUp,
  out_for_delivery: Package,
  delivered: CheckCircle2,
  rto: RefreshCw,
  cancelled: XCircle,
}

export function MeeshoOrderTracker() {
  const [orders, setOrders] = useState<MeeshoOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false)
  const [addOrderDialogOpen, setAddOrderDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<MeeshoOrder | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [parsingPDF, setParsingPDF] = useState(false)
  const [parseResult, setParseResult] = useState<any>(null)
  const [trackingOrder, setTrackingOrder] = useState<string | null>(null)
  const [bulkTracking, setBulkTracking] = useState(false)
  const [trackingProgress, setTrackingProgress] = useState({ current: 0, total: 0 })
  const [previewOrders, setPreviewOrders] = useState<any[]>([])
  const [confirmingOrders, setConfirmingOrders] = useState(false)
  const [sortField, setSortField] = useState<keyof MeeshoOrder | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<MeeshoOrder>>({
    order_id: "",
    product_name: "",
    sku: "",
    quantity: 1,
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    customer_city: "",
    customer_state: "",
    customer_pincode: "",
    awb_number: "",
    courier_partner: "",
    status: "pending",
    notes: "",
  })

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const url = filterStatus !== "all"
        ? `/api/meesho/orders?status=${filterStatus}&t=${Date.now()}`
        : `/api/meesho/orders?t=${Date.now()}`
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      const json = await res.json()
      if (json.data) {
        setOrders(json.data)
      }
    } catch (error) {
      toast.error("Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [filterStatus])

  useEffect(() => {
    console.log("Preview orders updated:", previewOrders.length)
  }, [previewOrders])

  const handleBulkPDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file")
      return
    }

    setParsingPDF(true)
    setPreviewOrders([])
    setParseResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("preview", "true") // Request preview mode

      console.log("Uploading PDF for preview:", file.name)

      const res = await fetch("/api/meesho/parse-labels", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()
      console.log("Parse response:", json)

      if (json.error) {
        toast.error(json.error)
        setPreviewOrders([])
      } else {
        toast.success(json.message || "PDF parsed successfully!")
        const orders = json.data?.orders || []
        console.log("Extracted orders count:", orders.length)
        console.log("First order:", orders[0])
        setPreviewOrders(orders)
        setParseResult(json.data)
      }
    } catch (error: any) {
      console.error("Parse error:", error)
      toast.error("Failed to parse PDF: " + error.message)
      setPreviewOrders([])
    } finally {
      setParsingPDF(false)
      // Don't reset file input so filename stays visible
      // e.target.value = ""
    }
  }

  const handleConfirmOrders = async () => {
    setConfirmingOrders(true)
    try {
      const res = await fetch("/api/meesho/confirm-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: previewOrders,
        }),
      })

      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        toast.success(json.message || "Orders created and tracking synced!")
        setPreviewOrders([])
        setParseResult(null)
        setBulkUploadDialogOpen(false)
        // Refresh orders list
        fetchOrders()
      }
    } catch (error) {
      toast.error("Failed to create orders")
    } finally {
      setConfirmingOrders(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviewOrders([])
    setParseResult(null)
  }

  const handleUpdatePreviewOrder = (index: number, field: string, value: any) => {
    setPreviewOrders(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file")
      return
    }

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/meesho/upload-labels", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        toast.success("Label uploaded successfully")
        setFormData(prev => ({
          ...prev,
          label_file_url: json.data.url,
          label_file_name: json.data.fileName,
        }))
      }
    } catch (error) {
      toast.error("Failed to upload file")
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.order_id) {
      toast.error("Order ID is required")
      return
    }

    try {
      const method = editingOrder ? "PUT" : "POST"
      const body = editingOrder ? { ...formData, id: editingOrder.id } : formData

      const res = await fetch("/api/meesho/orders", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        toast.success(editingOrder ? "Order updated successfully" : "Order added successfully")
        setAddOrderDialogOpen(false)
        setEditingOrder(null)
        resetForm()
        fetchOrders()
      }
    } catch (error) {
      toast.error("Failed to save order")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return

    try {
      const res = await fetch(`/api/meesho/orders?id=${id}`, {
        method: "DELETE",
      })

      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        toast.success("Order deleted successfully")
        fetchOrders()
      }
    } catch (error) {
      toast.error("Failed to delete order")
    }
  }

  const resetForm = () => {
    setFormData({
      order_id: "",
      product_name: "",
      sku: "",
      quantity: 1,
      customer_name: "",
      customer_phone: "",
      customer_address: "",
      customer_city: "",
      customer_state: "",
      customer_pincode: "",
      awb_number: "",
      courier_partner: "",
      status: "pending",
      notes: "",
    })
  }

  const openEditDialog = (order: MeeshoOrder) => {
    setEditingOrder(order)
    setFormData(order)
    setAddOrderDialogOpen(true)
  }

  const handleTrackSingleOrder = async (orderId: string) => {
    setTrackingOrder(orderId)
    try {
      const res = await fetch("/api/meesho/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        toast.success(json.message || "Order status updated!")
        fetchOrders()
      }
    } catch (error) {
      toast.error("Failed to track order")
    } finally {
      setTrackingOrder(null)
    }
  }

  const handleBulkTrackOrders = async () => {
    setBulkTracking(true)

    // First, get the count of orders to track
    const ordersToTrack = orders.filter(
      o => ["pending", "shipped", "in_transit", "out_for_delivery"].includes(o.status) && o.awb_number
    )

    setTrackingProgress({ current: 0, total: ordersToTrack.length })

    try {
      // Track orders in parallel batches of 3 for speed (reduced to avoid rate limiting)
      const BATCH_SIZE = 3
      let current = 0
      let successful = 0

      for (let i = 0; i < ordersToTrack.length; i += BATCH_SIZE) {
        const batch = ordersToTrack.slice(i, i + BATCH_SIZE)

        // Track all orders in this batch in parallel
        const results = await Promise.allSettled(
          batch.map(order =>
            fetch("/api/meesho/track-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: order.id }),
            })
          )
        )

        // Count successful requests
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            successful++
          } else {
            console.error(`Failed to track order ${batch[index].order_id}:`, result.reason)
          }
        })

        current += batch.length
        setTrackingProgress({ current, total: ordersToTrack.length })

        // Longer delay between batches to avoid Shadowfax rate limiting (429 errors)
        if (i + BATCH_SIZE < ordersToTrack.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      toast.success(`Tracking completed: ${successful}/${ordersToTrack.length} orders updated`)
      fetchOrders()
    } catch (error) {
      toast.error("Failed to track orders")
    } finally {
      setBulkTracking(false)
      setTrackingProgress({ current: 0, total: 0 })
    }
  }

  const handleCopyAwb = async (awb: string) => {
    try {
      await navigator.clipboard.writeText(awb)
      setCopiedAwb(awb)
      toast.success("AWB copied to clipboard")
      setTimeout(() => setCopiedAwb(null), 2000)
    } catch (error) {
      toast.error("Failed to copy AWB")
    }
  }

  const getStatusStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      shipped: orders.filter(o => o.status === "shipped" || o.status === "in_transit").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      rto: orders.filter(o => o.status === "rto" || o.status === "cancelled").length,
    }
    return stats
  }

  const handleSort = (field: keyof MeeshoOrder) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedOrders = () => {
    if (!sortField) return orders

    return [...orders].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const SortableHeader = ({ field, children }: { field: keyof MeeshoOrder; children: React.ReactNode }) => {
    const isActive = sortField === field
    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </div>
      </TableHead>
    )
  }

  const stats = getStatusStats()
  const sortedOrders = getSortedOrders()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.shipped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Meesho Orders</CardTitle>
              <CardDescription>Track and manage your Meesho orders</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="rto">RTO</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Sync Tracking Button */}
              <Button
                variant="outline"
                onClick={handleBulkTrackOrders}
                disabled={bulkTracking || orders.length === 0}
              >
                {bulkTracking ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {trackingProgress.total > 0 && (
                      <span className="mr-2">
                        {trackingProgress.current}/{trackingProgress.total} ({Math.round((trackingProgress.current / trackingProgress.total) * 100)}%)
                      </span>
                    )}
                  </>
                ) : (
                  <Radio className="h-4 w-4 mr-2" />
                )}
                {!bulkTracking && "Sync All Tracking"}
              </Button>

              {/* Bulk Upload Dialog */}
              <Dialog
                open={bulkUploadDialogOpen}
                onOpenChange={(open) => {
                  setBulkUploadDialogOpen(open)
                  if (!open) {
                    // Reset preview when dialog closes
                    setPreviewOrders([])
                    setParseResult(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Upload Meesho Labels PDF</DialogTitle>
                    <DialogDescription>
                      Upload a PDF to preview extracted orders, then confirm to save
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-150px)]">
                    {previewOrders.length === 0 && (
                      <>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Bulk Import</AlertTitle>
                          <AlertDescription>
                            Upload a PDF with 50-60 labels. We'll extract and show you a preview before saving.
                          </AlertDescription>
                        </Alert>

                        <div>
                          <Label htmlFor="bulk-pdf-upload">Select PDF File</Label>
                          <Input
                            id="bulk-pdf-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleBulkPDFUpload}
                            disabled={parsingPDF}
                            className="mt-2"
                          />
                        </div>

                        {parsingPDF && (
                          <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="mt-2 text-sm text-muted-foreground">Parsing PDF and extracting orders...</p>
                          </div>
                        )}
                      </>
                    )}

                    {previewOrders.length > 0 && (
                      <>
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Preview Extracted Orders</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            Found <strong>{previewOrders.length}</strong> orders. Review and edit if needed, then click "Upload to Supabase" to save.
                          </AlertDescription>
                        </Alert>

                        <div className="border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto max-h-96">
                            <Table>
                              <TableHeader className="sticky top-0 bg-muted">
                                <TableRow>
                                  <TableHead className="w-[100px]">#</TableHead>
                                  <TableHead>Order ID</TableHead>
                                  <TableHead>AWB</TableHead>
                                  <TableHead>Customer</TableHead>
                                  <TableHead>City</TableHead>
                                  <TableHead>Courier</TableHead>
                                  <TableHead>Qty</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewOrders.map((order, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{order.order_id || '-'}</TableCell>
                                    <TableCell className="font-mono text-xs">{order.awb_number || '-'}</TableCell>
                                    <TableCell>{order.customer_name || '-'}</TableCell>
                                    <TableCell>{order.customer_city || '-'}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{order.courier_partner || 'Unknown'}</Badge>
                                    </TableCell>
                                    <TableCell>{order.quantity || 1}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={handleCancelPreview}
                            disabled={confirmingOrders}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleConfirmOrders}
                            disabled={confirmingOrders}
                          >
                            {confirmingOrders ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Uploading & Syncing...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload to Supabase ({previewOrders.length} orders)
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={addOrderDialogOpen} onOpenChange={(open) => {
                setAddOrderDialogOpen(open)
                if (!open) {
                  setEditingOrder(null)
                  resetForm()
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingOrder ? "Edit Order" : "Add New Order"}</DialogTitle>
                    <DialogDescription>
                      Enter order details manually or upload a label PDF
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* File Upload */}
                    <div>
                      <Label htmlFor="label-upload">Upload Label PDF (Optional)</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="label-upload"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                        {formData.label_file_url && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(formData.label_file_url, "_blank")}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="order_id">Order ID *</Label>
                        <Input
                          id="order_id"
                          value={formData.order_id}
                          onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                          placeholder="Enter Meesho order ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="awb_number">AWB Number</Label>
                        <Input
                          id="awb_number"
                          value={formData.awb_number}
                          onChange={(e) => setFormData({ ...formData, awb_number: e.target.value })}
                          placeholder="Tracking number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="product_name">Product Name</Label>
                        <Input
                          id="product_name"
                          value={formData.product_name}
                          onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="courier_partner">Courier Partner</Label>
                        <Input
                          id="courier_partner"
                          value={formData.courier_partner}
                          onChange={(e) => setFormData({ ...formData, courier_partner: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customer_name">Customer Name</Label>
                        <Input
                          id="customer_name"
                          value={formData.customer_name}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer_phone">Customer Phone</Label>
                        <Input
                          id="customer_phone"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customer_address">Customer Address</Label>
                      <Textarea
                        id="customer_address"
                        value={formData.customer_address}
                        onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="customer_city">City</Label>
                        <Input
                          id="customer_city"
                          value={formData.customer_city}
                          onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer_state">State</Label>
                        <Input
                          id="customer_state"
                          value={formData.customer_state}
                          onChange={(e) => setFormData({ ...formData, customer_state: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer_pincode">Pincode</Label>
                        <Input
                          id="customer_pincode"
                          value={formData.customer_pincode}
                          onChange={(e) => setFormData({ ...formData, customer_pincode: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: OrderStatus) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="rto">RTO</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setAddOrderDialogOpen(false)
                        setEditingOrder(null)
                        resetForm()
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit}>
                        {editingOrder ? "Update Order" : "Add Order"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>AWB</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found. Click "Add Order" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="order_id">Order ID</SortableHeader>
                    <SortableHeader field="customer_name">Customer</SortableHeader>
                    <SortableHeader field="awb_number">AWB</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <SortableHeader field="delivered_date">Delivery</SortableHeader>
                    <SortableHeader field="created_at">Created</SortableHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => {
                    const StatusIcon = statusIcons[order.status]
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_id}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{order.customer_name || "-"}</div>
                            {order.customer_city && (
                              <div className="text-muted-foreground text-xs">{order.customer_city}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.awb_number ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-2">
                                <a
                                  href={getTrackingUrl(order.awb_number, order.courier_partner || '')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-mono flex items-center gap-1"
                                >
                                  {order.awb_number}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <button
                                  onClick={() => handleCopyAwb(order.awb_number!)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                  title="Copy AWB"
                                >
                                  {copiedAwb === order.awb_number ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                              {order.courier_partner && (
                                <div className="text-muted-foreground text-xs mt-1">
                                  {order.courier_partner}
                                  {order.courier_partner.toLowerCase().includes('xpress') && (
                                    <span className="text-orange-600 ml-1">(Track manually)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[order.status]} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {order.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.delivered_date ? (
                              <div className="text-green-600 font-medium">
                                {new Date(order.delivered_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            ) : order.expected_delivery_date ? (
                              <div className="text-muted-foreground">
                                {(() => {
                                  try {
                                    const date = new Date(order.expected_delivery_date)
                                    return !isNaN(date.getTime())
                                      ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                      : order.expected_delivery_date
                                  } catch {
                                    return order.expected_delivery_date
                                  }
                                })()}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">-</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {order.awb_number && order.status !== "delivered" && order.status !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTrackSingleOrder(order.id)}
                                disabled={trackingOrder === order.id}
                                title="Sync tracking status"
                              >
                                {trackingOrder === order.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Radio className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {order.label_file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(order.label_file_url, "_blank")}
                                title="View label PDF"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(order)} title="Edit order">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(order.id)} title="Delete order">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
