// Sistema de almacenamiento temporal del inventario
// En producción, esto debería ser una base de datos

interface InventoryItem {
  sku: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  cost?: number;
  stock?: number;
  competitorPrice?: number;
  margin?: number;
  vehicleType?: string;
}

class InventoryStore {
  private static instance: InventoryStore;
  private inventory: InventoryItem[] = [];

  private constructor() {}

  static getInstance(): InventoryStore {
    if (!InventoryStore.instance) {
      InventoryStore.instance = new InventoryStore();
    }
    return InventoryStore.instance;
  }

  // Cargar inventario desde bulk upload
  loadInventory(data: any[]): void {
    this.inventory = data.map(item => ({
      sku: item.sku || '',
      brand: item.brand || '',
      model: item.model || '',
      size: item.size || '',
      price: parseFloat(item.price) || 0,
      cost: parseFloat(item.cost) || undefined,
      stock: parseInt(item.stock) || undefined,
      competitorPrice: parseFloat(item.competitorPrice) || undefined,
      margin: parseFloat(item.margin) || undefined,
      vehicleType: item.vehicleType || undefined,
    }));

    console.log(`📦 Inventario cargado: ${this.inventory.length} productos`);
  }

  // Buscar productos en el inventario local
  searchProducts(query: string): InventoryItem[] {
    if (!query || this.inventory.length === 0) {
      return [];
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    return this.inventory.filter(item => {
      const searchableText = [
        item.brand,
        item.model,
        item.size,
        item.sku
      ].join(' ').toLowerCase();

      // Buscar que todos los términos estén presentes
      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  // Buscar producto específico por marca, modelo y medida
  findExactMatch(brand: string, model: string, size: string): InventoryItem | null {
    const normalizedBrand = brand.toLowerCase().trim();
    const normalizedModel = model.toLowerCase().trim();
    const normalizedSize = size.toLowerCase().trim();

    return this.inventory.find(item => {
      const itemBrand = item.brand.toLowerCase().trim();
      const itemModel = item.model.toLowerCase().trim();
      const itemSize = item.size.toLowerCase().trim();

      return itemBrand.includes(normalizedBrand) &&
             itemModel.includes(normalizedModel) &&
             itemSize.includes(normalizedSize);
    }) || null;
  }

  // Obtener estadísticas del inventario
  getStats() {
    return {
      total: this.inventory.length,
      brands: [...new Set(this.inventory.map(item => item.brand))].length,
      avgPrice: this.inventory.reduce((sum, item) => sum + item.price, 0) / this.inventory.length || 0
    };
  }

  // Limpiar inventario
  clear(): void {
    this.inventory = [];
    console.log('🗑️ Inventario limpiado');
  }
}

export default InventoryStore;
export type { InventoryItem };