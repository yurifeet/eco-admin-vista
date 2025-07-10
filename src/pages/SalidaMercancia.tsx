import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useExportWorksheet } from "@/hooks/useExportWorksheet";
import { useSalidaMercanciaApi } from "@/hooks/useSalidaMercanciaApi";
import { toast } from "sonner";

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

const SalidaMercancia = () => {
  // All hooks are declared unconditionally
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { loading, getSalidaMercancia, getSources, exportSalidaExcel, deleteSalidaMercancia } = useSalidaMercanciaApi();
  const [salidas, setSalidas] = useState<any[]>([]);
  const [allSalidas, setAllSalidas] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const { exportWorksheet } = useExportWorksheet();

  // Effects are defined unconditionally
  useEffect(() => {
    fetchSalidas();
    fetchSources();
  }, [currentPage]);

  useEffect(() => {
    fetchAllSalidas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, startDate, endDate]);

  // Function definitions (unconditional)
  const fetchSalidas = async () => {
    const response = await getSalidaMercancia(currentPage, pageSize);
    setSalidas(response.items);
    setTotalCount(response.total_count);
  };

  const fetchAllSalidas = async () => {
    const response = await getSalidaMercancia(1, 10000);
    setAllSalidas(response.items);
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
    navigate("/dashboard/salida-mercancia/nuevo");
  };

  // Filtering logic updated for date range
  const filteredSalidas = allSalidas.filter((salida) => {
    const matchesSearch =
      salida.consecutivo?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      salida.nombre_responsable?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === "all" || salida.estado === filterEstado;

    let matchesDate = true;
    // Convert the salida's date to ISO format and extract only the date portion ("YYYY-MM-DD")
    const salidaDate = new Date(salida.fecha.replace(" ", "T"));
    const salidaDateOnly = salidaDate.toISOString().split("T")[0];

    if (startDate) {
      // Lexicographical comparison works correctly for dates formatted as "YYYY-MM-DD"
      matchesDate = matchesDate && salidaDateOnly >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && salidaDateOnly <= endDate;
    }
    return matchesSearch && matchesEstado && matchesDate;
  });

  const computedTotalPages =
    searchTerm !== "" || filterEstado !== "all" || startDate !== "" || endDate !== ""
      ? Math.ceil(filteredSalidas.length / pageSize)
      : Math.ceil(totalCount / pageSize);

  const dataToDisplay =
    searchTerm !== "" || filterEstado !== "all" || startDate !== "" || endDate !== ""
      ? filteredSalidas.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : salidas;

  const renderPaginationItems = (pages: number) => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < pages) {
      if (endPage < pages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key={pages}>
          <PaginationLink onClick={() => setCurrentPage(pages)}>
            {pages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const handleExport = async (salidaId: number) => {
    try {
      const result = await exportSalidaExcel(salidaId);
      if (result && result.length > 0) {
        const data = result[0];
        const worksheetData = {
          header: {
            "Source": data.header.source,
            "Fecha": data.header.fecha,
            "Consecutivo": data.header.consecutivo,
            "Responsable": data.header.nombre_responsable,
            "Descripción": data.header.descripcion || "",
          },
          table: data.table,
        };
        exportWorksheet(worksheetData, `SalidaMercancia_${salidaId}.xlsx`, ["SKU", "Cantidad", "Bodega"]);
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
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Salida de Mercancías</h1>
              <p className="text-muted-foreground">
                Gestione la salida de mercancías en el sistema
              </p>
            </div>
            <Button className="bg-ecommerce-500 hover:bg-ecommerce-600" onClick={handleNewClick}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Salida
            </Button>
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
                    <TableHead>Es másiva</TableHead> 
                    <TableHead>Descripción</TableHead>                   
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                    <TableHead>Exportar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataToDisplay.length > 0 ? (
                    dataToDisplay.map((salida) => (
                      <TableRow
                        key={salida.salidamercancia_id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">{salida.consecutivo}</TableCell>
                        <TableCell>{format(new Date(salida.fecha), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{salida.nombre_responsable}</TableCell>  
                        <TableCell>{getSourceName(salida.source)}</TableCell> 
                        <TableCell>{salida.es_masiva == 'n' || salida.es_masiva == null || salida.es_masiva == 'no' ? 'No' : 'Si'}</TableCell>  
                        <TableCell>{salida.descripcion || "-"}</TableCell>                                              
                        <TableCell>
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              salida.estado === "n"
                                ? "bg-blue-100 text-blue-800"
                                : salida.estado === "p"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {salida.estado === "n"
                              ? "Nuevo"
                              : salida.estado === "p"
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
                                navigate(`/dashboard/salida-mercancia/${salida.salidamercancia_id}`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Eliminar salida"
                              disabled={!(salida.estado === "p" || salida.estado === "n")}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm("¿Está seguro de eliminar este registro de salida?")
                                ) {
                                  deleteSalidaMercancia(salida.salidamercancia_id)
                                    .then((success) => {
                                      if (success) {
                                        toast.success("Salida eliminada exitosamente");
                                        fetchSalidas();
                                        fetchAllSalidas();
                                      } else {
                                        toast.error("Error al eliminar salida");
                                      }
                                    })
                                    .catch((error) => {
                                      console.error("Error al eliminar salida:", error);
                                      toast.error("Error al eliminar salida");
                                    });
                                }
                              }}
                            >
                              <Trash2
                                className="h-4 w-4 text-red-500"
                                style={{
                                  opacity: !(salida.estado === "p" || salida.estado === "n") ? 0.5 : 1
                                }}
                              />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!(salida.estado === "c" || salida.estado === "p")}
                            className={`flex items-center gap-1 text-green-600 hover:text-green-800 ${
                              !(salida.estado === "c" || salida.estado === "p")
                                ? "cursor-not-allowed opacity-50"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(salida.salidamercancia_id);
                            }}
                          >
                            {/* Ícone de exportar */}
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
                      <TableCell colSpan={9} className="text-center py-12">
                        No se encontraron salidas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {computedTotalPages > 1 && (
                <div className="mt-4 flex justify-center pb-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {renderPaginationItems(computedTotalPages)}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(computedTotalPages, prev + 1))}
                          className={currentPage === computedTotalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SalidaMercancia;

