/* ═══════════════════════════════════════════════════
   워크데스크 공용 앱 스크립트
   - 이 파일은 수정할 필요가 없습니다.
   - 모든 설정은 config.js 한 파일에서만 합니다.
   ═══════════════════════════════════════════════════ */
var CFG = window.WORKDESK_CONFIG || {};

/* ─────────── 공통 유틸 ─────────── */
function won(n){ return Math.round(n).toLocaleString('ko-KR') + '원'; }
function num(s){ return parseFloat(String(s).replace(/[^0-9.]/g,'')) || 0; }
function fmtNum(el){
  var raw = el.value.replace(/[^0-9.]/g,'');
  if(!raw){ el.value=''; return; }
  var parts = raw.split('.');
  el.value = Number(parts[0]||0).toLocaleString('ko-KR') + (parts[1]!==undefined ? '.'+parts[1] : '');
}
function segPick(btn){
  var sib = btn.parentElement.querySelectorAll('button');
  for(var i=0;i<sib.length;i++) sib[i].classList.remove('on');
  btn.classList.add('on');
}
function segVal(id){ var b=document.querySelector('#'+id+' button.on'); return b?b.dataset.v:''; }
function esc(s){ var d=document.createElement('div'); d.innerHTML=String(s||''); return (d.textContent||'').trim(); }
function receipt(elId, title, subtitle, lines, totalLabel, totalValue){
  var el = document.getElementById(elId);
  if(!el) return;
  el.classList.remove('empty');
  el.innerHTML = '<h4>WORKDESK</h4><div class="r-title">'+title+'</div><div class="r-sub">'+subtitle+'</div>'
    + lines.map(function(l){return '<div class="r-line"><span>'+l[0]+'</span><span>'+l[1]+'</span></div>';}).join('')
    + '<div class="r-total"><span>'+totalLabel+'</span><strong>'+totalValue+'</strong></div>'
    + '<div class="r-barcode"></div>'
    + '<div class="r-foot">'+new Date().toLocaleString('ko-KR')+' · 참고용</div>'
    + (window.__share ? '<button class="r-share" onclick="shareResult(this)">🔗 이 결과 링크 복사</button>' : '');
}
/* ── 결과 공유: 링크에 값이 담겨 다시 열면 같은 계산이 재현됩니다 ── */
function setShare(p){ window.__share = p; }
function shareResult(btn){
  var p = window.__share || {};
  var q = Object.keys(p).map(function(k){return k+'='+encodeURIComponent(p[k]);}).join('&');
  var url = location.origin + location.pathname + (q ? '?'+q : '');
  var ok = function(){ btn.textContent='✓ 복사됨 — 붙여넣어 공유하세요'; setTimeout(function(){btn.textContent='🔗 이 결과 링크 복사';},2200); };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(ok).catch(function(){prompt('아래 링크를 복사하세요', url);}); }
  else prompt('아래 링크를 복사하세요', url);
}
/* ── 계산 결과 아래 상담 CTA (외주 폼으로 연결) ── */
function leadCTA(elId, text, btnText){
  var el = document.getElementById(elId);
  if(!el) return;
  var wrap = el.parentElement;
  var old = wrap.querySelector('.lead-cta');
  if(old) old.remove();
  var root = /\/(s|w|v|a|l|f)\//.test(location.pathname) ? '../' : '';
  wrap.insertAdjacentHTML('beforeend',
    '<a class="lead-cta" href="'+root+'index.html#hire"><span>'+text+'</span><b>'+btnText+'</b></a>');
}

