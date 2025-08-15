import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import Home from './Home.vue';

const futureIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

vi.mock('@/api', () => ({
  api: {
    get: (url: string) => {
      if (url === '/auctions') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/settings') {
        return Promise.resolve({ data: { maxActiveAuctions: 0, maxWonAuctions: 0, nextAuctionIso: futureIso, auctionCloseIso: null } });
      }
      return Promise.resolve({ data: null });
    }
  }
}));

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Home countdown', () => {
  it('renders countdown when next auction is scheduled', async () => {
    const wrapper = mount(Home, { global: { stubs: ['router-link'] } });
    await flush();
    await flush();
    const text = wrapper.find('.countdown').text();
    expect(text).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
