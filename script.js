function showTab(id){
  document.querySelectorAll('.top-panel button').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.top-panel button[onclick="showTab('${id}')"]`).classList.add('active');
  document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function mapEffectiveHours(h){
  if (h === 12) return 11;
  if (h === 11) return 10;
  if (h === 10) return 9;
  if (h === 8)  return 7.5;
  if (h === 7)  return 6.5;
  if (h === 6)  return 5.5;
  if (h === 4)  return 4;
  return h;
}

const standards={cartons:150,chemistry:123,rollers:110,market:110,boxing:31};
function calculateProductivity(){
  const getVal=id=>parseFloat(document.getElementById(id).value)||0;
  const rawHours=getVal('hoursWorked');
  const res=document.getElementById('prodResult');
  if(rawHours<=0){res.innerText='Помилка: години > 0';return;}

  const hours=mapEffectiveHours(rawHours);

  const calc=(v,std)=>(v/hours)/std*100;
  const total=calc(getVal('cartons'),standards.cartons)
             +calc(getVal('chemistry'),standards.chemistry)
             +calc(getVal('rollers'),standards.rollers)
             +calc(getVal('market'),standards.market)
             +calc(getVal('boxing'),standards.boxing);

  let c='';
  if(total<60)c='як тебе ше не звільнили бля';
  else if(total<80)c='Хаха Лох';
  else if(total<100&&total>=99)c='Бля 1 Процента не хватило Лох';
  else if(total>140)c='Насосав';

  res.innerText=`Загальна продуктивність: ${total.toFixed(2)}% (ефект. год: ${hours})\n${c}`;

  autoLogToday(rawHours, Math.round(total));
}

function calculateWeek(){
  const days=['mon','tue','wed','thu','fri','sat','sun'];let total=0,count=0;
  days.forEach(d=>{const v=parseFloat(document.getElementById(d).value);if(!isNaN(v)){total+=v;count++;}});
  const avg=count?(total/count).toFixed(2):0;
  document.getElementById('weekResult').innerText=`Сума: ${total.toFixed(2)}% | Середнє: ${avg}%`;
}

const tableBody=document.querySelector("#dataTable tbody");
let cachedWeeks={},cachedTotalMoney=0;
function saveData(){
  const rows=Array.from(tableBody.rows).map(r=>({date:r.cells[0].querySelector('input').value,hours:parseFloat(r.cells[1].querySelector('input').value)||0,percent:parseFloat(r.cells[2].querySelector('input').value)||0}));
  localStorage.setItem("workData",JSON.stringify(rows));calculateSummaries();
}
function loadData(){
  const data=JSON.parse(localStorage.getItem("workData")||"[]");
  data.forEach(i=>addRow(i.date,i.hours,i.percent));
}
function addRow(date='',hours='',percent=''){
  const row=tableBody.insertRow();
  row.innerHTML=`<td><input type="date" value="${date}" onchange="saveData()"></td>
                 <td><input type="number" value="${hours}" min="0" step="0.1" onchange="saveData()"></td>
                 <td><input type="number" value="${percent}" min="0" step="1" onchange="saveData()"></td>
                 <td><button onclick="deleteRow(this)">x</button></td>`;
  saveData();
}
function deleteRow(btn){btn.closest('tr').remove();saveData();}
function clearData(){if(confirm("Очистити всі дані?")){localStorage.removeItem("workData");tableBody.innerHTML="";calculateSummaries();}}
function getRate(p){
  if(p>139)return 51.2;if(p>134)return 49.0;if(p>129)return 46.8;if(p>124)return 44.6;
  if(p>119)return 42.4;if(p>114)return 40.2;if(p>109)return 38.0;if(p>104)return 35.8;
  if(p>99)return 33.6;if(p<=100)return 31.4;return 0;
}
function calculateSummaries(){
  const data=JSON.parse(localStorage.getItem("workData")||"[]");
  if(!data.length){
    document.getElementById("monthlySummary").textContent="Немає даних.";
    document.getElementById("weeklySummary").textContent="";
    document.getElementById("totalMoney").textContent="";
    return;
  }
  let totalHours=0,totalMoney=0;const weeks={};
  data.forEach(e=>{
    const d=new Date(e.date);if(isNaN(d))return;
    const w=getWeekOfMonth(d);if(!weeks[w])weeks[w]=[];
    weeks[w].push(e);totalHours+=e.hours;
  });
  cachedWeeks=weeks;
  document.getElementById("monthlySummary").textContent=`Всього: ${totalHours.toFixed(1)} год`;
  let txt='';
  for(const [w,entries] of Object.entries(weeks)){
    const hrs=entries.reduce((s,e)=>s+e.hours,0);
    const avg=entries.reduce((s,e)=>s+e.percent,0)/entries.length;
    const rate=getRate(Math.round(avg));
    const money=rate*hrs;totalMoney+=money;
    txt+=`Т${w}: ${hrs.toFixed(1)}г / ${avg.toFixed(0)}% = ${money.toFixed(2)} zł<br>`;
  }
  document.getElementById("weeklySummary").innerHTML=txt;
  document.getElementById("totalMoney").textContent=`Загалом: ${totalMoney.toFixed(2)} zł`;
  cachedTotalMoney=totalMoney;
}
function getWeekOfMonth(date){
  const start=new Date(date.getFullYear(),date.getMonth(),1);
  const day=date.getDate();
  const offset=start.getDay()===0?6:start.getDay()-1;
  return Math.floor((day+offset-1)/7)+1;
}
function exportToExcel(){
  const data=JSON.parse(localStorage.getItem("workData")||"[]");
  if(!data.length)return alert("Немає даних.");
  const wsData=[["Дата","Години","%","Ставка","Сума (zł)"]];
  data.forEach(r=>{const rate=getRate(Math.round(r.percent));wsData.push([r.date,r.hours,r.percent,rate,(rate*r.hours).toFixed(2)]);});
  wsData.push([]);wsData.push(["Тиждень","Години","%","Ставка","Сума (zł)"]);
  for(const [w,entries] of Object.entries(cachedWeeks)){
    const hrs=entries.reduce((s,e)=>s+e.hours,0);
    const avg=entries.reduce((s,e)=>s+e.percent,0)/entries.length;
    const rate=getRate(Math.round(avg));const money=rate*hrs;
    wsData.push([`Т${w}`,hrs.toFixed(1),avg.toFixed(0),rate,money.toFixed(2)]);
  }
  wsData.push([]);wsData.push(["Загалом","","","",cachedTotalMoney.toFixed(2)+" zł"]);
  const ws=XLSX.utils.aoa_to_sheet(wsData);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Звіт");XLSX.writeFile(wb,"повний_звіт.xlsx");
}

function autoLogToday(hours, percent){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const isoDate = `${yyyy}-${mm}-${dd}`;

  const rows = Array.from(tableBody.rows);
  let found = null;
  for (const r of rows){
    const dateInput = r.cells[0].querySelector('input');
    if (dateInput && dateInput.value === isoDate){ found = r; break; }
  }

  if (found){
    found.cells[1].querySelector('input').value = hours;
    found.cells[2].querySelector('input').value = percent;
    saveData();
  } else {
    addRow(isoDate, hours, percent);
  }
}

loadData();
