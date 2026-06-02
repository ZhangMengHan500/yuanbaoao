"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WebSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WebSearchService = WebSearchService_1 = class WebSearchService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WebSearchService_1.name);
    }
    async search(query) {
        this.logger.log(`[WebSearch] 开始搜索: ${query.substring(0, 50)}...`);
        try {
            const tavilyKey = this.configService.get('TAVILY_API_KEY');
            const serpKey = this.configService.get('SERP_API_KEY');
            let results = [];
            if (tavilyKey) {
                results = await this.searchTavily(query, tavilyKey);
            }
            else if (serpKey) {
                results = await this.searchSerpAPI(query, serpKey);
            }
            else {
                results = await this.searchBaidu(query);
            }
            if (!results || results.length === 0) {
                this.logger.log('[WebSearch] 未找到相关结果');
                return '';
            }
            const context = this.formatResults(results);
            this.logger.log(`[WebSearch] 搜索完成，${results.length} 条结果`);
            return context;
        }
        catch (error) {
            this.logger.error(`[WebSearch] 搜索失败: ${error.message}`);
            return '';
        }
    }
    async searchBaidu(query) {
        const results = [];
        const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=5`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        const blockPattern = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|class="result-op|<div[^>]*id="bottom)/g;
        let match;
        while ((match = blockPattern.exec(html)) !== null && results.length < 5) {
            const titleHtml = match[1];
            const blockContent = match[2];
            const titleText = titleHtml.replace(/<[^>]*>/g, '').trim();
            if (!titleText || titleText.length < 4 || titleText.includes('百度'))
                continue;
            const linkMatch = titleHtml.match(/href="(https?:\/\/[^"]+)"/);
            const link = linkMatch ? linkMatch[1] : '';
            let snippet = '';
            const snippetPatterns = [
                /class="c-abstract[^"]*"[^>]*>([\s\S]*?)<\/span>/,
                /class="content-right[^"]*"[^>]*>([\s\S]*?)<\/span>/,
            ];
            for (const p of snippetPatterns) {
                const absMatch = blockContent.match(p);
                if (absMatch) {
                    snippet = absMatch[1].replace(/<[^>]*>/g, '').trim();
                    if (snippet.length > 10)
                        break;
                }
            }
            if (!snippet) {
                const plainText = blockContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                const sentences = plainText.split(/[。！？]/).filter(s => s.trim().length > 15);
                if (sentences.length > 0) {
                    snippet = sentences[0].trim().substring(0, 200);
                }
            }
            results.push({
                title: titleText,
                snippet: snippet || titleText,
                url: link,
            });
        }
        return results.slice(0, 5);
    }
    async searchSerpAPI(query, apiKey) {
        const res = await fetch(`https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5&hl=zh-cn`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        return (data.organic_results || []).slice(0, 5).map((r) => ({
            title: r.title,
            snippet: r.snippet || '',
            url: r.link || '',
        }));
    }
    async searchTavily(query, apiKey) {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                max_results: 5,
                search_depth: 'basic',
            }),
            signal: AbortSignal.timeout(8000),
        });
        const data = await res.json();
        return (data.results || []).slice(0, 5).map((r) => ({
            title: r.title,
            snippet: r.content || '',
            url: r.url || '',
        }));
    }
    formatResults(results) {
        return results
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}${r.url ? '\n来源: ' + r.url : ''}`)
            .join('\n\n');
    }
};
exports.WebSearchService = WebSearchService;
exports.WebSearchService = WebSearchService = WebSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WebSearchService);
//# sourceMappingURL=web-search.service.js.map