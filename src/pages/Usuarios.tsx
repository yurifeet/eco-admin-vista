import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Download, Search, UserPlus, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usersApi, Usuario } from "@/api/usersApi";

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Carregar usuários da API
  const fetchUsuarios = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers({
        currentPage: page,
        pageSize: pageSize,
        searchCriteria: search || undefined
      });
      setUsuarios(response.items);
      setTotalCount(response.total_count);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Carregar usuários inicialmente
  useEffect(() => {
    fetchUsuarios();
  }, [currentPage]);

  // Busca com debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchUsuarios(1, searchTerm);
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm]);

  // Filtrar usuários localmente por status (já que a busca é feita na API)
  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesStatus = selectedStatus === "" || 
                         (selectedStatus === "activo" && usuario.is_active === "1") ||
                         (selectedStatus === "inactivo" && usuario.is_active === "0");
    
    return matchesStatus;
  });

  // Calcular informações de paginação
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getStatusBadge = (isActive: string) => {
    return isActive === "1" 
      ? <Badge variant="default" className="bg-green-500">Ativo</Badge>
      : <Badge variant="secondary">Inativo</Badge>;
  };

  const exportToCSV = () => {
    const csvData = filteredUsuarios.map(usuario => ({
      ID: usuario.user_id,
      Username: usuario.username,
      Nome: `${usuario.firstname} ${usuario.lastname}`,
      Email: usuario.email,
      Estado: usuario.is_active === "1" ? "Ativo" : "Inativo",
      "Data de Criação": usuario.created,
      "Última Modificação": usuario.modified,
      "Numero de Logins": usuario.lognum
    }));

    const csvContent = "data:text/csv;charset=utf-8," +
      Object.keys(csvData[0]).join(",") + "\n" +
      csvData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "usuarios_cadastrados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Usuários exportados para CSV com sucesso!");
  };

  const handleViewUser = (id: number) => {
    toast.info(`Visualizando usuário ID: ${id}`);
  };

  const handleEditUser = (id: number) => {
    toast.info(`Editando usuário ID: ${id}`);
  };

  const handleDeleteUser = (id: number) => {
    toast.info(`Excluindo usuário ID: ${id}`);
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Usuarios Registrados
          </h1>
          <p className="text-gray-600 mt-1">
            Administre los usuarios del sistema y sus permisos
          </p>
        </div>
        <div className="flex gap-3">
                      <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download size={16} />
            Exportar CSV
          </Button>
          <Button className="flex items-center gap-2">
            <UserPlus size={16} />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {usuarios.filter(u => u.is_active === '1').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <div className="h-2 w-2 bg-gray-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {usuarios.filter(u => u.is_active === '0').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logins</CardTitle>
            <div className="h-2 w-2 bg-blue-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {usuarios.reduce((total, u) => total + parseInt(u.lognum || '0'), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Use os filtros abaixo para encontrar usuários específicos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, username ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Todos os Estados</option>
              <option value="activo">Ativo</option>
              <option value="inactivo">Inativo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>
                Mostrando {startItem} a {endItem} de {totalCount} usuário(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Última Modificação</TableHead>
                  <TableHead>Logins</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.user_id}>
                      <TableCell className="font-medium">{usuario.user_id}</TableCell>
                      <TableCell>{usuario.username}</TableCell>
                      <TableCell>{`${usuario.firstname} ${usuario.lastname}`}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>{getStatusBadge(usuario.is_active)}</TableCell>
                      <TableCell>{new Date(usuario.created).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{new Date(usuario.modified).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{usuario.lognum}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(parseInt(usuario.user_id))}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(parseInt(usuario.user_id))}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(parseInt(usuario.user_id))}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação no rodapé */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Mostrando {startItem} a {endItem} de {totalCount} resultados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage > totalPages - 3) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios; 