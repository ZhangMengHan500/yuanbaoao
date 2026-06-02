import {create} from 'zustand';
import {StyleCategory, AiStyleTemplate} from '../types';
import {createAPI} from '../services/api';

interface CreateState {
  categories: StyleCategory[];
  activeCategoryId: string | null; // null = 全部
  templates: AiStyleTemplate[];
  isLoading: boolean;

  setActiveCategoryId: (id: string | null) => void;
  fetchCategories: () => Promise<void>;
  fetchTemplates: (categoryId?: string) => Promise<void>;
}

export const useCreateStore = create<CreateState>((set, get) => ({
  categories: [],
  activeCategoryId: null,
  templates: [],
  isLoading: false,

  setActiveCategoryId: (id: string | null) => {
    set({activeCategoryId: id});
    get().fetchTemplates(id ?? undefined);
  },

  fetchCategories: async () => {
    set({isLoading: true});
    try {
      const res: any = await createAPI.getStyleCategories();
      const categories: StyleCategory[] = res.data || res;
      set({categories, isLoading: false});
      // 默认加载全部模板
      const allTemplates = categories.flatMap(c => c.templates);
      set({templates: allTemplates});
    } catch (error) {
      console.error('获取风格分类失败:', error);
      set({isLoading: false});
    }
  },

  fetchTemplates: async (categoryId?: string) => {
    set({isLoading: true});
    try {
      const res: any = await createAPI.getStyleTemplates(categoryId);
      const templates: AiStyleTemplate[] = res.data || res;
      set({templates, isLoading: false});
    } catch (error) {
      console.error('获取风格模板失败:', error);
      set({isLoading: false});
    }
  },
}));
