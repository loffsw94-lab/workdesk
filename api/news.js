/* ═══════════════════════════════════════════════════════
   네이버 뉴스 중계 함수 (수정 불필요)

   Vercel 프로젝트 → Settings → Environment Variables 에
     NAVER_ID     = 네이버 개발자센터 Client ID
     NAVER_SECRET = 네이버 개발자센터 Client Secret
   두 개만 넣고 재배포하면 사이트의 뉴스가 자동으로 켜집니다.

   왜 필요한가요?
   - 브라우저에서 네이버 API를 직접 부르면 CORS로 차단되고,
   - HTML에 Secret을 넣으면 누구나 키를 훔쳐볼 수 있기 때문입니다.
   이 함수가 서버에서 대신 호출하고 결과만 전달합니다.
   ═══════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  if (!process.env.NAVER_ID || !process.env.NAVER_SECRET) {
    return res.status(503).json({ error: 'NAVER_ID / NAVER_SECRET 환경변수를 설정하세요.' });
  }
  const q = encodeURIComponent((req.query.q || '경제').slice(0, 50));
  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${q}&display=10&sort=date`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_ID,
          'X-Naver-Client-Secret': process.env.NAVER_SECRET
        }
      }
    );
    const data = await r.json();
    /* 10분 캐시 — 하루 25,000회 무료 한도를 사실상 무제한으로 만듭니다 */
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'upstream_error' });
  }
}
