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
        goal: (f.targetAmountInPaise || f.goalAmountInPaise || 500000) / 100,
        raised: (f.currentAmountInPaise || 120000) / 100,
        donors: 84,
        daysLeft: 12,
        desc: f.description,
      };
    }
    return {
      title: 'Winter Charity Bake Sale',
      goal: 5000,
      raised: 4200,
      donors: 42,
      daysLeft: 7,
      desc: 'Annual fundraiser for community student tech scholarships.',
    };
  },
};

export default publicApi;
