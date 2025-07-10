import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import * as XLSX from "xlsx";
import { usePedidosVentasApi } from "@/hooks/usePedidosVentasApi";
import { translateOrderStatus } from "@/helpers/translateOrderStatus";

const statusOptions = [
  { value: "Todos", label: "Todos" },
  { value: "Canceled", label: translateOrderStatus("canceled") },
  { value: "Closed", label: translateOrderStatus("closed") },
  { value: "Complete", label: translateOrderStatus("complete") },
  { value: "Suspected Fraud", label: translateOrderStatus("cuspected fraud") },
  { value: "holded", label: translateOrderStatus("holded") },
  { value: "Payment Review", label: translateOrderStatus("payment review") },
  { value: "Paypal Caceled Reversal", label: translateOrderStatus("paypal caceled reversal") },
  { value: "Paypal Reserved", label: translateOrderStatus("paypal reserved") },
  { value: "Pending", label: translateOrderStatus("pending") },
  { value: "Pending Payment", label: translateOrderStatus("pending payment") },
  { value: "Pending Paypal", label: translateOrderStatus("pending paypal") },
  { value: "Processing", label: translateOrderStatus("processing") },
];

const Pedidos = () => {
  const { getOrderList, getOrderDetail } = usePedidosVentasApi();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  // Se solicita 10 registros por página
  const pageSize = 10;

  const fetchOrders = async (page: number) => {
    setIsLoading(true);
    const data = await getOrderList(page, pageSize, searchQuery, statusFilter);
    if (data) {
      const sortedItems = data.items.sort((a: any, b: any) =>
        b.increment_id.localeCompare(a.increment_id)
      );
      setOrders(sortedItems);
      setTotalCount(data.total_count);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleExportOrder = async (orderId: number) => {
    const data = await getOrderDetail(orderId);
    if (!data) return;

    const billingSource =
      data.items && data.items.length > 0 ? data.items[0] : data;
    const products =
      billingSource && billingSource.items ? billingSource.items : [];

    const skuMap: { [sku: string]: any } = {};
    products.forEach((item: any) => {
      if (!item.sku) return;
      if (!skuMap[item.sku]) {
        skuMap[item.sku] = item;
      } else {
        if (
          (!skuMap[item.sku].price || skuMap[item.sku].price === 0) &&
          item.price &&
          item.price !== 0
        ) {
          skuMap[item.sku] = item;
        }
      }
    });
    const uniqueItems = Object.values(skuMap);

    const billingData = [
      ["Calle", "Ciudad", "Código Postal", "País", "Teléfono"],
      [
        Array.isArray(billingSource.billing_address?.street)
          ? billingSource.billing_address.street.join(" ")
          : billingSource.billing_address?.street || "N/A",
        billingSource.billing_address?.city || "N/A",
        billingSource.billing_address?.postcode || "N/A",
        billingSource.billing_address?.country_id || "N/A",
        billingSource.billing_address?.telephone || "N/A",
      ],
    ];

    const productHeader = ["SKU", "Nombre", "Cantidad", "Precio"];
    const productData = uniqueItems.map((item: any) => [
      item.sku || "N/A",
      item.name || "N/A",
      item.qty_ordered || 0,
      item.price !== undefined ? Number(item.price).toFixed(2) : "0.00",
    ]);

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
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Pedido_${orderId}.xlsx`);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("Todos");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Solo se mostrarán hasta 10 números de página en la paginación
  const renderPaginationItems = () => {
    const items = [];
    const maxPageLinks = 10;
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > maxPageLinks) {
      const half = Math.floor(maxPageLinks / 2);
      startPage = Math.max(1, currentPage - half);
      endPage = startPage + maxPageLinks - 1;
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPageLinks + 1);
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => handlePageChange(i)} isActive={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Gestione los pedidos de ventas
          </p>
        </div>
      </div>
      {/* Card de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por número de pedido</label>
              <Input
                type="text"
                placeholder="Número de pedido"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full"
              >
                Reiniciar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de pedido</TableHead>
                  <TableHead>Fecha compra</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Punto de compra</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Valor total</TableHead>
                  <TableHead>Acciones</TableHead>
                  <TableHead>Exportar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.entity_id}>
                      <TableCell className="font-medium">{order.increment_id}</TableCell>
                      <TableCell>
                        {(() => {
                          const date = new Date(order.created_at);
                          const day = date.getDate().toString().padStart(2, "0");
                          const month = (date.getMonth() + 1).toString().padStart(2, "0");
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        {order.customer_firstname} {order.customer_lastname}
                      </TableCell>
                      <TableCell>{order.store_name}</TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            order.status.toLowerCase() === "complete"
                              ? "bg-green-100 text-green-800"
                              : order.status.toLowerCase() === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : order.status.toLowerCase() === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status.toLowerCase() === "canceled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {translateOrderStatus(order.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {"$ " +
                          Number(order.grand_total).toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate("/dashboard/ventas/PedidoDetalle", {
                                state: { orderId: order.entity_id },
                              })
                            }
                            title="Ver pedido"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              ["closed", "canceled", "holded"].includes(
                                order.status.toLowerCase()
                              )
                            }
                            onClick={() =>
                              navigate("/dashboard/ventas/PedidoEnvio", {
                                state: { orderId: order.entity_id },
                              })
                            }
                            title="Enviar pedido"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-green-600 hover:text-green-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportOrder(order.entity_id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l-3 3m3-3l3 3M12 3v9"
                            />
                          </svg>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      No se encontraron pedidos
                    </TableCell>
                  </TableRow>
                                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center pb-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Pedidos;