/* ─────────── 계산기 템플릿 (허브·랜딩 공용) ─────────── */
var CALC_TPL = {
vat: '<div class="calc-box">\
<div class="tool-form"><h3>부가세(VAT 10%) 계산기</h3>\
<p class="desc">공급가액 기준 또는 합계금액 기준으로 부가세를 계산합니다.</p>\
<div class="field"><label>계산 방식</label><div class="seg" id="vatMode">\
<button class="on" data-v="supply" onclick="segPick(this)">공급가액 → 합계</button>\
<button data-v="total" onclick="segPick(this)">합계금액 → 공급가액</button></div></div>\
<div class="field"><label for="vatAmt">금액 (원)</label>\
<input id="vatAmt" inputmode="numeric" placeholder="예: 1,000,000" oninput="fmtNum(this)"></div>\
<button class="calc-btn" onclick="calcVat()">계산하기</button>\
<p class="tool-note">일반과세 기준 부가세율 10%로 계산합니다. 간이과세·면세 품목은 별도 확인이 필요합니다.</p></div>\
<div class="receipt-wrap"><div class="receipt empty" id="vatOut">금액을 입력하고 [계산하기]를<br>누르면 영수증이 발행됩니다 🧾</div></div></div>',

salary: '<div class="calc-box">\
<div class="tool-form"><h3>연봉 실수령액 계산기</h3>\
<p class="desc">4대 보험과 소득세를 반영한 월 실수령액 추정치를 계산합니다.</p>\
<div class="field"><label for="salAmt">연봉 (원)</label>\
<input id="salAmt" inputmode="numeric" placeholder="예: 42,000,000" oninput="fmtNum(this)"></div>\
<div class="field-row"><div class="field"><label for="salDep">본인 포함 부양가족 수</label>\
<select id="salDep"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>\
<div class="field"><label for="salTaxFree">월 비과세액 (식대 등)</label>\
<input id="salTaxFree" inputmode="numeric" value="200,000" oninput="fmtNum(this)"></div></div>\
<button class="calc-btn" onclick="calcSalary()">계산하기</button>\
<p class="tool-note">2026년 확정 요율 기준 간이 추정치입니다. 국민연금 4.75%(상한 659만 원)·건강보험 3.595%·장기요양(건보료의 13.14%)·고용보험 0.9%와 근로소득세를 단순화해 계산하며, 실제 급여명세와 다를 수 있습니다.</p></div>\
<div class="receipt-wrap"><div class="receipt empty" id="salOut">연봉을 입력하면<br>월 실수령액 영수증이 나옵니다 💼</div></div></div>',

convert: '<div class="calc-box">\
<div class="tool-form"><h3>환율 · 평수 변환기</h3>\
<p class="desc">해외 결제 금액이나 사무실 면적을 빠르게 환산하세요.</p>\
<div class="field"><label>변환 종류</label><div class="seg" id="cvMode">\
<button class="on" data-v="fx" onclick="segPick(this);toggleCv()">환율</button>\
<button data-v="area" onclick="segPick(this);toggleCv()">평 ↔ ㎡</button></div></div>\
<div id="cvFx"><div class="field-row"><div class="field"><label for="fxCur">통화</label>\
<select id="fxCur"><option value="USD">미국 달러 (USD)</option><option value="JPY">일본 엔 100 (JPY)</option>\
<option value="EUR">유로 (EUR)</option><option value="CNY">중국 위안 (CNY)</option></select></div>\
<div class="field"><label for="fxRate">적용 환율 (₩) — 수정 가능</label>\
<input id="fxRate" inputmode="decimal" value="1,350" oninput="fmtNum(this)"></div></div>\
<div class="field"><label for="fxAmt">외화 금액</label>\
<input id="fxAmt" inputmode="decimal" placeholder="예: 500" oninput="fmtNum(this)"></div></div>\
<div id="cvArea" class="hidden"><div class="field-row"><div class="field"><label>방향</label>\
<div class="seg" id="areaDir"><button class="on" data-v="p2m" onclick="segPick(this)">평 → ㎡</button>\
<button data-v="m2p" onclick="segPick(this)">㎡ → 평</button></div></div>\
<div class="field"><label for="areaAmt">면적</label><input id="areaAmt" inputmode="decimal" placeholder="예: 24"></div></div></div>\
<button class="calc-btn" onclick="calcConvert()">변환하기</button>\
<p class="tool-note" id="fxNote">환율은 참고용입니다. 필요하면 오늘의 매매기준율을 직접 입력하세요. 1평 = 3.3058㎡ 기준.</p></div>\
<div class="receipt-wrap"><div class="receipt empty" id="cvOut">값을 입력하면<br>변환 영수증이 나옵니다 🌏</div></div></div>',

loan: '<div class="calc-box">\
<div class="tool-form"><h3>대출 이자 계산기</h3>\
<p class="desc">상환 방식별 월 납입금과 총 이자를 비교해 보세요.</p>\
<div class="field"><label>상환 방식</label><div class="seg" id="loanMode">\
<button class="on" data-v="equal" onclick="segPick(this)">원리금균등</button>\
<button data-v="principal" onclick="segPick(this)">원금균등</button>\
<button data-v="bullet" onclick="segPick(this)">만기일시</button></div></div>\
<div class="field"><label for="loanAmt">대출 금액 (원)</label>\
<input id="loanAmt" inputmode="numeric" placeholder="예: 100,000,000" oninput="fmtNum(this)"></div>\
<div class="field-row"><div class="field"><label for="loanRate">연 이자율 (%)</label>\
<input id="loanRate" inputmode="decimal" placeholder="예: 4.5"></div>\
<div class="field"><label for="loanYears">기간 (년)</label>\
<input id="loanYears" inputmode="numeric" placeholder="예: 20"></div></div>\
<button class="calc-btn" onclick="calcLoan()">계산하기</button>\
<p class="tool-note">중도상환수수료·거치기간은 반영되지 않은 단순 계산입니다.</p></div>\
<div class="receipt-wrap"><div class="receipt empty" id="loanOut">대출 조건을 입력하면<br>상환 영수증이 나옵니다 🏦</div></div></div>',

invoice: '<div class="calc-box">\
<div class="tool-form"><h3>세금계산서 도우미</h3>\
<p class="desc">합계금액만 알아도 공급가액·세액을 자동 분리하고, 발행용 요약을 만들어 드립니다.</p>\
<div class="field"><label for="ivItem">품목명</label><input id="ivItem" placeholder="예: 홈페이지 제작 용역"></div>\
<div class="field-row"><div class="field"><label>입력 기준</label><div class="seg" id="ivMode">\
<button class="on" data-v="total" onclick="segPick(this)">합계금액</button>\
<button data-v="supply" onclick="segPick(this)">공급가액</button></div></div>\
<div class="field"><label for="ivAmt">금액 (원)</label>\
<input id="ivAmt" inputmode="numeric" placeholder="예: 3,300,000" oninput="fmtNum(this)"></div></div>\
<div class="field"><label for="ivDate">작성일자</label><input id="ivDate" type="date"></div>\
<button class="calc-btn" onclick="calcInvoice()">발행 요약 만들기</button>\
<p class="tool-note">실제 발행은 홈택스에서 진행하세요. 이 요약을 그대로 옮겨 적으면 됩니다. 공급가액·세액이 1원 단위로 맞는지 자동 검증합니다.</p></div>\
<div class="receipt-wrap"><div class="receipt empty" id="ivOut">품목과 금액을 입력하면<br>세금계산서 요약이 나옵니다 📄</div></div></div>'
};

