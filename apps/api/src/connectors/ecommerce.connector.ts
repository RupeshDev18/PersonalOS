import { Injectable } from '@nestjs/common';
import { ConnectorInfo } from '@personal-os/shared';

export interface ProductItem {
  id: string;
  title: string;
  brand: string;
  platform: 'Amazon India' | 'Flipkart';
  currentPrice: number;
  originalPrice: number;
  currency: 'INR';
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  url: string;
  inStock: boolean;
  deliveryTime?: string;
  highlights?: string[];
}

export interface PriceComparisonResult {
  productQuery: string;
  cheapestOption: ProductItem | null;
  bestRatedOption: ProductItem | null;
  amazonResults: ProductItem[];
  flipkartResults: ProductItem[];
  savingsAmount: number | null;
  summary: string;
}

@Injectable()
export class ECommerceConnector {
  private unavailable(id: string, platform: string): ConnectorInfo {
    return {
      id: `connector-${id}`,
      name: `${platform} Product Search`,
      type: 'ecommerce',
      status: 'disconnected',
      isLive: false,
      description: 'Price, inventory, delivery, and rating data are unavailable until a verified source is configured.',
      details: { accessMode: 'disabled', reason: 'Search snippets and model estimates are not reliable price sources.' },
    };
  }

  public getAmazonInfo(): ConnectorInfo {
    return this.unavailable('amazon', 'Amazon India');
  }

  public getFlipkartInfo(): ConnectorInfo {
    return this.unavailable('flipkart', 'Flipkart');
  }

  public async searchAmazon(_query: string, _maxResults = 5): Promise<ProductItem[]> {
    return [];
  }

  public async searchFlipkart(_query: string, _maxResults = 5): Promise<ProductItem[]> {
    return [];
  }

  public async comparePrices(query: string): Promise<PriceComparisonResult> {
    return {
      productQuery: query,
      cheapestOption: null,
      bestRatedOption: null,
      amazonResults: [],
      flipkartResults: [],
      savingsAmount: null,
      summary: 'No verified price source is configured, so prices, ratings, stock, and delivery could not be compared.',
    };
  }
}
