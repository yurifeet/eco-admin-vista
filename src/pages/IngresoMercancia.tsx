import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIngresoMercanciaApi } from "@/hooks/useIngresoMercanciaApi";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { useExportWorksheet } from "@/hooks/useExportWorksheet";

interface Source {
  source_code: string;
  name: string;
  enabled: boolean;
  description?: string;
  extension_attributes: {
    is_pickup_location_active: boolean;
    frontend_name: string;
  };
}

const estadoOptions = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Nuevo', value: 'n' },
  { label: 'Procesando', value: 'p' },
  { label: 'Completado', value: 'c' },
];

const IngresoMercancia = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { loading, getIngresoMercancia, getSources, exportIngresoExcel, deleteIngresoMercancia } = useIngresoMercanciaApi();
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [allIngresos, setAllIngresos] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  // New date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { exportWorksheet } = useExportWorksheet();

  // Fetch paginated records
  useEffect(() => {
    if (!searchTerm && filterEstado === "all" && !startDate && !endDate) {
      fetchIngresos();
    }
  }, [currentPage, searchTerm, filterEstado, startDate, endDate]);

  // Fetch all records for search/filtering purposes.
  useEffect(() => {
    fetchAllIngresos();
    fetchSources();
  }, []);

  const fetchIngresos = async () => {
    const response = await getIngresoMercancia(currentPage, pageSize);
    setIngresos(response.items);
    setTotalCount(response.total_count);
  };

  const fetchAllIngresos = async () => {
    // Fetch all records using a large pageSize
    const response = await getIngresoMercancia(1, 10000);
    setAllIngresos(response.items);
  };

  const fetchSources = async () => {
    const sourcesData = await getSources();
    setSources(sourcesData);
  };

  const getSourceName = (sourceCode: string) => {
    const source = sources.find((s) => s.source_code === sourceCode);
    return source ? source.name : sourceCode;
  };

  const handleNewClick = () => {
    navigate("/dashboard/ingreso-mercancia/nuevo");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationItems = () => {
    const items = [];
    for (let i = 1; i <= totalPages; i++) {
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

  // Determine which ingresos to show:
  // If any filters (search, estado or date range) are active use the full list
  const filteredIngresos =
    searchTerm || filterEstado !== "all" || startDate || endDate
      ? allIngresos.filter((ingreso) => {
          // Filter by search and estado
          const matchSearch =
            ingreso.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ingreso.nombre_responsable.toLowerCase().includes(searchTerm.toLowerCase());
          const matchEstado = filterEstado === "all" || ingreso.estado === filterEstado;
          let matchDate = true;
          // Date filtering: convert ingreso.fecha ("YYYY-MM-DD HH:mm:ss") to valid ISO format
          const ingresoDate = new Date(ingreso.fecha.replace(" ", "T"));
          const ingresoDateOnly = ingresoDate.toISOString().split("T")[0];
          
          // Validate that the start date is not greater than the end date
          if (startDate && endDate && startDate > endDate) {
            matchDate = false;
          }
          if (startDate) {
            matchDate = matchDate && ingresoDateOnly >= startDate;
          }
          if (endDate) {
            matchDate = matchDate && ingresoDateOnly <= endDate;
          }

          return matchSearch && matchEstado && matchDate;
        })
      : ingresos;

  const handleExport = async (ingresoId: number) => {
    try {
      const result = await exportIngresoExcel(ingresoId);
      if (result && result.length > 0) {
        const data = result[0];
        const worksheetData = {
          header: {
            "Source": data.header.source,
            "Fecha": data.header.fecha,
            "Consecutivo": data.header.consecutivo,
            "Responsable": data.header.nombre_responsable,
            "Descripción": data.header.descripcion || ""
          },
          table: data.table,
        };
        exportWorksheet(
          worksheetData,
          `IngresoMercancia_${data.header.consecutivo}.xlsx`,
          ["SKU", "Cantidad", "Bodega"]
        );
        toast.success("Exportación exitosa");
      } else {
        toast.error("No se encontraron datos para exportar");
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      toast.error("Error al exportar");
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterEstado("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ingreso de Mercancías</h1>
          <p className="text-muted-foreground">
            Gestione el ingreso de mercancías en el sistema
          </p>
        </div>
        <div>
          <Button
            className="bg-ecommerce-500 hover:bg-ecommerce-600"
            onClick={handleNewClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ingreso
          </Button>
        </div>
      </div>

      {/* Card de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                type="text"
                placeholder="Consecutivo o responsable"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={filterEstado}
                onValueChange={setFilterEstado}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estadoOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha desde</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha hasta</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="w-full"
              >
                Reiniciar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>                
                <TableHead>Responsable</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Es másiva</TableHead>               
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
                <TableHead>Exportar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngresos.length > 0 ? (
                filteredIngresos.map((ingreso) => (
                  <TableRow
                    key={ingreso.ingresomercancia_id}
                    className="hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{ingreso.consecutivo}</TableCell>
                    <TableCell>{format(new Date(ingreso.fecha), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{ingreso.nombre_responsable}</TableCell>
                    <TableCell>{getSourceName(ingreso.source)}</TableCell>                    
                    <TableCell>{ingreso.descripcion || "-"}</TableCell> 
                    <TableCell>{ingreso.es_masiva == 'n' || ingreso.es_masiva == null || ingreso.es_masiva == 'no' ? 'No' : 'Si'}</TableCell>                    
                    <TableCell>
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          ingreso.estado === "n"
                            ? "bg-blue-100 text-blue-800"
                            : ingreso.estado === "p"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {ingreso.estado === "n"
                          ? "Nuevo"
                          : ingreso.estado === "p"
                          ? "Procesando"
                          : "Completado"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Ver registro"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/ingreso-mercancia/${ingreso.ingresomercancia_id}`);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar ingreso"
                          disabled={!(ingreso.estado === "n" || ingreso.estado === "p")}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("¿Está seguro de eliminar este ingreso?")) {
                              deleteIngresoMercancia(ingreso.ingresomercancia_id)
                                .then((success) => {
                                  if (success) {
                                    toast.success("Ingreso eliminado exitosamente");
                                    fetchIngresos();
                                    fetchAllIngresos();
                                  } else {
                                    toast.error("Error al eliminar ingreso");
                                  }
                                })
                                .catch((error) => {
                                  console.error("Error al eliminar ingreso:", error);
                                  toast.error("Error al eliminar ingreso");
                                });
                            }
                          }}
                        >
                          <Trash2
                            className="h-4 w-4 text-red-500"
                            style={{
                              opacity: !(ingreso.estado === "p" || ingreso.estado === "n") ? 0.5 : 1
                            }}
                          />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!(ingreso.estado === "c" || ingreso.estado === "p")}
                        className={`flex items-center gap-1 text-green-600 hover:text-green-800 ${
                          !(ingreso.estado === "c" || ingreso.estado === "p")
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(ingreso.ingresomercancia_id);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9l-3 3m3-3l3 3M12 3v9" />
                        </svg>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    No se encontraron ingresos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!(searchTerm || filterEstado !== "all" || startDate || endDate) &&
            totalPages > 1 && (
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
    </div>
  );
};

export default IngresoMercancia;