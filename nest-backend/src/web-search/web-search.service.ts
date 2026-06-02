import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 联网搜索服务 - 封装网页搜索能力
 *
 * 默认使用百度搜索（国内可用，无需 API Key）
 * 也可切换为 Tavily / SerpAPI（需在 .env 配置 API Key）
 */
@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 联网搜索 - 根据用户问题搜索相关内容
   * @param query 用户搜索关键词
   * @returns 搜索结果摘要文本，用于注入 LLM 上下文
   */
  async search(query: string): Promise<string> {
    this.logger.log(`[WebSearch] 开始搜索: ${query.substring(0, 50)}...`);

    try {
      // 优先使用配置的 API，否则用百度搜索
      const tavilyKey = this.configService.get<string>('TAVILY_API_KEY');
      const serpKey = this.configService.get<string>('SERP_API_KEY');

      let results: SearchResult[] = [];

      if (tavilyKey) {
        results = await this.searchTavily(query, tavilyKey);
      } else if (serpKey) {
        results = await this.searchSerpAPI(query, serpKey);
      } else {
        results = await this.searchBaidu(query);
      }

      if (!results || results.length === 0) {
        this.logger.log('[WebSearch] 未找到相关结果');
        return '';
      }

      const context = this.formatResults(results);
      this.logger.log(`[WebSearch] 搜索完成，${results.length} 条结果`);
      return context;
    } catch (error) {
      this.logger.error(`[WebSearch] 搜索失败: ${error.message}`);
      return '';
    }
  }

  /**
   * 百度搜索 - 国内可用，无需 API Key
   * 通过百度桌面版搜索页面解析结果
   */
  private async searchBaidu(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

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

    // 按 h3 标题分块提取搜索结果
    const blockPattern = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|class="result-op|<div[^>]*id="bottom)/g;
    let match;

    while ((match = blockPattern.exec(html)) !== null && results.length < 5) {
      const titleHtml = match[1];
      const blockContent = match[2];

      // 提取标题文本
      const titleText = titleHtml.replace(/<[^>]*>/g, '').trim();
      if (!titleText || titleText.length < 4 || titleText.includes('百度')) continue;

      // 提取链接
      const linkMatch = titleHtml.match(/href="(https?:\/\/[^"]+)"/);
      const link = linkMatch ? linkMatch[1] : '';

      // 提取摘要 - 尝试多种模式
      let snippet = '';
      const snippetPatterns = [
        /class="c-abstract[^"]*"[^>]*>([\s\S]*?)<\/span>/,
        /class="content-right[^"]*"[^>]*>([\s\S]*?)<\/span>/,
      ];
      for (const p of snippetPatterns) {
        const absMatch = blockContent.match(p);
        if (absMatch) {
          snippet = absMatch[1].replace(/<[^>]*>/g, '').trim();
          if (snippet.length > 10) break;
        }
      }

      // 兜底：从块内容中提取纯文本
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

  /**
   * SerpAPI 搜索（需 API Key）
   * 注册: https://serpapi.com/
   */
  private async searchSerpAPI(query: string, apiKey: string): Promise<SearchResult[]> {
    const res = await fetch(
      `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5&hl=zh-cn`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();

    return (data.organic_results || []).slice(0, 5).map((r: any) => ({
      title: r.title,
      snippet: r.snippet || '',
      url: r.link || '',
    }));
  }

  /**
   * Tavily 搜索（需 API Key）
   * 注册: https://tavily.com/
   */
  private async searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
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

    return (data.results || []).slice(0, 5).map((r: any) => ({
      title: r.title,
      snippet: r.content || '',
      url: r.url || '',
    }));
  }

  /**
   * 格式化搜索结果为 LLM 上下文文本
   */
  private formatResults(results: SearchResult[]): string {
    return results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}${r.url ? '\n来源: ' + r.url : ''}`)
      .join('\n\n');
  }
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}
