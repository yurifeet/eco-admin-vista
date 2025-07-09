import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import { usePedidosVentasApi } from "@/hooks/usePedidosVentasApi";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Enviados = () => {
  const { getOrdersShipTotals } = usePedidosVentasApi();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10); // siempre 10 registros
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchShipments = async () => {
    setIsLoading(true);
    // Se consulta al backend, pasando searchQuery para filtrar por increment_id
    const data = await getOrdersShipTotals(currentPage, pageSize, searchQuery);
    if (data) {
      setShipments(data.items || []);
      setTotalCount(data.total_count || 0);
    }
    setIsLoading(false);
  };

  // Al cambiar el valor de búsqueda se reinicia la página a 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchShipments();
  }, [currentPage, pageSize, searchQuery]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const maxPageButtons = 10;
  let startPage = 1;
  let endPage = totalPages;

  if (totalPages > maxPageButtons) {
    startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    endPage = startPage + maxPageButtons - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = endPage - maxPageButtons + 1;
    }
  }

  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Enviados</h1>
      <p className="text-muted-foreground mb-4">
        Gestione los pedidos enviados
      </p>

      {/* Buscador por número de envío */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por número de envío"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
      </div>

      {isLoading ? (
        <p>Cargando envíos...</p>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de envío</TableHead>
                    <TableHead>Número de pedido</TableHead>
                    <TableHead>Enviar a nombre de</TableHead>
                    <TableHead>Fecha orden</TableHead>
                    <TableHead>Cantidad total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.length > 0 ? (
                    shipments.map((shipment) => (
                      <TableRow key={shipment.entity_id}>
                        <TableCell>{shipment.increment_id}</TableCell>
                        <TableCell>{shipment.increment_id_pedido}</TableCell>
                        <TableCell>
                          {shipment.customer_firstname}{" "}
                          {shipment.customer_lastname}
                        </TableCell>
                        <TableCell>{shipment.created_at}</TableCell>
                        <TableCell>{shipment.total_qty}</TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              navigate("/dashboard/ventas/PedidoEnvio", {
                                state: { orderId: shipment.order_id },
                              })
                            }
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver envío"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No se encontraron envíos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Paginación */}
            <Pagination>
              <PaginationContent>
                <PaginationPrevious
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Anterior
                </PaginationPrevious>
                {pageNumbers.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      active={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationNext
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Siguiente
                </PaginationNext>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Enviados;