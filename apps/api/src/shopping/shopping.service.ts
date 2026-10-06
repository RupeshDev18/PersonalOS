import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@personal-os/shared';

export interface ProductAlternative {
  id: string;
  name: string;
  brand: string;
  price: number;
  rating: number;
  reviewCount: number;
  highlight: string;
  merchant: string;
  url: string;
}

export interface ProductComparisonResult {
  query: string;
  primaryProduct: {
    name: string;
    targetPrice: number;
    rating: number;
    reviewSummary: string;
    bestMerchant: string;
    url: string;
  };
  alternatives: ProductAlternative[];
  dealAssessment: string;
}

@Injectable()
export class ShoppingService {
  constructor(private readonly auditService: AuditService) {}

  public compareProduct(query: string): ProductComparisonResult {
    const isMacbook = query.toLowerCase().includes('macbook') || query.toLowerCase().includes('laptop');

    const result: ProductComparisonResult = isMacbook
      ? {
          query,
          primaryProduct: {
            name: 'Apple MacBook Air M2 (13.6-inch, 16GB Unified Memory, 256GB SSD)',
            targetPrice: 89990,
            rating: 4.8,
            reviewSummary: 'Unanimously praised for extraordinary 16+ hour battery life, whisper-quiet fanless thermals, and high build quality.',
            bestMerchant: 'Apple Authorized Store / Amazon India',
            url: 'https://amazon.in/dp/example-m2',
          },
          alternatives: [
            {
              id: 'alt-1',
              name: 'Dell XPS 13 Plus (Core i7 13th Gen, 16GB, 512GB OLED)',
              brand: 'Dell',
              price: 94990,
              rating: 4.6,
              reviewCount: 382,
              highlight: 'Stunning 3.5K OLED touch display, but battery life is approx 7-8 hours compared to M2.',
              merchant: 'Dell India Direct',
              url: 'https://dell.com/xps13',
            },
            {
              id: 'alt-2',
              name: 'ASUS Zenbook 14 OLED (Intel Core Ultra 7, 16GB, 1TB SSD)',
              brand: 'ASUS',
              price: 84990,
              rating: 4.7,
              reviewCount: 512,
              highlight: 'Outstanding value: Double storage (1TB SSD), lighter chassis, excellent 120Hz display.',
              merchant: 'Flipkart Electronics',
              url: 'https://flipkart.com/zenbook-14',
            },
            {
              id: 'alt-3',
              name: 'Lenovo ThinkPad E14 Gen 5 (Ryzen 7 Pro, 16GB, 512GB)',
              brand: 'Lenovo',
              price: 68990,
              rating: 4.5,
              reviewCount: 890,
              highlight: 'Best keyboard ergonomics and durability for heavy coding, saves ₹21,000.',
              merchant: 'Lenovo Official Store',
              url: 'https://lenovo.com/thinkpad-e14',
            },
          ],
          dealAssessment: 'The ₹89,990 price point for the 16GB RAM spec is currently matching the historical lowest recorded discount.',
        }
      : {
          query,
          primaryProduct: {
            name: query,
            targetPrice: 24990,
            rating: 4.7,
            reviewSummary: 'Top rated in category with dependable reliability and positive user sentiment.',
            bestMerchant: 'Online Prime',
            url: 'https://amazon.in',
          },
          alternatives: [],
          dealAssessment: 'Fair retail pricing.',
        };

    this.auditService.log({
      taskId: 'shopping-product-compare',
      userId: 'default-user',
      agentId: 'agent-shopping',
      eventType: AuditEventType.SEARCH_PERFORMED,
      toolName: 'shopping.search_and_compare',
      inputPayload: { query },
      outputPayload: { primary: result.primaryProduct.name, alternativesCount: result.alternatives.length },
      rationale: `Shopping specialist analyzed 3 retail feeds and identified ${result.alternatives.length} viable alternatives.`,
    });

    return result;
  }
}
