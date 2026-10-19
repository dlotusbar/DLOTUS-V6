import { useEffect, useRef, useState } from 'react';

export default function LeitorQRReserva({onLido}) {
  const video = useRef(null), stream = useRef(null), frame = useRef(null), detector = useRef(null), ativo = useRef(false);
  const [aberto,setAberto] = useState(false), [erro,setErro] = useState('');
  const parar = () => {
    ativo.current = false;
    if(frame.current) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(t=>t.stop());
    stream.current = null;
    if(video.current) video.current.srcObject = null;
    setAberto(false);
  };
  useEffect(()=>()=>{ativo.current=false; if(frame.current)cancelAnimationFrame(frame.current);stream.current?.getTracks().forEach(t=>t.stop());},[]);
  useEffect(()=>{if(aberto && video.current && stream.current){video.current.srcObject=stream.current;video.current.play().catch(()=>{});}},[aberto]);
  const iniciar = async () => {
    setErro('');
    if(!window.isSecureContext){setErro('A câmera exige HTTPS ou localhost.');return;}
    if(!('BarcodeDetector' in window)){setErro('Este navegador não oferece leitura QR integrada. Use Chrome atualizado ou leitor externo.');return;}
    try {
      detector.current = new window.BarcodeDetector({formats:['qr_code']});
      const camera = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      stream.current=camera;setAberto(true);ativo.current=true;
      if(video.current){video.current.srcObject=camera;await video.current.play();}
      const buscar=async()=>{
        if(!ativo.current)return;
        try {if(video.current?.readyState>=2){const codigos=await detector.current.detect(video.current);if(codigos.length){const codigo=codigos[0].rawValue;parar();onLido(codigo);return;}}}catch(e){}
        if(ativo.current)frame.current=requestAnimationFrame(buscar);
      };
      frame.current=requestAnimationFrame(buscar);
    }catch(e){parar();setErro('Não foi possível acessar a câmera. Confira a permissão do navegador.');}
  };
  return <div className="space-y-2"><div className="flex gap-2"><button type="button" onClick={aberto?parar:iniciar} className="rounded-lg bg-cyan-700 px-4 py-3">{aberto?'Fechar câmera':'Ler QR Code pela câmera'}</button></div>{aberto&&<video ref={video} playsInline muted className="w-full max-w-md rounded-xl border border-cyan-600"/>}{erro&&<p role="alert" className="text-amber-300 text-sm">{erro}</p>}</div>;
}
