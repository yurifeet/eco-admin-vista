import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye,Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const colStyle = { width: "calc(100%/8)" };
  const colStyleFecha = { width: "10%" };

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
          <PaginationLink onClick={() => handlePageChange(i)} active={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-1">Pedidos</h2>
      <p className="text-muted-foreground mb-4">
        Gestione los pedidos de ventas
      </p>
      {/* Buscador y filtros */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:gap-4">
        <input
          type="text"
          placeholder="Buscar por número de pedido"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/4"
        >
          {[
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
          ].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={resetFilters}
          className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded"
        >
          Reiniciar filtros
        </button>
      </div>

      {isLoading ? (
        <div>Cargando pedidos...</div>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número de pedido
                    </th>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha compra
                    </th>
                    <th style={colStyleFecha} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Punto de compra
                    </th>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor total
                    </th>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                    <th style={colStyle} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exportar
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.entity_id}>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                        {order.increment_id}
                      </td>
                      <td style={colStyleFecha} className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const date = new Date(order.created_at);
                          const day = date.getDate().toString().padStart(2, "0");
                          const month = (date.getMonth() + 1).toString().padStart(2, "0");
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                      </td>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                        {order.customer_firstname} {order.customer_lastname}
                      </td>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                        {order.store_name}
                      </td>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                        {translateOrderStatus(order.status)}
                      </td>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                        {"$ " +
                          Number(order.grand_total).toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                      </td>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate("/dashboard/ventas/PedidoDetalle", {
                            state: { orderId: order.entity_id },
                          })
                        }
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver pedido"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          navigate("/dashboard/ventas/PedidoEnvio", {
                            state: { orderId: order.entity_id },
                          })
                        }
                        className="text-blue-600 hover:text-blue-900"
                        title="Enviar pedido"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </td>
                      <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
  
              <div className="mt-4 flex justify-center">
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Pedidos;