function mountCalcs(){
  var mounts = document.querySelectorAll('[data-calc]');
  for(var i=0;i<mounts.length;i++){
    var key = mounts[i].dataset.calc;
    if(CALC_TPL[key]) mounts[i].innerHTML = CALC_TPL[key];
  }
  var fxCur = document.getElementById('fxCur');
  if(fxCur) fxCur.addEventListener('change', function(e){
    var r = document.getElementById('fxRate');
    if(r) r.value = fxDefault[e.target.value];
  });
  var iv = document.getElementById('ivDate');
  if(iv) iv.value = new Date().toISOString().slice(0,10);

  /* 프리필: 롱테일 페이지의 data-prefill 또는 공유 링크의 ?v= 값으로 자동 계산 */
  var qp = new URLSearchParams(location.search);
  for(var m=0;m<mounts.length;m++){
    var el=mounts[m], key=el.dataset.calc;
    var v = qp.get('v') || el.dataset.prefill;
    if(!v) continue;
    try{
      if(key==='vat'){ document.getElementById('vatAmt').value=Number(v).toLocaleString('ko-KR'); calcVat(); }
      else if(key==='salary'){ document.getElementById('salAmt').value=Number(v).toLocaleString('ko-KR'); calcSalary(); }
      else if(key==='invoice'){ document.getElementById('ivAmt').value=Number(v).toLocaleString('ko-KR'); calcInvoice(); }
      else if(key==='loan'){
        document.getElementById('loanAmt').value=Number(v).toLocaleString('ko-KR');
        document.getElementById('loanRate').value=qp.get('r')||el.dataset.rate||'4.5';
        document.getElementById('loanYears').value=qp.get('y')||el.dataset.years||'20';
        calcLoan();
      }
      else if(key==='convert' && el.dataset.mode==='area'){
        var ab=document.querySelector('#cvMode button[data-v=area]');
        if(ab){ segPick(ab); toggleCv(); }
        if(el.dataset.dir==='m2p'){ var db=document.querySelector('#areaDir button[data-v=m2p]'); if(db) segPick(db); }
        document.getElementById('areaAmt').value=v; calcConvert();
      }
    }catch(e){}
  }
}

/* ─────────── 계산 로직 ─────────── */
function calcVat(){
  var amt = num(document.getElementById('vatAmt').value);
  if(!amt) return alert('금액을 입력해주세요.');
  var supply, vat, total;
  if(segVal('vatMode')==='supply'){ supply=amt; vat=Math.round(supply*0.1); total=supply+vat; }
  else { total=amt; supply=Math.round(total/1.1); vat=total-supply; }
  setShare({v:amt});
  receipt('vatOut','부가세 계산서','VAT RECEIPT · 10%',
    [['공급가액',won(supply)],['부가세 (10%)',won(vat)]],'합계금액',won(total));
  leadCTA('vatOut','부가세 신고·기장을 맡길 세무 파트너가 필요하신가요?','무료 견적 문의 →');
}

/* 2026년 확정 요율 — 매년 이 블록만 갱신하면 됩니다 */
var RATES = {
  YEAR: 2026,
  PENSION_W: 0.0475,      /* 국민연금 근로자 부담 (총 9.5%의 절반) */
  PENSION_CAP: 6590000,   /* 기준소득월액 상한 (2026.7~) */
  HEALTH_W: 0.03595,      /* 건강보험 근로자 부담 (총 7.19%의 절반) */
  CARE_OF_HEALTH: 0.1314, /* 장기요양 = 건강보험료의 13.14% */
  EMPLOY_W: 0.009         /* 고용보험 근로자 부담 */
};
function calcSalary(){
  var annual = num(document.getElementById('salAmt').value);
  if(!annual) return alert('연봉을 입력해주세요.');
  var dep = parseInt(document.getElementById('salDep').value,10);
  var taxFreeM = num(document.getElementById('salTaxFree').value);
  var grossM = annual/12;
  var taxableM = Math.max(grossM - taxFreeM, 0);
  var pension = Math.min(taxableM, RATES.PENSION_CAP)*RATES.PENSION_W;
  var health = taxableM*RATES.HEALTH_W;
  var care = health*RATES.CARE_OF_HEALTH;
  var employ = taxableM*RATES.EMPLOY_W;
  var gross = taxableM*12, ded;
  if(gross<=5e6) ded=gross*0.7;
  else if(gross<=15e6) ded=3.5e6+(gross-5e6)*0.4;
  else if(gross<=45e6) ded=7.5e6+(gross-15e6)*0.15;
  else if(gross<=1e8) ded=1.2e7+(gross-45e6)*0.05;
  else ded=Math.min(1.475e7+(gross-1e8)*0.02, 2e7);
  var base = Math.max(gross - ded - dep*1.5e6 - pension*12, 0);
  var br=[[14e6,.06,0],[5e7,.15,126e4],[8.8e7,.24,576e4],[1.5e8,.35,1544e4],[3e8,.38,1994e4],[5e8,.40,2594e4],[1e9,.42,3594e4],[Infinity,.45,6594e4]];
  var tax=0;
  for(var i=0;i<br.length;i++){ if(base<=br[i][0]){ tax=base*br[i][1]-br[i][2]; break; } }
  var credit = tax<=1.3e6 ? tax*0.55 : 715000+(tax-1.3e6)*0.30;
  var cap = gross<=3.3e7 ? 74e4 : gross<=7e7 ? Math.max(74e4-(gross-3.3e7)*0.008,66e4) : Math.max(66e4-(gross-7e7)/2,50e4);
  credit = Math.min(credit, cap);
  var incomeTaxM = Math.max((tax-credit)/12, 0);
  var localTaxM = incomeTaxM*0.1;
  var deduct = pension+health+care+employ+incomeTaxM+localTaxM;
  setShare({v:annual});
  receipt('salOut','월 급여 명세 (추정)','SALARY '+RATES.YEAR+' · 요율 기준',[
    ['월 세전 급여',won(grossM)],['국민연금','-'+won(pension)],['건강보험','-'+won(health)],
    ['장기요양','-'+won(care)],['고용보험','-'+won(employ)],['소득세','-'+won(incomeTaxM)],
    ['지방소득세','-'+won(localTaxM)],['공제 합계','-'+won(deduct)]
  ],'월 실수령액',won(grossM-deduct));
  leadCTA('salOut','급여·4대보험 처리를 맡길 파트너가 필요하신가요?','무료 견적 문의 →');
}

