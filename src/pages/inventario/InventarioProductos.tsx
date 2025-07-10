import React, { useEffect, useState } from 'react';
import { FileX, File as FileIcon, FileText } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import inventarioProductosApi, { UrlImagen } from '../../components/inventario/inventarioProductosApi';
import { useIngresoMercanciaApi } from '../../hooks/useIngresoMercanciaApi';
import { getBase64FromUrl } from '../../utils/getBase64FromUrl';

interface ProductData {
  sizes: { [key: string]: string };
  salable_quantity: string;
  image_url: string;
  price: string;
  special_price: string | null;
  brand: string;
}

interface ProductItem {
  sku: string;
  data: ProductData;
}

interface Source {
  source_code: string;
  name: string;
}

const typeOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Femenino', value: 'F' },
  { label: 'Masculino', value: 'M' },
  { label: 'Infantil', value: 'I' },
];

const brandOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Actvitta', value: '125' },
  { label: 'Beira Rio', value: '126' },
  { label: 'Modare', value: '127' },
  { label: 'Moleca', value: '128' },
  { label: 'Molekinha', value: '129' },
  { label: 'Molekinho', value: '130' },
  { label: 'Vizzano', value: '131' },
  { label: 'Br Sport', value: '132' },
  { label: 'Allegro', value: '133' },
];

