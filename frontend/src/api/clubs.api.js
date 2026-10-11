import http from './client';

export const clubsApi = {
  async list() {
    const res = await http.get('/clubs');
    return res.data?.data?.clubs || [];
  },

  async detail(id) {
    const res = await http.get(`/clubs/${id}`);
    return res.data?.data?.club || null;
  },
};

export default clubsApi;
