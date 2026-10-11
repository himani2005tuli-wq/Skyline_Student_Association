import communicationApi from './communication.api';
import fundraisersApi from './fundraisers.api';

export const publicApi = {
  async announcements() {
    return communicationApi.getAnnouncements();
  },

  async fundraiser() {
    const list = await fundraisersApi.list().catch(() => []);
    if (list && list.length > 0) {
      const f = list[0];
      return {
        id: f.id,
        title: f.title,
        goal: (f.targetAmountInPaise || f.goalAmountInPaise || 0) / 100,
        raised: (f.currentAmountInPaise || 0) / 100,
        donors: f.donorsCount || f._count?.donations || 0,
        daysLeft: f.endDate ? Math.max(0, Math.ceil((new Date(f.endDate) - Date.now()) / (1000 * 60 * 60 * 24))) : null,
        desc: f.description,
      };
    }
    return null;
  },
};

export default publicApi;