const formatPrice = (price: string) => {
  const num = Number(price);
  return `$ ${num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const MyPdfDocument = ({ prodData, allowedSizes }: { prodData: ProductItem[]; allowedSizes: string[] }) => {
  const [imageBase64Map, setImageBase64Map] = useState<{ [sku: string]: string }>({});
  
  useEffect(() => {
    prodData.forEach(({ sku, data }) => {
      if (!data.image_url) {
        console.warn(`No se encontró image_url para SKU ${sku}`);
        return;
      }
      const imageUrl = data.image_url.startsWith('https://') || data.image_url.startsWith('http://')
        ? data.image_url
        : `${UrlImagen}${data.image_url}`;
      console.log(imageUrl);
      getBase64FromUrl(imageUrl)
        .then((base64) => {
          setImageBase64Map((prev) => ({ ...prev, [sku]: base64 }));
        })
        .catch((err) => console.error(`Error converting image for SKU ${sku}:`, err));
    });
  }, [prodData]);

  const styles = StyleSheet.create({
    page: { padding: 24, fontSize: 10 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    title: { fontSize: 18, textAlign: 'center' },
    logo: { width: 50, height: 50 },
    table: {
      display: 'flex',
      flexDirection: 'column',
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    tableRow: { flexDirection: 'row' },
    tableCol: {
      borderStyle: 'solid',
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    productImage: { width: 40, height: 40 },
  });

  return (
    <Document>
      <Page style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Inventário Feet Colombia</Text>
          <Image style={styles.logo} src="/favicon.jpg" />
        </View>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableCol, { width: '15%' }]}><Text>Imagen</Text></View>
            <View style={[styles.tableCol, { width: '35%' }]}><Text>SKU</Text></View>
            <View style={[styles.tableCol, { width: '15.5%' }]}><Text>Cantidad</Text></View>
            <View style={[styles.tableCol, { width: '17.5%' }]}><Text>Precio</Text></View>
            <View style={[styles.tableCol, { width: '17.5%' }]}><Text>Precio Especial</Text></View>
            <View style={[styles.tableCol, { width: '17.5%' }]}><Text>Tallas</Text></View>
          </View>
          {prodData.map(({ sku, data }) => {
            const cantidad = parseInt(data.salable_quantity, 10);
            const precio = formatPrice(data.price);
            const precioEspecial = data.special_price ? formatPrice(data.special_price) : '-';
            const tallas = Object.entries(data.sizes || {})
              .filter(([size]) => allowedSizes.includes(size))
              .map(([size, qty]) => `${size}: ${qty}`)
              .join(', ');
            return (
              <View style={styles.tableRow} key={sku}>
                <View style={[styles.tableCol, { width: '15%' }]}>
                  {imageBase64Map[sku] ? (
                    <Image style={styles.productImage} src={imageBase64Map[sku]} />
                  ) : (
                    <Text>No Image</Text>
                  )}
                </View>
                <View style={[styles.tableCol, { width: '35%' }]}><Text>{sku}</Text></View>
                <View style={[styles.tableCol, { width: '15.5%' }]}><Text>{cantidad}</Text></View>
                <View style={[styles.tableCol, { width: '17.5%' }]}><Text>{precio}</Text></View>
                <View style={[styles.tableCol, { width: '17.5%' }]}><Text>{precioEspecial}</Text></View>
                <View style={[styles.tableCol, { width: '17.5%' }]}><Text>{tallas}</Text></View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};

const InventarioProductos = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('default');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [sourceName, setSourceName] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const perPage = 20;
  const allowedSizes = [
    '18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33',
    '34','35','36','37','38','39','40','41','42','43','44'
  ];

  const { getSources } = useIngresoMercanciaApi();

  useEffect(() => {
    const loadSources = async () => {
      try {
        const sourcesList: Source[] = await getSources();
        setSources(sourcesList);
        const defaultSrc = sourcesList.find(src => src.source_code === 'default');
        if (defaultSrc) {
          setSelectedSource(defaultSrc.source_code);
          setSourceName(defaultSrc.name);
        }
      } catch (err) {
        console.error('Error al cargar las fuentes:', err);
      }
    };
    loadSources();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const typeParam = selectedType === 'all' ? '' : selectedType;
        const brandParam = selectedBrand === 'all' ? '' : selectedBrand;
        const result = await inventarioProductosApi.getCustomProducts(typeParam, brandParam, selectedSource);
        const resObj = result ? (Array.isArray(result) && result.length > 0 ? result[0] : result) : {};
        const productsArray: ProductItem[] = Object.keys(resObj).map(sku => ({
          sku,
          data: resObj[sku],
        }));
        setProducts(productsArray);
        setPage(1);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los productos');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedType, selectedBrand, selectedSource]);

  const filteredProducts = products.filter(product =>
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedProducts = filteredProducts.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredProducts.length / perPage);

  const exportToCSV = () => {
    if(filteredProducts.length === 0) return;
    const header = ['SKU', 'Cantidad', 'Precio', 'Precio Especial', 'Tallas'];
    const rows = filteredProducts.map(({ sku, data }) => {
      const cantidad = parseInt(data.salable_quantity, 10);
      const precio = formatPrice(data.price);
      const precioEspecial = data.special_price ? formatPrice(data.special_price) : '-';
      const tallas = Object.entries(data.sizes || {})
        .filter(([size]) => allowedSizes.includes(size))
        .map(([size, qty]) => `${size}: ${qty}`)
        .join(' - ');
      return [sku, cantidad, precio, precioEspecial, tallas];
    });
    const csvContent = [header, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "inventario_productos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (filteredProducts.length === 0) return;
    import("xlsx").then((XLSX) => {
      const dataToExport = filteredProducts.map(({ sku, data }) => {
        const cantidad = parseInt(data.salable_quantity, 10);
        const precio = formatPrice(data.price);
        const precioEspecial = data.special_price ? formatPrice(data.special_price) : '-';
        const tallas = Object.entries(data.sizes || {})
          .filter(([size]) => allowedSizes.includes(size))
          .map(([size, qty]) => `${size}: ${qty}`)
          .join(', ');
        return { SKU: sku, Cantidad: cantidad, Precio: precio, "Precio Especial": precioEspecial, Tallas: tallas };
      });
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const keys = Object.keys(dataToExport[0]);
      const cols = keys.map(key => {
        const maxLength = Math.max(...dataToExport.map(row => (row[key] ? row[key].toString().length : 0)));
        return { wch: maxLength + 2 };
      });
      worksheet['!cols'] = cols;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
      XLSX.writeFile(workbook, "inventario_productos.xlsx");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com título e exportação em card */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Inventario de Productos {`${sourceName}`}
          </h1>
          <p className="text-muted-foreground">
            Gestione el inventario de productos en el sistema
          </p>
        </div>
        {filteredProducts.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={exportToExcel} size="sm">
              <FileX className="mr-2" size={16} />
              Exportar a Excel
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <FileIcon className="mr-2" size={16} />
              Exportar a CSV
            </Button>
            <PDFDownloadLink
              document={<MyPdfDocument prodData={filteredProducts} allowedSizes={allowedSizes} />}
              fileName="inventario_productos.pdf"
            >
              <Button variant="outline" size="sm">
                <FileText className="mr-2" size={16} />
                Exportar a PDF
              </Button>
            </PDFDownloadLink>
          </div>
        )}
      </div>

      {/* Card de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por SKU</label>
              <Input
                type="text"
                placeholder="SKU..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select
                value={selectedSource}
                onValueChange={(value) => {
                  setSelectedSource(value);
                  const foundSource = sources.find(src => src.source_code === value);
                  setSourceName(foundSource ? foundSource.name : '');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map(src => (
                    <SelectItem key={src.source_code} value={src.source_code}>
                      {src.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                         <div className="space-y-2">
               <label className="text-sm font-medium">Tipo</label>
               <Select
                 value={selectedType}
                 onValueChange={setSelectedType}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {typeOptions.map(opt => (
                     <SelectItem key={opt.value} value={opt.value}>
                       {opt.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <label className="text-sm font-medium">Marca</label>
               <Select
                 value={selectedBrand}
                 onValueChange={setSelectedBrand}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {brandOptions.map(opt => (
                     <SelectItem key={opt.value} value={opt.value}>
                       {opt.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Card da tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Precio Especial</TableHead>
                <TableHead>Tallas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    No hay registros
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map(({ sku, data }) => {
                  const tallas = Object.entries(data.sizes || {})
                    .filter(([size]) => allowedSizes.includes(size))
                    .map(([size, qty]) => `${size}: ${qty}`)
                    .join(', ');
                  return (
                    <TableRow key={sku}>
                      <TableCell>
                        <img 
                          src={`${UrlImagen}${data.image_url}`} 
                          alt={sku} 
                          className="h-12 w-12 object-contain rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{sku}</TableCell>
                      <TableCell>{parseInt(data.salable_quantity, 10)}</TableCell>
                      <TableCell>{formatPrice(data.price)}</TableCell>
                      <TableCell>
                        {data.special_price ? formatPrice(data.special_price) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {tallas}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && !loading && (
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventarioProductos;