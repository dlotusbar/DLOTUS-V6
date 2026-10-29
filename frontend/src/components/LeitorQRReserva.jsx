import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// A câmera inicia exclusivamente no clique do botão Câmera da Portaria.
// O elemento de vídeo permanece montado, evitando o problema de inicialização
// fora do gesto do usuário em WebViews e aplicativos clonados.
const LeitorQRReserva = forwardRef(function LeitorQRReserva({ onLido }, ref) {
  const video = useRef(null);
  const stream = useRef(null);
  const frame = useRef(null);
  const detector = useRef(null);
  const ativo = useRef(false);
  const iniciando = useRef(false);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');

  const parar = () => {
    ativo.current = false;
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
    }
    setAberto(false);
  };

  const iniciar = async () => {
    if (iniciando.current || ativo.current) return;
    iniciando.current = true;
    setErro('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErro('Câmera indisponível neste aplicativo. Abra o PDV em HTTPS e autorize o acesso à câmera.');
      iniciando.current = false;
      return;
    }
    if (!('BarcodeDetector' in window)) {
      setErro('Este aplicativo não suporta leitura de QR Code pela câmera. Tente no Chrome atualizado.');
      iniciando.current = false;
      return;
    }
    try {
      detector.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      // Solicitação feita diretamente no clique do usuário.
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false
      });
      stream.current = camera;
      ativo.current = true;
      if (video.current) {
        video.current.srcObject = camera;
        await video.current.play();
      }
      setAberto(true);
      const buscar = async () => {
        if (!ativo.current) return;
        try {
          if (video.current?.readyState >= 2) {
            const codigos = await detector.current.detect(video.current);
            if (codigos.length) {
              const codigo = codigos[0].rawValue;
              parar();
              onLido(codigo);
              return;
            }
          }
        } catch (_) { /* Frame ainda não disponível. */ }
        if (ativo.current) frame.current = requestAnimationFrame(buscar);
      };
      frame.current = requestAnimationFrame(buscar);
    } catch (e) {
      parar();
      const tipo = e?.name || '';
      setErro(tipo === 'NotAllowedError' || tipo === 'PermissionDeniedError'
        ? 'Acesso à câmera negado. Autorize a câmera nas permissões do aplicativo.'
        : tipo === 'NotFoundError' || tipo === 'DevicesNotFoundError'
        ? 'Nenhuma câmera foi encontrada neste dispositivo.'
        : tipo === 'NotReadableError' || tipo === 'TrackStartError'
        ? 'A câmera está ocupada por outro aplicativo. Feche outros apps e tente novamente.'
        : `Não foi possível iniciar a câmera${tipo ? ` (${tipo})` : ''}.`);
    } finally {
      iniciando.current = false;
    }
  };

  useImperativeHandle(ref, () => ({ iniciar, parar }));
  useEffect(() => () => {
    ativo.current = false;
    if (frame.current != null) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);

  return <div className="w-full">
    <video ref={video} playsInline muted autoPlay className={`w-full aspect-square object-cover rounded-xl ${aberto ? '' : 'hidden'}`} />
    {!aberto && !erro && <p className="py-16 text-center text-cyan-300 text-sm">Toque em Câmera para iniciar a leitura.</p>}
    {erro && <p role="alert" className="py-10 text-center text-amber-300 text-sm">{erro}</p>}
  </div>;
});

export default LeitorQRReserva;