var fxDefault = {USD:'1,350', JPY:'900', EUR:'1,480', CNY:'190'};
function toggleCv(){
  var fx = segVal('cvMode')==='fx';
  document.getElementById('cvFx').classList.toggle('hidden', !fx);
  document.getElementById('cvArea').classList.toggle('hidden', fx);
}
function calcConvert(){
  if(segVal('cvMode')==='fx'){
    var cur = document.getElementById('fxCur').value;
    var rate = num(document.getElementById('fxRate').value);
    var amt = num(document.getElementById('fxAmt').value);
    if(!rate||!amt) return alert('환율과 금액을 입력해주세요.');
    var unit = cur==='JPY'?100:1;
    receipt('cvOut','환율 변환','FX CONVERSION',[
      ['통화',cur+(cur==='JPY'?' (100엔)':'')],
      ['적용 환율',rate.toLocaleString('ko-KR')+'₩'],
      ['외화 금액',amt.toLocaleString('ko-KR')]
    ],'원화 환산',won(amt/unit*rate));
  } else {
    var dir = segVal('areaDir');
    var a = parseFloat(document.getElementById('areaAmt').value)||0;
    if(!a) return alert('면적을 입력해주세요.');
    var P=3.3058, out = dir==='p2m'?a*P:a/P;
    receipt('cvOut','면적 변환','AREA CONVERSION',[
      ['입력',a+(dir==='p2m'?'평':'㎡')],['환산 계수','1평 = 3.3058㎡']
    ],'변환 결과',out.toFixed(2)+(dir==='p2m'?'㎡':'평'));
  }
}

function calcLoan(){
  var P = num(document.getElementById('loanAmt').value);
  var rate = parseFloat(document.getElementById('loanRate').value)||0;
  var years = parseFloat(document.getElementById('loanYears').value)||0;
  if(!P||!rate||!years) return alert('대출 금액·이자율·기간을 모두 입력해주세요.');
  var r=rate/100/12, n=years*12, mode=segVal('loanMode');
  var lines=[], totalLabel='총 이자', totalVal;
  if(mode==='equal'){
    var m = P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
    lines=[['상환 방식','원리금균등'],['월 납입금(고정)',won(m)],['총 상환액',won(m*n)]];
    totalVal=won(m*n-P);
  } else if(mode==='principal'){
    var prinM=P/n, interest=P*r*(n+1)/2;
    lines=[['상환 방식','원금균등'],['첫 달 납입금',won(prinM+P*r)],['마지막 달',won(prinM+prinM*r)],['총 상환액',won(P+interest)]];
    totalVal=won(interest);
  } else {
    var mi=P*r;
    lines=[['상환 방식','만기일시상환'],['월 이자',won(mi)],['만기 상환 원금',won(P)]];
    totalVal=won(mi*n);
  }
  setShare({v:P, r:rate, y:years});
  receipt('loanOut','대출 상환 계산서','LOAN STATEMENT',lines,totalLabel,totalVal);
}

function calcInvoice(){
  var item = (document.getElementById('ivItem').value||'').trim() || '용역/재화';
  var amt = num(document.getElementById('ivAmt').value);
  if(!amt) return alert('금액을 입력해주세요.');
  var date = document.getElementById('ivDate').value || new Date().toISOString().slice(0,10);
  var supply, vat, total;
  if(segVal('ivMode')==='total'){ total=amt; supply=Math.round(total/1.1); vat=total-supply; }
  else { supply=amt; vat=Math.round(supply*0.1); total=supply+vat; }
  receipt('ivOut','세금계산서 발행 요약','TAX INVOICE DRAFT',[
    ['작성일자',date],['품목',esc(item)],['공급가액',won(supply)],['세액 (10%)',won(vat)],
    ['금액 검증',(supply+vat===total?'✓ 검증 통과':'⚠ 확인 필요')]
  ],'합계금액',won(total));
  leadCTA('ivOut','세금계산서 발행·기장 대행이 필요하신가요?','무료 견적 문의 →');
}

/* ─────────── 허브: 도구 탭 ─────────── */
function showTool(key){
  var panels=document.querySelectorAll('.tool-panel');
  for(var i=0;i<panels.length;i++) panels[i].classList.remove('on');
  var p=document.getElementById('tool-'+key);
  if(p) p.classList.add('on');
  var tabs=document.querySelectorAll('.tool-tabs button');
  for(var j=0;j<tabs.length;j++) tabs[j].classList.toggle('on', tabs[j].dataset.tool===key);
}
function goTool(key){
  showTool(key);
  var t=document.getElementById('tools');
  if(t) t.scrollIntoView({behavior:'smooth'});
}

/* ─────────── 티커 ─────────── */
var TICKS=[
  ['USD/KRW','1,350','',''],['JPY100/KRW','900','',''],['EUR/KRW','1,480','',''],
  ['부가세율','10%','',''],['국민연금(근로자)','4.75%','',''],['건강보험(근로자)','3.595%','',''],
  ['고용보험','0.9%','',''],['기준 1평','3.3058㎡','','']
];
function renderTicker(){
  var tr=document.getElementById('tickerTrack');
  if(!tr) return;
  var one = TICKS.map(function(t){
    return '<span>'+t[0]+' <b>'+t[1]+'</b>'+(t[3]?' <em class="'+t[2]+'">'+t[3]+'</em>':'')+'</span>';
  }).join('');
  tr.innerHTML = one + one;
}

/* ─────────── 콘텐츠 피드 ─────────── */
var FEED = [
 {c:'tip',t:'💡 업무 꿀팁',title:'엑셀에서 세금계산서 금액 1원 오차 없애는 법',ex:'ROUND 함수 하나면 홈택스 반려가 사라집니다.',body:'합계금액을 1.1로 나누면 소수점이 생기고, 이걸 그대로 두면 공급가액+세액이 합계와 1원 차이 나는 일이 생깁니다. 공급가액 셀에 =ROUND(합계/1.1,0), 세액 셀에 =합계-공급가액 으로 잡아두면 어떤 금액이든 오차가 0이 됩니다. 세액을 따로 10% 곱해서 반올림하지 않는 게 포인트예요.'},
 {c:'tip',t:'💡 업무 꿀팁',title:'연봉 협상 전에 반드시 확인할 숫자 3가지',ex:'제시 연봉이 아니라 실수령액·상여 포함 여부·비과세 항목을 보세요.',body:'첫째, 제시 연봉에 상여·성과급이 포함된 금액인지 기본급 기준인지 확인하세요. 둘째, 식대 등 비과세 항목이 얼마나 잡혀 있는지에 따라 같은 연봉이라도 실수령액이 달라집니다. 셋째, 인상률보다 절대 금액의 월 실수령 차이를 계산해보면 협상 카드가 명확해집니다. 실수령액 계산기로 두 시나리오를 비교해보세요.'},
 {c:'fun',t:'😆 유머',title:'회사에서 절대 하면 안 되는 말 1위',ex:'"제가 해보겠습니다"... 그 뒤에 벌어지는 일.',body:'"제가 해보겠습니다"라고 말한 순간, 그 일은 영원히 당신 것이 됩니다. 다음 분기에도, 그다음 분기에도. 신입 때 멋있어 보이려고 했던 그 한마디를 3년째 후회하는 사람이 이 글을 썼습니다. 여러분은 "같이 해보면 어떨까요?"라고 하세요. 책임이 절반이 됩니다.'},
 {c:'tip',t:'💡 업무 꿀팁',title:'사업자라면 꼭 알아야 할 적격증빙 4종 세트',ex:'세금계산서·계산서·현금영수증·카드전표, 뭐가 다를까?',body:'경비 처리의 핵심은 적격증빙입니다. 부가세를 환급받으려면 세금계산서나 사업자 지출증빙용 현금영수증이 필요하고, 간이영수증은 3만 원 초과 시 가산세 대상이 될 수 있습니다. 거래처가 간이과세자인지 일반과세자인지에 따라 받을 수 있는 증빙이 달라지니 거래 전 사업자 유형부터 확인하세요.'},
 {c:'fun',t:'😆 유머',title:'재택근무 3년 차가 잃어버린 능력들',ex:'출근 복장 고르기, 소리 내서 말하기, 그리고...',body:'1) 오전 9시 전에 인간의 형상 갖추기 2) 점심 메뉴를 남과 협의하기 3) 회의에서 "화면 공유가 안 되는데요" 없이 말 시작하기 4) 엘리베이터에서 눈 둘 곳 찾기. 하지만 얻은 것도 있습니다. 세상에서 제일 빠른 "카메라 켜기 전 3초 정리" 스킬.'},
 {c:'tip',t:'💡 업무 꿀팁',title:'대출 갈아타기 전 계산해봐야 할 손익분기점',ex:'금리 0.5%p 낮아져도 손해일 수 있습니다.',body:'대환대출의 핵심은 중도상환수수료와 남은 기간입니다. 예를 들어 수수료가 1.2%라면, 낮아진 금리로 아끼는 월 이자 차액이 그 수수료를 회수하는 데 몇 개월 걸리는지 계산해야 합니다. 남은 기간이 짧다면 갈아타지 않는 게 이득일 수 있어요. 대출 계산기로 두 조건의 총 이자를 각각 구해 비교해보세요.'},
 {c:'fun',t:'😆 유머',title:'사장님만 아는 감정: 통장 스치는 부가세',ex:'분명 내 돈이었는데, 처음부터 아니었다고 한다.',body:'매출이 들어올 땐 내 돈 같지만, 그중 10%는 국가가 잠시 맡겨둔 돈입니다. 신고 기간이 오면 얌전히 돌려드려야 하죠. 그래서 현명한 사장님들은 부가세 통장을 따로 만듭니다. 눈에 안 보이면 내 돈이라는 착각도 안 하니까요. 부가세 계산기로 미리 떼어둘 금액을 확인하세요.'},
 {c:'tip',t:'💡 업무 꿀팁',title:'프리랜서 3.3% 원천징수, 5월에 돌려받는 법',ex:'경비 처리만 잘해도 환급액이 달라집니다.',body:'프리랜서로 받은 보수에서 떼인 3.3%는 기납부세액입니다. 5월 종합소득세 신고에서 실제 소득과 경비를 정산하면 상당수는 환급 대상이 됩니다. 업무 관련 지출(장비·통신비·교통비 등) 증빙을 평소에 모아두는 것이 핵심이고, 소득이 일정 규모 이하라면 단순경비율 적용이 유리한지도 비교해보세요.'},
 {c:'fun',t:'😆 유머',title:'회의가 메일로 끝날 수 있었는지 판별하는 법',ex:'결론: 대부분 그렇다.',body:'회의 시작 10분간 아무도 화면을 공유하지 않는다 → 메일로 가능했음. 참석자 절반이 카메라를 끄고 있다 → 메일로 가능했음. 회의 끝나고 "정리해서 메일 드릴게요"라는 말이 나온다 → 처음부터 그 메일이면 됐음. 다만 점심 메뉴 정하는 회의만은 예외입니다. 그건 전쟁이니까요.'}
];
/* 뉴스 API 연동 전 표시되는 안내 카드 (연동되면 실제 기사로 자동 대체) */
var NEWS_PLACEHOLDER = [
 {c:'news',t:'📰 뉴스',title:'뉴스 자동 수집 대기 중',ex:'네이버 API 키를 등록하면 이 자리에 최신 경제 뉴스가 자동으로 채워집니다.',body:'Vercel 환경변수에 NAVER_ID와 NAVER_SECRET 두 개만 입력하면, 경제·소상공인 관련 최신 뉴스가 10분마다 자동 갱신됩니다. 설정 방법은 README를 참고하세요.'},
 {c:'sports',t:'⚽ 스포츠',title:'스포츠 뉴스 자동 수집 대기 중',ex:'네이버 API 키를 등록하면 최신 스포츠 기사가 자동으로 채워집니다.',body:'프로야구·해외축구 등 스포츠 뉴스가 자동 갱신됩니다. 별도 작업은 필요 없습니다.'},
 {c:'enter',t:'🎬 연예',title:'연예 뉴스 자동 수집 대기 중',ex:'네이버 API 키를 등록하면 최신 연예 기사가 자동으로 채워집니다.',body:'연예·드라마·예능 뉴스가 자동 갱신됩니다. 별도 작업은 필요 없습니다.'}
];

var feedCat='all', feedShown=0, PAGE=6;
function cardHTML(d,i){
  var tagCls={tip:'t-tip',news:'t-news',sports:'t-sports',enter:'t-enter',fun:'t-fun'}[d.c];
  return '<article class="card" data-cat="'+d.c+'" onclick="toggleCard(this,event)" tabindex="0" onkeydown="if(event.key===\'Enter\')toggleCard(this,event)">'
    +'<span class="tag '+tagCls+'">'+d.t+'</span><h3>'+d.title+'</h3>'
    +'<p class="excerpt">'+d.ex+'</p><div class="body">'+d.body+'</div>'
    +'<div class="meta"><span>'+(d.date||'READ '+(2+i%3)+' MIN')+'</span><span class="more">펼치기 ▾</span></div></article>';
}
function toggleCard(el,ev){
  if(ev && ev.target && ev.target.tagName==='A') return; /* 원문 링크 클릭은 통과 */
  el.classList.toggle('open');
}
function adCardHTML(){
  return '<div class="ad-slot" data-ad="rect" style="min-height:200px">AD · 300×250 사각형<span class="ad-note">config.js에 애드센스 ID를 넣으면 실제 광고로 바뀝니다</span></div>';
}
function getPool(){
  var all = FEED.slice();
  /* 뉴스류가 하나도 없으면 안내 카드 노출 */
  var hasNews = all.some(function(d){return d.c==='news';});
  if(!hasNews) all = all.concat(NEWS_PLACEHOLDER);
  return all.filter(function(d){return feedCat==='all'||d.c===feedCat;});
}
function renderFeed(reset){
  var grid=document.getElementById('feedGrid');
  if(!grid) return;
  if(reset){grid.innerHTML='';feedShown=0;}
  var pool=getPool();
  var next=pool.slice(feedShown, feedShown+PAGE);
  var html='';
  next.forEach(function(d,idx){
    html+=cardHTML(d, feedShown+idx);
    if((feedShown+idx+1)%4===0) html+=adCardHTML();
  });
  grid.insertAdjacentHTML('beforeend', html);
  feedShown+=next.length;
  var s=document.getElementById('feedSentinel');
  if(s) s.innerHTML = feedShown>=pool.length
    ? '<span>마지막 콘텐츠입니다 ✦</span>'
    : '<button class="load-more" onclick="loadMore()">콘텐츠 더 보기 ↓</button>';
  applyAds();
}
function loadMore(){renderFeed(false);}
function feedFilter(cat,btn){
  feedCat=cat;
  var tabs=document.querySelectorAll('.feed-tabs button');
  for(var i=0;i<tabs.length;i++) tabs[i].classList.remove('on');
  btn.classList.add('on');
  renderFeed(true);
}

