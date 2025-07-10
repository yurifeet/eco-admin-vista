import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePedidosVentasApi } from "@/hooks/usePedidosVentasApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { translateOrderStatus } from "@/helpers/translateOrderStatus";
import { toast } from "sonner";

const confirmAction = (): Promise<boolean> => {
  return new Promise((resolve) => {
    toast.custom(
      (toastId) => (
        <div className="flex flex-col items-center gap-4 p-4 bg-white shadow rounded">
          <span>Esta seguro que desea cancelar el pedido?</span>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(true);
              }}
            >
              Confirmar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast.dismiss(toastId);
                resolve(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  });
};

interface StatusHistory {
  status?: string;
  created_at?: string;
  comment?: string;
}

interface OrderDetail {
  status?: string;
  subtotal?: number;
  shipping_amount?: number;   
  tax_amount?: number;
  grand_total?: number;   
  total_paid?: number;
  total_refunded?: number;
  total_due?: number;
  billing_address: {
    street?: string;
    city?: string;
    postcode?: string;
    country_id?: string;
    firstname: string;
    lastname: string;
    region?: string;
    telephone?: string;
    email?: string;
  };
  payment: {
    method?: string;
    transaction_id?: string;
    amount_ordered?: number;
    shipping_amount?: number;
    base_amount_ordered?: number;
    po_number?: string;
    additional_information?: Array<string>;
  };
  items: Array<{
    sku?: string;
    name?: string;
    qty_ordered?: number;
    price?: number;
    tax_percent?: number;
    price_incl_tax?: number;
    tax_amount?: number;
    discount_amount?: number;
  }>;
  status_histories?: StatusHistory[];
  // Campos adicionales
  increment_id?: string;
  store_name?: string;
  created_at?: string;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const PedidoDetalle = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = location.state || {};
  const { getOrderDetail, cancelOrder } = usePedidosVentasApi();
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetail = async () => {
      const data = await getOrderDetail(orderId);  
      if (data) {
        if (Array.isArray(data.items) && data.items.length > 0) {
          setOrderDetail(data.items[0]);
        } else {
          setOrderDetail(data);
        }
      }
      setLoading(false);
    };
  
    if (orderId) {
      fetchDetail();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  // Filtrar productos para que por cada SKU solo aparezca uno.
  const uniqueItems = useMemo(() => {
    if (!orderDetail || !orderDetail.items) return [];
    const acc: { [sku: string]: any } = {};
    orderDetail.items.forEach((item) => {
      const sku = item.sku;
      if (!sku) return;
      if (!acc[sku]) {
        acc[sku] = item;
      } else {
        if ((!acc[sku].price || acc[sku].price === 0) && item.price && item.price !== 0) {
          acc[sku] = item;
        }
      }
    });
    return Object.values(acc);
  }, [orderDetail]);

  // Función para exportar la información a Excel.
  const handleExportExcel = () => {
    if (!orderDetail) return;
  
    // Datos de Dirección de Facturación
    const billingData = [
      ["Calle", "Ciudad", "Código Postal", "País", "Teléfono"],
      [
        orderDetail.billing_address.street || "N/A",
        orderDetail.billing_address.city || "N/A",
        orderDetail.billing_address.postcode || "N/A",
        orderDetail.billing_address.country_id || "N/A",
        orderDetail.billing_address.telephone || "N/A"
      ]
    ];
  
    // Datos de Productos usando uniqueItems ya filtrado
    const productHeader = ["SKU", "Nombre", "Cantidad", "Precio"];
    const productData = uniqueItems && uniqueItems.length > 0
      ? uniqueItems.map(item => [
          item.sku || "N/A",
          item.name || "N/A",
          item.qty_ordered || 0,
          item.price !== undefined ? Number(item.price).toFixed(2) : "0.00"
        ])
      : [];
  
    // Armar la hoja de Excel combinando ambas secciones
    const ws_data = [];
    ws_data.push(["Dirección de Facturación"]);
    ws_data.push([]); // Línea vacía para separador
    ws_data.push(...billingData);
    ws_data.push([]);
    ws_data.push(["Productos"]);
    ws_data.push(productHeader);
    ws_data.push(...productData);
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 } 
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Pedido_${orderId}.xlsx`);
  };
  
  const handleCancelOrder = async () => {
    const confirmed = await confirmAction();
    if (!confirmed) return; // Cierra el modal si no confirma.
    const result = await cancelOrder(orderId);
    if (result?.success === true) {
      toast.success("Pedido cancelado exitosamente.");
      setOrderDetail(prev => prev ? { ...prev, status: "canceled" } : prev);
    } else {
      toast.error("Error al cancelar el pedido.");
    }
  };

  if (loading) {
    return <div>Cargando detalle del pedido...</div>;
  }

  if (!orderDetail) {
    return <div>No se encontró información para este pedido.</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Botones de acción en la parte superior derecha */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => navigate("/dashboard/ventas/pedidos")}
          className="bg-transparent hover:bg-transparent text-gray-800 border border-gray-300"
        >
          Regresar
        </Button>
        { !["canceled", "complete", "closed"].includes(orderDetail.status || "") && (
          <Button variant="destructive" onClick={handleCancelOrder}>
            Cancelar Pedido
          </Button>
        )}
        <Button onClick={handleExportExcel}>Exportar</Button>        
      </div>

      {/* Sección con Pedido Número, Origen, Fecha y Estado */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <Card className="w-full md:w-1/4">
          <CardContent className="flex flex-col items-center">
            <span className="text-lg text-blue-600">Pedido Número:</span>
            <span className="text-xl font-bold text-gray-800">
              {orderDetail.increment_id || "N/A"}
            </span>
          </CardContent>
        </Card>
        <Card className="w-full md:w-1/4">
          <CardContent className="flex flex-col items-center">
            <span className="text-lg text-blue-600">Origen:</span>
            <span className="text-xl font-bold text-gray-800">
              {orderDetail.store_name || "N/A"}
            </span>
          </CardContent>
        </Card>
        <Card className="w-full md:w-1/4">
          <CardContent className="flex flex-col items-center">
            <span className="text-lg text-blue-600">Fecha:</span>
            <span className="text-xl font-bold text-gray-800">
              {orderDetail.created_at ? formatDate(orderDetail.created_at) : "N/A"}
            </span>
          </CardContent>
        </Card>
        <Card className="w-full md:w-1/4">
          <CardContent className="flex flex-col items-center">
            <span className="text-lg text-blue-600">Estado:</span>
            <span className="text-xl font-bold text-gray-800">
              {translateOrderStatus(orderDetail.status) || "N/A"}
            </span>
          </CardContent>
        </Card>
      </div>
      {/* Grid: Dirección de Facturación e Información de la cuenta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dirección de Facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <strong>Calle:</strong> {orderDetail.billing_address.street || "N/A"}
              </div>
              <div>
                <strong>Ciudad:</strong> {orderDetail.billing_address.city || "N/A"}{" "}
                {orderDetail.billing_address.region ? ` - (${orderDetail.billing_address.region})` : ""}
              </div>
              <div>
                <strong>Código Postal:</strong> {orderDetail.billing_address.postcode || "N/A"}
              </div>
              <div>
                <strong>País:</strong> {orderDetail.billing_address.country_id || "N/A"}
              </div>
              <div>
                <strong>Teléfono:</strong> {orderDetail.billing_address.telephone || "N/A"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información de la cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <strong>Nombre Cliente:</strong> {orderDetail.billing_address.firstname} {orderDetail.billing_address.lastname}
              </div>
              <div>
                <strong>Correo:</strong> {orderDetail.billing_address.email || "N/A"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Información de Pago y Histórico de Estados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Información de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <strong>Método de Pago:</strong> {orderDetail.payment.additional_information || "N/A"}
              </div>
              {orderDetail.payment.po_number && (
                <div>
                  <strong>Condición especial:</strong> {orderDetail.payment.po_number}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Estados</CardTitle>
          </CardHeader>
          <CardContent>
            {orderDetail.status_histories && orderDetail.status_histories.length > 0 ? (
              <div className={orderDetail.status_histories.length > 5 ? "max-h-60 overflow-y-auto" : ""}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead>Comentario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetail.status_histories.map((history, index) => (
                      <TableRow key={index}>
                        <TableCell>{translateOrderStatus(history.status) || "N/A"}</TableCell>
                        <TableCell>
                          {history.created_at
                            ? (() => {
                                const date = new Date(history.created_at);
                                const day = date.getDate().toString().padStart(2, "0");
                                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                                const year = date.getFullYear();
                                const hours = date.getHours().toString().padStart(2, "0");
                                const minutes = date.getMinutes().toString().padStart(2, "0");
                                const seconds = date.getSeconds().toString().padStart(2, "0");
                                return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                              })()
                            : "N/A"}
                        </TableCell>
                        <TableCell>{history.comment || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div>No hay histórico de estados.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card para Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueItems && uniqueItems.length > 0 ? (
                uniqueItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.sku || "N/A"}</TableCell>
                    <TableCell>{item.name || "N/A"}</TableCell>
                    <TableCell>{item.qty_ordered || 0}</TableCell>
                    <TableCell>
                      {"$ " +
                        Number(item.price).toLocaleString("es-CO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Sin productos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card para Totales del pedido */}
      <div className="flex justify-end">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Totales del pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Total parcial:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.subtotal || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Cargos por manejo y envío:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.shipping_amount || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Impuesto:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.tax_amount || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Gran total:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.grand_total || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Total pagado:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.total_paid || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Total reembolsado:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.total_refunded || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total debido:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.total_due || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PedidoDetalle;