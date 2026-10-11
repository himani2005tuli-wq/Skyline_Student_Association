import { http } from './client';

export const healthApi = {
  async check() {
    const res = await http.get('/health');
    return res.data?.data;
  },
};

export default healthApi;