/* ─────────── 검색 (허브) ─────────── */
var TOOL_KEYS={vat:['부가세','vat','세금','공급가액'],salary:['연봉','실수령','월급','급여'],convert:['환율','달러','엔화','평수','평','면적'],loan:['대출','이자','상환','금리'],invoice:['세금계산서','계산서','발행','홈택스']};
function runSearch(){
  var input=document.getElementById('siteSearch');
  if(!input) return;
  var q=input.value.trim().toLowerCase();
  if(!q) return;
  for(var key in TOOL_KEYS){
    if(TOOL_KEYS[key].some(function(w){return q.indexOf(w)>-1||w.indexOf(q)>-1;})){ goTool(key); return; }
  }
  feedCat='all';
  var tabs=document.querySelectorAll('.feed-tabs button');
  for(var i=0;i<tabs.length;i++) tabs[i].classList.toggle('on', i===0);
  var grid=document.getElementById('feedGrid');
  var hits=getPool().filter(function(d){return (d.title+d.ex+d.body).toLowerCase().indexOf(q)>-1;});
  grid.innerHTML = hits.length
    ? hits.map(function(d,i){return cardHTML(d,i);}).join('')
    : '<div class="card" style="grid-column:1/-1;text-align:center;cursor:default"><h3>"'+esc(q)+'" 검색 결과가 없어요</h3><p class="excerpt">다른 키워드로 검색하거나, 필요한 작업을 외주로 의뢰해보세요.</p></div>';
  feedShown=999;
  document.getElementById('feedSentinel').innerHTML='<a href="#" onclick="renderFeed(true);return false" style="text-decoration:underline">전체 콘텐츠 보기</a>';
  document.getElementById('feed').scrollIntoView({behavior:'smooth'});
}

/* ─────────── 외주 폼 (Formspree 자동 연동) ─────────── */
function submitHire(){
  var name=(document.getElementById('hName').value||'').trim();
  var contact=(document.getElementById('hContact').value||'').trim();
  if(!name||!contact) return alert('이름과 연락처를 입력해주세요.');
  var cat=segVal('hireCat');
  var payload={
    분야:cat, 이름:name, 연락처:contact,
    예산:document.getElementById('hBudget').value,
    내용:(document.getElementById('hDesc').value||'').trim()
  };
  var done=function(){
    document.getElementById('stampMsg').textContent =
      name+'님의 '+cat+' 의뢰가 접수되었습니다. 24시간 내(영업일 기준) '+contact+'로 회신드릴게요.';
    document.getElementById('stampOverlay').classList.add('show');
  };
  if(CFG.FORM_ENDPOINT){
    var btn=document.querySelector('.submit-btn');
    btn.disabled=true;
    fetch(CFG.FORM_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload)
    }).then(function(r){
      btn.disabled=false;
      if(r.ok) done();
      else alert('전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }).catch(function(){
      btn.disabled=false;
      alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });
  } else {
    done(); /* 엔드포인트 미설정 시 데모 접수 */
  }
}
function resetHire(){
  document.getElementById('stampOverlay').classList.remove('show');
  ['hName','hContact','hDesc'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
}

/* ─────────── 카운트업 & 스크롤 리빌 & 네비 ─────────── */
function initFx(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var counters=document.querySelectorAll('.trust .num');
  if(counters.length && 'IntersectionObserver' in window){
    var countObs=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        var el=e.target, target=+el.dataset.count, suf=el.dataset.suffix||'';
        countObs.unobserve(el);
        if(reduce){ el.textContent=target.toLocaleString('ko-KR')+suf; return; }
        var t0=performance.now(), dur=1200;
        (function tick(t){
          var p=Math.min((t-t0)/dur,1), ease=1-Math.pow(1-p,3);
          el.textContent=Math.round(target*ease).toLocaleString('ko-KR')+suf;
          if(p<1) requestAnimationFrame(tick);
        })(t0);
      });
    },{threshold:.4});
    counters.forEach(function(c){countObs.observe(c);});
  }
  if('IntersectionObserver' in window){
    var revealObs=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); revealObs.unobserve(e.target); } });
    },{threshold:.12});
    document.querySelectorAll('.reveal').forEach(function(el){revealObs.observe(el);});
    var sent=document.getElementById('feedSentinel');
    if(sent) new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting && document.querySelector('#feedSentinel .load-more')) loadMore(); });
    },{rootMargin:'200px'}).observe(sent);
  }
  addEventListener('scroll',function(){
    var tb=document.getElementById('topbar');
    if(tb) tb.classList.toggle('scrolled', scrollY>8);
  },{passive:true});
  var si=document.getElementById('siteSearch');
  if(si) si.addEventListener('keydown',function(e){if(e.key==='Enter')runSearch();});
}

/* ═══════════ 자동 연동 ① 애드센스 ═══════════
   config.js에 ADSENSE_CLIENT만 넣으면 모든 광고 자리가 실제 광고로 바뀝니다. */
