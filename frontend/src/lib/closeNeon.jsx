
import { useEffect, useState } from "react";
import { formatBRL, formatDate } from "./api";

const money = n => formatBRL(Number(n || 0));
const number = n => Number(n || 0);
const COLORS = { blue:"#05c8ff", gold:"#ffd55e", pink:"#ff39c9", white:"#f5f7ff", muted:"#c4d1e4", green:"#42f9ba" };

export function buildCloseData(report, kind, name) {
  const m = report.sales_by_method || {};
  const isPortaria = kind === "portaria";
  const total = number(report.total_sales ?? (number(m.dinheiro)+number(m.pix)+number(m.credito)+number(m.debito)));
  const prices = report.detalhamento_precos || {};
  const sex = s => ({
    title:s === "mulher" ? "MULHERES" : "HOMENS",
    count:number(report[s === "mulher" ? "mulheres" : "homens"]),
    rows:(prices[s] || []).map(p => [`${p.quantidade} x ${money(p.preco)}`,money(p.total)]),
    subtotal:(prices[s] || []).reduce((a,p)=>a+number(p.total),0),
  });
  const general = [
    ["ABERTO EM",report.opened_at ? formatDate(report.opened_at) : "—"],
    ["FECHADO EM",report.closed_at ? formatDate(report.closed_at) : "—"],
    ["POR",report.closed_by_name || report.opened_by_name || "—"],
    ["TROCO INICIAL",money(isPortaria ? report.initial_amount : report.initial_change)],
    [isPortaria ? "PESSOAS" : "VENDAS",isPortaria ? String(report.total_pessoas || 0) : `${report.orders_count || 0} (${report.items_sold || 0} itens)`]
  ];
  const payments = [["DINHEIRO",money(m.dinheiro)],["PIX",money(m.pix)],["CRÉDITO",money(m.credito)],["DÉBITO",money(m.debito)]];
  const side = [
    ["SANGRIAS",`- ${money(report.sangrias_total)}`],
    ["DINHEIRO ESPERADO",money(isPortaria ? report.expected?.dinheiro : report.expected_cash)],
    ...(isPortaria ? [["DINHEIRO CONTADO",money(report.counted?.dinheiro)],["DIFERENÇA",money(report.differences?.dinheiro)]] : []),
  ];
  return {name:name || (isPortaria ? "CAIXA PORTARIA" : "CAIXA"),general,payments,side,sexes:isPortaria?[sex("mulher"),sex("homem")]:[],total};
}
export function drawCloseCanvas(report,kind,name) {
  const d=buildCloseData(report,kind,name);
  const W=1024, scale=2, gap=24, margin=30;
  const sexHeight = d.sexes.length ? Math.max(...d.sexes.map(s=>160+s.rows.length*58)) : 0;
  const infoY=235, infoH=350, sexY=infoY+infoH+gap;
  const payY=d.sexes.length ? sexY+sexHeight+gap : sexY;
  const payH=340, totalY=payY+payH+gap, totalH=152, H=totalY+totalH+56;
  const canvas=document.createElement("canvas");
  canvas.width=W*scale;canvas.height=H*scale;
  const c=canvas.getContext("2d");
  if(!c) throw new Error("Canvas indisponível");
  c.scale(scale,scale);
  const rect=(x,y,w,h,r,fill,stroke,glow=0)=>{
    c.save();c.beginPath();c.roundRect(x,y,w,h,r);
    if(fill){c.fillStyle=fill;c.fill();}
    if(stroke){c.strokeStyle=stroke;c.lineWidth=2.5;c.shadowColor=stroke;c.shadowBlur=glow;c.stroke();}
    c.restore();
  };
  const text=(t,x,y,size=26,color=COLORS.white,weight=500,align="left",max)=>{
    c.save();c.fillStyle=color;c.font=`${weight} ${size}px Arial, sans-serif`;c.textAlign=align;c.textBaseline="middle";
    c.fillText(String(t??""),x,y,max);c.restore();
  };
  const glowText=(t,x,y,size,color,align="left",max)=>{
    c.save();c.shadowColor=color;c.shadowBlur=15;c.fillStyle=color;c.font=`900 ${size}px Arial, sans-serif`;c.textAlign=align;c.textBaseline="middle";
    c.fillText(t,x,y,max);c.restore();
  };
  const line=(x1,y,x2,color="#285379")=>{
    c.beginPath();c.moveTo(x1,y);c.lineTo(x2,y);c.strokeStyle=color;c.lineWidth=1.4;c.stroke();
  };
  const bg=c.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#000714");bg.addColorStop(.48,"#040d20");bg.addColorStop(1,"#02040c");
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  // Angular blue/gold light streaks around the perimeter.
  for(let i=0;i<13;i++){
    const y=i*102-200;
    c.beginPath();c.moveTo(0,y);c.lineTo(190,y+190);
    c.strokeStyle=i%3===0?"#e3a83b":i%2===0?"#0048e8":"#00b8ff";
    c.lineWidth=i%3===0?5:3;c.shadowColor=c.strokeStyle;c.shadowBlur=16;c.stroke();
    c.beginPath();c.moveTo(W,y);c.lineTo(W-190,y+190);c.stroke();
  }
  const top=c.createLinearGradient(0,65,W,220);
  top.addColorStop(0,"#000816");top.addColorStop(.5,"#061630");top.addColorStop(1,"#000716");
  rect(36,48,W-72,175,46,top,COLORS.blue,18);
  rect(40,50,W-80,170,42,null,"#175cff",8);
  glowText("✓",112,134,100,COLORS.gold);
  glowText("CAIXA",245,131,80,COLORS.white,"left",315);
  glowText("FECHADO",545,131,80,COLORS.gold,"left",415);
  text(d.name.toUpperCase(),W/2,194,25,COLORS.muted,500,"center",740);
  const panel=(x,y,w,h,stroke)=>{
    const gr=c.createLinearGradient(x,y,x+w,y+h);
    gr.addColorStop(0,"#000b1e");gr.addColorStop(.55,"#020713");gr.addColorStop(1,"#091226");
    rect(x,y,w,h,26,gr,stroke,14);
  };
  panel(margin,infoY,W-2*margin,infoH,COLORS.gold);
  d.general.forEach(([label,value],i)=>{
    const y=infoY+57+i*59;
    text(["▣","▣","●","▣","♟"][i],margin+36,y,32,COLORS.gold,800);
    text(label,margin+110,y,25,i===3?COLORS.blue:COLORS.white,600,"left",350);
    text(value,margin+580,y,29,i===3?COLORS.blue:COLORS.white,i===3?800:500,"left",335);
  });
  if(d.sexes.length){
    const sw=(W-2*margin-gap)/2;
    d.sexes.forEach((s,index)=>{
      const x=margin+index*(sw+gap), y=sexY;
      const accent=index===0?COLORS.pink:COLORS.blue;
      panel(x,y,sw,sexHeight,accent);
      glowText(index===0?"♀":"♂",x+25,y+59,67,accent);
      text(s.title,x+103,y+54,39,COLORS.white,900,"left",sw-250);
      rect(x+sw-154,y+26,132,50,13,"#e8ac2e",COLORS.gold,9);
      text(`${s.count} PESSOAS`,x+sw-88,y+51,18,"#16110b",800,"center",124);
      let ry=y+121;
      s.rows.forEach(([label,value])=>{
        line(x+25,ry+25,x+sw-25);
        text(label,x+30,ry,25,COLORS.white,500,"left",sw/2-32);
        text(value,x+sw-27,ry,26,COLORS.white,800,"right",sw/2-15);
        ry+=58;
      });
      rect(x+14,y+sexHeight-78,sw-28,65,10,"#221407",COLORS.gold,6);
      text("SUBTOTAL",x+31,y+sexHeight-44,24,COLORS.gold,800);
      text(money(s.subtotal),x+sw-28,y+sexHeight-44,31,COLORS.gold,900,"right",sw/2);
    });
  }
  panel(margin,payY,W-2*margin,payH,COLORS.gold);
  glowText("▣",margin+30,payY+55,40,COLORS.blue);
  text("ENTRADAS POR FORMA DE PAGAMENTO",margin+100,payY+56,32,COLORS.white,900,"left",W-170);
  const colW=(W-2*margin-65)/2;
  d.payments.forEach(([label,value],i)=>{
    const x=margin+37,y=payY+126+i*51;
    text(["▣","◆","▣","▣"][i],x,y,29,COLORS.gold,900);
    text(label,x+60,y,23,COLORS.white,500);
    text(value,x+colW-8,y,25,COLORS.white,800,"right",170);
    if(i<3)line(x,y+24,x+colW);
  });
  d.side.forEach(([label,value],i)=>{
    const x=margin+colW+48,y=payY+126+i*57;
    const color=i===0?COLORS.gold:i===1?COLORS.green:COLORS.white;
    text(["♜","♛","▣","⚖"][i],x,y,28,COLORS.gold,800);
    text(label,x+40,y,20,color,i<2?700:500,"left",215);
    text(value,W-margin-26,y,24,color,800,"right",170);
    if(i<d.side.length-1)line(x,y+28,W-margin-25);
  });
  const totalGrad=c.createLinearGradient(margin,totalY,W-margin,totalY+totalH);
  totalGrad.addColorStop(0,"#07152d");totalGrad.addColorStop(.5,"#010712");totalGrad.addColorStop(1,"#0b1a33");
  rect(margin,totalY,W-2*margin,totalH,35,totalGrad,COLORS.gold,20);
  rect(margin+12,totalY+10,W-2*margin-24,totalH-20,29,null,COLORS.blue,14);
  glowText("▮▮▮",margin+48,totalY+75,42,COLORS.gold);
  text("TOTAL VENDAS",margin+204,totalY+77,38,COLORS.white,900);
  glowText(money(d.total),W-margin-37,totalY+77,69,COLORS.gold,"right",410);
  return canvas;
}
export async function shareClosePng(report,kind,name) {
  const canvas=drawCloseCanvas(report,kind,name);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
  if(!blob)throw new Error("Não foi possível gerar PNG");
  const file=new File([blob],`fechamento-${kind}-dlotus.png`,{type:"image/png"});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    try{await navigator.share({files:[file]});return "shared";}
    catch(e){if(e.name==="AbortError")return "cancelled";throw e;}
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=file.name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return "downloaded";
}
export function CloseNeonPreview({report,kind,name}) {
  const [src,setSrc]=useState("");
  useEffect(()=>{
    let url;
    try{
      const canvas=drawCloseCanvas(report,kind,name);
      canvas.toBlob(blob=>{
        if(!blob)return;
        url=URL.createObjectURL(blob);setSrc(url);
      },"image/png");
    }catch(e){console.error("Erro na prévia do fechamento",e);}
    return ()=>{if(url)URL.revokeObjectURL(url);};
  },[report,kind,name]);
  return src ? <img src={src} alt={`Relatório de fechamento ${name}`} style={{width:"100%",height:"auto",display:"block",borderRadius:12}}/> : <div style={{padding:28,textAlign:"center",color:"#ffd55e"}}>Gerando prévia do fechamento...</div>;
}
