import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Estados para los filtros
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  // Función para obtener pedidos
  const fetchOrders = async (page: number) => {
    setIsLoading(true);
    const data = await getOrderList(page, 10, searchQuery, statusFilter);
    if (data) {
      // Ordenamos los pedidos por número de pedido de forma descendente
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
  }, [currentPage, searchQuery, statusFilter]);

  // Reiniciamos la página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Total de páginas (10 registros por página)
  const totalPages = Math.ceil(totalCount / 10);
  const colStyle = { width: "calc(100%/8)" }; // Se aumenta a 8 columnas
  const colStyleFecha = { width: "10%" };

  // Función para exportar datos de un pedido a Excel
  const handleExportOrder = async (orderId: number) => {
    const data = await getOrderDetail(orderId);
    if (!data) return;
  
    const billingSource = data.items && data.items.length > 0 ? data.items[0] : data;
    const products = billingSource && billingSource.items ? billingSource.items : [];
    
    // Filtrar productos: por cada SKU se trae un único registro;
    // si existen duplicados y uno tiene price 0, se reemplaza por el que tenga price !== 0.
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
  
    // Preparar datos de Dirección de Facturación
    const billingData = [
      ["Calle", "Ciudad", "Código Postal", "País", "Teléfono"],
      [
        Array.isArray(billingSource.billing_address?.street)
          ? billingSource.billing_address.street.join(" ")
          : billingSource.billing_address?.street || "N/A",
        billingSource.billing_address?.city || "N/A",
        billingSource.billing_address?.postcode || "N/A",
        billingSource.billing_address?.country_id || "N/A",
        billingSource.billing_address?.telephone || "N/A"
      ]
    ];
  
    // Preparar datos de Productos
    const productHeader = ["SKU", "Nombre", "Cantidad", "Precio"];
    const productData = uniqueItems.map((item: any) => [
      item.sku || "N/A",
      item.name || "N/A",
      item.qty_ordered || 0,
      item.price !== undefined ? Number(item.price).toFixed(2) : "0.00"
    ]);
  
    // Armar la hoja de Excel combinando ambas secciones
    const ws_data = [];
    ws_data.push(["Dirección de Facturación"]);
    ws_data.push([]); // línea vacía para separación
    ws_data.push(...billingData);
    ws_data.push([]); // separar secciones
    ws_data.push(["Productos"]);
    ws_data.push(productHeader);
    ws_data.push(...productData);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
    ws["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Pedido_${orderId}.xlsx`);
  };
  // Función para reiniciar filtros
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("Todos");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Pedidos</h2>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Número de pedido
                </th>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Punto de compra
                </th>
                <th
                  style={colStyleFecha}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fecha compra
                </th>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cliente
                </th>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Valor total
                </th>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Acciones
                </th>
                <th
                  style={colStyle}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
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
                  <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                    {order.store_name}
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
                    {translateOrderStatus(order.status)}
                  </td>
                  <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                  {"$ " + Number(order.grand_total).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        navigate("/dashboard/ventas/PedidoDetalle", {
                          state: { orderId: order.entity_id },
                        })
                      }
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                  <td style={colStyle} className="px-6 py-4 whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center gap-1 text-green-600 hover:text-green-800`}
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

          {/* Paginación */}
          <div className="mt-4 flex justify-center items-center gap-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="border border-gray-300 px-4 py-2 rounded disabled:opacity-50 hover:bg-gray-100"
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="border border-gray-300 px-4 py-2 rounded disabled:opacity-50 hover:bg-gray-100"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pedidos;