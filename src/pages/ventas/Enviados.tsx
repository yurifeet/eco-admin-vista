import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  const handleResetSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Enviados</h1>
          <p className="text-muted-foreground">
            Gestione los pedidos enviados
          </p>
        </div>
      </div>

      {/* Card de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por número de envío</label>
              <Input
                type="text"
                placeholder="Número de envío"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleResetSearch}
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
                      <TableCell className="font-medium">{shipment.increment_id}</TableCell>
                      <TableCell>{shipment.increment_id_pedido}</TableCell>
                      <TableCell>
                        {shipment.customer_firstname}{" "}
                        {shipment.customer_lastname}
                      </TableCell>
                      <TableCell>{shipment.created_at}</TableCell>
                      <TableCell>{shipment.total_qty}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate("/dashboard/ventas/PedidoEnvio", {
                              state: { orderId: shipment.order_id },
                            })
                          }
                          title="Ver envío"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      No se encontraron envíos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center pb-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {pageNumbers.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
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

export default Enviados;