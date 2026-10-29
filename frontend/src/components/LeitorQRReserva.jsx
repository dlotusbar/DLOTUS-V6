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
    ativo.current = true;
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
  useEffect(() => {
    // Ao selecionar Câmera, iniciar automaticamente sem um segundo botão.
    iniciar();
    return () => {
      ativo.current = false;
      if (frame.current) cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach(t => t.stop());
      stream.current = null;
    };
  }, []);

  return <div className="w-full">
    <video ref={video} playsInline muted autoPlay className={`w-full aspect-square object-cover rounded-xl ${aberto ? '' : 'hidden'}`} />
    {!aberto && !erro && <p className="py-16 text-center text-cyan-300 text-sm">Abrindo câmera...</p>}
    {erro && <p role="alert" className="py-10 text-center text-amber-300 text-sm">{erro}</p>}
  </div>;
}
