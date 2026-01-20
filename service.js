import axios from 'axios';
import iconv from 'iconv-lite';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

const PROXY = 'http://192.168.28.2:8180';
const httpsAgent = new HttpsProxyAgent(PROXY);
const httpAgent = new HttpProxyAgent(PROXY);

export const request = async (url) => {
  const resp = await axios.get(url, {
    timeout: 30000,
    httpsAgent,
    httpAgent,
    proxy: false,

    responseType: 'arraybuffer',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  const html = iconv.decode(Buffer.from(resp.data), 'windows-1251');

  return html;
};
