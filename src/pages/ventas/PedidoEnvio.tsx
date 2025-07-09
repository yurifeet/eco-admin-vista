import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePedidosVentasApi } from "@/hooks/usePedidosVentasApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { translateOrderStatus } from "@/helpers/translateOrderStatus";
import { toast } from "sonner";

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
    item_id?: number; // se asume que este campo existe
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
}

// Tipo para cada código de seguimiento
interface TrackingCode {
  id: number;
  nombre: string;
  titulo: string;
  numero: string;
}

const PedidoEnvio = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = location.state || {};
  // Incluimos los métodos getOrderDetail, sendOrder y detailSaleOrderByIdOrder
  const { getOrderDetail, sendOrder, detailSaleOrderByIdOrder } = usePedidosVentasApi();
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Estado para los códigos de seguimiento (manual y provenientes de la API)
  const [trackingCodes, setTrackingCodes] = useState<TrackingCode[]>([]);
  // Estados para Comentarios de envío (input para nuevos comentarios)
  const [envioComment, setEnvioComment] = useState("");
  const [appendComment, setAppendComment] = useState(false);
  // Estado para el detalle del envío proveniente de detailSaleOrderByIdOrder
  const [shipmentDetail, setShipmentDetail] = useState<any>(null);

  const confirmSendOrder = (): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.custom(
        (toastId) => (
          <div className="flex flex-col items-center gap-4 p-4 bg-white shadow rounded">
            <span>Seguro que desea enviar pedido?</span>
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

  // Una vez obtenido orderDetail, consultamos el detalle del envío mediante detailSaleOrderByIdOrder
  useEffect(() => {
    const fetchShipmentDetail = async () => {
      if (orderDetail && orderDetail.entity_id) {
        const shipmentData = await detailSaleOrderByIdOrder(orderDetail.entity_id);
        // Si la respuesta tiene items, tomamos el primer item
        if (shipmentData && shipmentData.items && shipmentData.items.length > 0) {
          setShipmentDetail(shipmentData.items[0]);
          // Si hay tracks en la respuesta, pre-populamos el estado trackingCodes
          if (shipmentData.items[0].tracks && shipmentData.items[0].tracks.length > 0) {
            const apiTracks: TrackingCode[] = shipmentData.items[0].tracks.map((track: any) => ({
              id: track.entity_id,
              nombre: track.carrier_code, // Valor para el select (se mostrará con el título correspondiente)
              titulo: track.title,
              numero: track.track_number
            }));
            setTrackingCodes(apiTracks);
          }
        }
      }
    };
    if (orderDetail && orderDetail.entity_id) {
      fetchShipmentDetail();
    }
  }, [orderDetail]);

  // Filtrar productos para que aparezca solo uno por SKU.
  const uniqueItems = useMemo(() => {
    if (!orderDetail || !orderDetail.items) return [];
    const acc: Record<string, any> = {};
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

  const handleExportExcel = () => {
    if (!orderDetail) return;
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
    const productHeader = ["SKU", "Nombre", "Cantidad", "Precio"];
    const productData =
      uniqueItems && uniqueItems.length > 0
        ? uniqueItems.map((item) => [
            item.sku || "N/A",
            item.name || "N/A",
            item.qty_ordered || 0,
            item.price !== undefined ? Number(item.price).toFixed(2) : "0.00"
          ])
        : [];
    const ws_data = [];
    ws_data.push(["Dirección de Facturación"]);
    ws_data.push([]);
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  // Función para enviar el pedido
  const handleSendOrder = async () => {
    // Solicita confirmación antes de enviar
    const confirmed = await confirmSendOrder();
    if (!confirmed) return;
  
    if (!orderDetail || !orderDetail.items || orderDetail.items.length === 0) {
      toast.error("No se encontró ningún item en el pedido.");
      return;
    }
  
    const payload: any = {
      items: orderDetail.items.map((item) => ({
        order_item_id: item.item_id,
        qty: item.qty_ordered
      })),
      notify: true,
      appendComment: appendComment,
      tracks: trackingCodes.map((code) => ({
        track_number: code.numero,
        title: code.titulo,
        carrier_code: code.nombre
      }))
    };
  
    // Solo agregar 'comment' en el payload si no está vacío
    if (appendComment && envioComment.trim().length > 0) {
      payload.comment = [{ comment: envioComment }];
    }
  
    const result = await sendOrder(orderId, payload);
    if (result?.success) {
      toast.success(result.message || "El pedido ha sido enviado correctamente.");
      
      // Reconsultar getOrderDetail para actualizar orderDetail
      const updatedData = await getOrderDetail(orderId);
      if (updatedData) {
        if (Array.isArray(updatedData.items) && updatedData.items.length > 0) {
          setOrderDetail(updatedData.items[0]);
        } else {
          setOrderDetail(updatedData);
        }
      }
      
      // Reconsultamos el detalle del envío para actualizar la información de Transportista
      if (orderDetail && orderDetail.entity_id) {
        const shipmentData = await detailSaleOrderByIdOrder(orderDetail.entity_id);
        if (shipmentData && shipmentData.items && shipmentData.items.length > 0) {
          setShipmentDetail(shipmentData.items[0]);
          if (
            shipmentData.items[0].tracks &&
            shipmentData.items[0].tracks.length > 0
          ) {
            const apiTracks: TrackingCode[] = shipmentData.items[0].tracks.map(
              (track: any) => ({
                id: track.entity_id,
                nombre: track.carrier_code,
                titulo: track.title,
                numero: track.track_number
              })
            );
            setTrackingCodes(apiTracks);
          }
        }
      }
    } else {
      toast.error("Error al enviar el pedido.");
    }
  };
  // Funciones para códigos de seguimiento (funcionalidad para agregar/eliminar se mantiene)
  const handleAddTrackingCode = () => {
    const newCode: TrackingCode = {
      id: Date.now(),
      nombre: "",
      titulo: "",
      numero: ""
    };
    setTrackingCodes([...trackingCodes, newCode]);
  };

  const handleRemoveTrackingCode = (id: number) => {
    setTrackingCodes(trackingCodes.filter((code) => code.id !== id));
  };

  const handleTrackingCodeChange = (
    id: number,
    field: keyof TrackingCode,
    value: string
  ) => {
    setTrackingCodes(
      trackingCodes.map((code) =>
        code.id === id ? { ...code, [field]: value } : code
      )
    );
  };

  if (loading) {
    return <div>Cargando detalle del pedido...</div>;
  }

  if (!orderDetail) {
    return <div>No se encontró información para este pedido.</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Botones de acción */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => navigate("/dashboard/ventas/pedidos")}
          className="bg-transparent hover:bg-transparent text-gray-800 border border-gray-300"
        >
          Regresar
        </Button>
        { !["processing", "canceled", "closed", "holded","complete"].includes(orderDetail.status || "") && (
          <Button
            variant="primary"
            onClick={handleSendOrder}
            className="border border-solid border-gray-500"
          >
            Enviar Pedido
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
      {/* Cards con la información */}
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
                <strong>Ciudad:</strong> {orderDetail.billing_address.city || "N/A"}
                {orderDetail.billing_address.region && ` - (${orderDetail.billing_address.region})`}
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
            <CardTitle>Información de la Cuenta</CardTitle>
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

        {/* Card Transportista: Se muestran los códigos de seguimiento provenientes de la API (si existen)
            además de la funcionalidad de agregar/eliminar */}
       <Card>
        <CardHeader>
            <CardTitle>Transportista</CardTitle>
        </CardHeader>
        <CardContent>
            <Button onClick={handleAddTrackingCode} className="mb-4">
            Agregar código seguimiento
            </Button>
            <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Número</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {trackingCodes.map((code) => (
                    <TableRow key={code.id}>
                    <TableCell>
                        <select
                        value={code.nombre}
                        onChange={(e) =>
                            handleTrackingCodeChange(code.id, "nombre", e.target.value)
                        }
                        className="border rounded p-1"
                        >
                        <option value="">Seleccione</option>
                        <option value="flatrate">Tarifa plana</option>
                        <option value="freeshipping">Envío gratuito</option>
                        <option value="tablerate">Tarifa por tabla</option>
                        <option value="ups">UPS</option>
                        <option value="usps">USPS</option>
                        <option value="fedex">FedEx</option>
                        <option value="dhl">DHL</option>
                        </select>
                    </TableCell>
                    <TableCell>
                        <input
                        type="text"
                        value={code.titulo}
                        onChange={(e) =>
                            handleTrackingCodeChange(code.id, "titulo", e.target.value)
                        }
                        className="border rounded p-1"
                        />
                    </TableCell>
                    <TableCell>
                        <input
                        type="text"
                        value={code.numero}
                        onChange={(e) =>
                            handleTrackingCodeChange(code.id, "numero", e.target.value)
                        }
                        className="border rounded p-1"
                        />
                    </TableCell>
                    </TableRow>
                ))}
                {trackingCodes.length === 0 && (
                    <TableRow>
                    <TableCell colSpan={3} className="text-center">
                        No hay códigos de seguimiento
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
        </Card>

        {/* Card Comentarios de envío: Se muestra el input para agregar comentario y, si shipmentDetail tiene comments, se listan a continuación */}
        <Card>
          <CardHeader>
            <CardTitle>Comentarios de envío</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              name="comment"
              value={envioComment}
              onChange={(e) => setEnvioComment(e.target.value)}
              placeholder="Ingrese comentario de envío"
              className="w-full border rounded p-2 mb-2"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="appendComment"
                checked={appendComment}
                onChange={(e) => setAppendComment(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="appendComment" className="text-sm">
                Anexar comentarios
              </label>
            </div>
            {shipmentDetail && shipmentDetail.comments && shipmentDetail.comments.length > 0 && (
              <div className="mt-4">
                {shipmentDetail.comments.map((c: any, idx: number) => (
                  <div key={idx} className="border p-2 rounded mb-2">
                    <div>
                      <strong>Comentario:</strong> {c.comment}
                    </div>
                    <div>
                      <strong>Creado:</strong> {c.created_at}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                          maximumFractionDigits: 2
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

      <div className="flex justify-end">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Totales del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Total parcial:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.subtotal || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Cargos por manejo y envío:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.shipping_amount || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Impuesto:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.tax_amount || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Gran total:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.grand_total || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Total pagado:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.total_paid || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium">Total reembolsado:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.total_refunded || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total debido:</span>
                <span className="font-semibold text-gray-800">
                  {"$ " +
                    Number(orderDetail.total_due || 0).toLocaleString("es-CO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
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

export default PedidoEnvio;