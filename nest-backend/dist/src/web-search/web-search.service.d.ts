import { ConfigService } from '@nestjs/config';
export declare class WebSearchService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    search(query: string): Promise<string>;
    private searchBaidu;
    private searchSerpAPI;
    private searchTavily;
    private formatResults;
}
