/* 동적 robots.txt — 도메인을 자동 감지해 사이트맵 위치를 알려줍니다 (수정 불필요)
   네이버 서치어드바이저 권장사항: robots.txt에 Sitemap 위치 명시 */
export default function handler(req, res) {
  const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400');
  res.status(200).send(
`User-agent: *
Allow: /
Disallow: /privacy.html

Sitemap: ${host}/api/sitemap
`);
}
