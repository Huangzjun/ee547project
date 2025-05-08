import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ms4dunz31k.execute-api.us-west-2.amazonaws.com';

// 创建 axios 实例
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 添加跨域请求配置
  withCredentials: false,
});

// 添加请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Request URL:', config.url);
    console.log('Request Headers:', config.headers);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response Headers:', response.headers);
    return response;
  },
  (error) => {
    console.error('Response Error:', error);
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Headers:', error.response.headers);
    }
    return Promise.reject(error);
  }
);

interface ParsedFood {
  food: string;
  fdcId: number;
  quantity: number;
  unit: string | null;
}

interface NutritionSummary {
  macros: {
    calories: number;
    fat_g: number;
    carbohydrates_g: number;
    protein_g: number;
  };
  vitamins: {
    calcium_mg: number;
    iron_mg: number;
    potassium_mg: number;
  };
}

interface SubmitMealResponse {
  message: string;
  userId: string;
  parsedFoods: ParsedFood[];
}

interface NutritionResponse {
  message: string;
  userId: string;
  foodDetails: Array<ParsedFood & {
    labelNutrients: {
      calories: number;
      fat: number;
      carbohydrates: number;
      protein: number;
    };
  }>;
  summary: NutritionSummary;
}

interface AnalyzeResponse {
  message: string;
  records: Array<{
    userId: string;
    timestamp: string;
    foods: ParsedFood[];
    summary: NutritionSummary;
    profile?: Profile;
  }>;
}

interface Profile {
  name: string;
  age: string;
  weight: string;
  height: string;
  gender: string;
  proteinGoal: string;
  carbsGoal: string;
  fatGoal: string;
}

interface UpdateProfileResponse {
  message: string;
  userId: string;
  profile: Profile;
}

interface GetProfileResponse {
  message: string;
  userId: string;
  profile: Profile;
}

export const api = {
  // 提交膳食描述
  submitMeal: async (userId: string, mealDescription: string): Promise<SubmitMealResponse> => {
    const response = await axiosInstance.post(`/stage1/submitMeal`, {
      userId,
      mealDescription,
    });
    return response.data;
  },

  // 获取营养分析
  getNutrition: async (userId: string, parsedFoods: ParsedFood[]): Promise<NutritionResponse> => {
    const response = await axiosInstance.post(`/stage1/nutrition`, {
      userId,
      parsedFoods,
    });
    return response.data;
  },

  // 获取历史分析记录
  getAnalyze: async (userId: string): Promise<AnalyzeResponse> => {
    const response = await axiosInstance.get(`/stage1/analyze`, {
      params: { userId },
    });
    return response.data;
  },

  // 更新个人资料
  updateProfile: async (userId: string, profile: Profile): Promise<UpdateProfileResponse> => {
    const response = await axiosInstance.put(`/stage1/profile`, {
      userId,
      profile,
    });
    return response.data;
  },

  // 获取用户资料
  getProfile: async (userId: string): Promise<GetProfileResponse> => {
    const response = await axiosInstance.get(`/stage1/profile`, {
      params: { userId },
    });
    return response.data;
  },
}; 