var adsLoaded=false;
function applyAds(){
  if(!CFG.ADSENSE_CLIENT) return;
  if(!adsLoaded){
    adsLoaded=true;
    var s=document.createElement('script');
    s.async=true;
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+CFG.ADSENSE_CLIENT;
    s.crossOrigin='anonymous';
    document.head.appendChild(s);
  }
  document.querySelectorAll('.ad-slot:not(.live)').forEach(function(slot){
    slot.classList.add('live');
    slot.innerHTML='<ins class="adsbygoogle" style="display:block" data-ad-client="'+CFG.ADSENSE_CLIENT+'" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
  });
}

/* ═══════════ 자동 연동 ② 네이버 뉴스 ═══════════
   Vercel에 NAVER_ID / NAVER_SECRET 환경변수만 넣으면
   /api/news 중계 함수를 통해 뉴스·스포츠·연예 탭이 자동으로 채워집니다.
   (로컬 파일로 열거나 키 미설정 시 조용히 건너뛰고 안내 카드가 표시됩니다) */
function loadNaverNews(){
  if(CFG.ENABLE_NEWS===false) return;
  if(location.protocol.indexOf('http')!==0) return; /* 로컬 파일 미리보기 */
  if(!document.getElementById('feedGrid')) return;
  var jobs=[
    {q:'경제 소상공인', cat:'news',   tag:'📰 뉴스'},
    {q:'프로야구',       cat:'sports', tag:'⚽ 스포츠'},
    {q:'연예',           cat:'enter',  tag:'🎬 연예'}
  ];
  var seen={};
  Promise.all(jobs.map(function(job){
    return fetch('/api/news?q='+encodeURIComponent(job.q))
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(data){
        if(!data||!data.items) return [];
        return data.items.slice(0,6).map(function(it){
          var title=esc(it.title);
          if(seen[title]) return null;
          seen[title]=1;
          var d = it.pubDate ? new Date(it.pubDate) : null;
          return {
            c:job.cat, t:job.tag,
            title:title,
            ex:esc(it.description).slice(0,90)+'…',
            body:esc(it.description)+'<br><br><a href="'+(it.originallink||it.link)+'" target="_blank" rel="noopener noreferrer">원문 기사 보기 →</a>',
            date: d ? (d.getMonth()+1)+'월 '+d.getDate()+'일' : ''
          };
        }).filter(Boolean);
      })
      .catch(function(){ return []; });
  })).then(function(results){
    var items=[].concat.apply([],results);
    if(!items.length) return;
    FEED = items.concat(FEED); /* 최신 뉴스를 앞에 배치 */
    renderFeed(true);
  });
}

/* ═══════════ 자동 연동 ③ 실시간 환율 (키 불필요) ═══════════
   무료 오픈 API(open.er-api.com)로 환율 기본값과 티커를 자동 갱신합니다. */
function loadLiveFx(){
  if(CFG.ENABLE_LIVE_FX===false) return;
  if(location.protocol.indexOf('http')!==0) return;
  fetch('https://open.er-api.com/v6/latest/USD')
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data||!data.rates||!data.rates.KRW) return;
      var R=data.rates, krw=R.KRW;
      var rates={
        USD: krw,
        JPY: R.JPY ? krw/R.JPY*100 : null,
        EUR: R.EUR ? krw/R.EUR : null,
        CNY: R.CNY ? krw/R.CNY : null
      };
      for(var k in rates){
        if(rates[k]) fxDefault[k]=Math.round(rates[k]*100)/100 + '';
      }
      /* 현재 선택된 통화의 입력값도 갱신 */
      var cur=document.getElementById('fxCur'), rateEl=document.getElementById('fxRate');
      if(cur&&rateEl&&fxDefault[cur.value]) rateEl.value=Number(fxDefault[cur.value]).toLocaleString('ko-KR');
      var note=document.getElementById('fxNote');
      if(note) note.textContent='실시간 환율이 자동 적용되었습니다(매매기준율과 소폭 차이 가능). 필요하면 직접 수정하세요. 1평 = 3.3058㎡ 기준.';
      /* 티커 갱신 */
      if(rates.USD) TICKS[0]=['USD/KRW',Number(fxDefault.USD).toLocaleString('ko-KR'),'up','LIVE'];
      if(rates.JPY) TICKS[1]=['JPY100/KRW',Number(fxDefault.JPY).toLocaleString('ko-KR'),'up','LIVE'];
      if(rates.EUR) TICKS[2]=['EUR/KRW',Number(fxDefault.EUR).toLocaleString('ko-KR'),'up','LIVE'];
      renderTicker();
    })
    .catch(function(){});
}

/* ═══════════ 자동 연동 ④ Google 애널리틱스(GA4) ═══════════
   config.js에 ANALYTICS_ID(G-XXXXXXXXXX)만 넣으면 방문 측정이 켜집니다. */
function loadAnalytics(){
  if(!CFG.ANALYTICS_ID) return;
  var s=document.createElement('script');
  s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+CFG.ANALYTICS_ID;
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('js', new Date());
  gtag('config', CFG.ANALYTICS_ID);
}

/* ─────────── 초기화 ─────────── */
document.addEventListener('DOMContentLoaded', function(){
  loadAnalytics();
  mountCalcs();
  renderTicker();
  renderFeed(true);
  initFx();
  applyAds();
  loadNaverNews();
  loadLiveFx();
});
