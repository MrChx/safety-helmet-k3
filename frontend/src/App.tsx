import { useState, useRef, useEffect } from 'react';

function App() {
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  //koneksi websocket
  const wsRef = useRef<WebSocket | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    safe: 0,
    danger: 0,
    confidence: 0,
    boxes: [] as any[],
  });

  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected">("idle");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setIsDetecting(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error playing video:", e));

          setConnectionStatus("connecting");
          initWebSocket();
        } else {
          console.error("Video ref is still null after mounting UI");
        }
      }, 50);

    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Tidak dapat mengakses kamera. Pastikan izin telah diberikan.");
      setIsDetecting(false);
    }
  };

  const initWebSocket = () => {
    // Hubungkan ke be
    const ws = new WebSocket('ws://localhost:8081/ws/detect');

    ws.onopen = () => {
      console.log('Connected to Go Backend API');
      setConnectionStatus("connected");
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        if (result && typeof result.total !== 'undefined') {
          setStats({
            total: result.total,
            safe: result.safe,
            danger: result.danger,
            confidence: result.confidence,
            boxes: result.boxes || []
          });
        }
      } catch (e) {
        console.error("Error parsing ML result", e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Go Backend API');
      setConnectionStatus("idle");
      wsRef.current = null;
    };
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsDetecting(false);
    setConnectionStatus("idle");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Logic frame
  useEffect(() => {
    if (isDetecting && connectionStatus === "connected") {
      intervalRef.current = window.setInterval(captureFrame, 200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDetecting, connectionStatus]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        wsRef.current.send(frameData);
      }
    }
  };

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const revealFunc = () => {
      const windowHeight = window.innerHeight;
      reveals.forEach((el) => {
        const revealTop = el.getBoundingClientRect().top;
        const revealPoint = 150;
        if (revealTop < windowHeight - revealPoint) {
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.transform = 'translateY(0)';
          el.classList.add('active');
        }
      });
    };
    window.addEventListener('scroll', revealFunc);
    setTimeout(revealFunc, 100);
    return () => window.removeEventListener('scroll', revealFunc);
  }, []);

  return (
    <div className="bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-[#10B981]/30">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-4 md:px-6 py-4 md:py-5 flex justify-between items-center bg-[#050505]/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer z-50">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#10B981] rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            <svg className="h-5 w-5 md:h-6 md:w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter">K3<span className="text-[#10B981]">GUARD</span></span>
        </div>

        <div className="hidden md:flex gap-10 text-sm font-semibold text-gray-400">
          <a className="hover:text-[#10B981] transition-all relative group py-2" href="#features">
            Fitur
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#10B981] transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a className="hover:text-[#10B981] transition-all relative group py-2" href="#model">
            Teknologi
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#10B981] transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a className="hover:text-[#10B981] transition-all relative group py-2" href="#detection" onClick={(e) => {
            e.preventDefault();
            startCamera();
          }}>
            Demo
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#10B981] transition-all duration-300 group-hover:w-full shadow-[0_0_10px_#10B981]"></span>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button onClick={startCamera} className="text-xs px-4 py-2 bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50 rounded-full font-bold">
            Buka Demo
          </button>
        </div>
      </nav>

      {/* HeroSection */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-2/3 md:w-1/2 h-full bg-[#10B981]/10 blur-[100px] md:blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-1/2 md:w-1/3 h-2/3 bg-[#0A84FF]/10 blur-[80px] md:blur-[100px] -z-10"></div>

        <div className="container mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="z-10 animate-[fadeInUp_1s_ease-out_forwards] order-2 lg:order-1 text-center lg:text-left mt-10 lg:mt-0">
            <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold tracking-widest uppercase mb-6 md:mb-8 border border-[#10B981]/30 hover:bg-[#10B981]/20 transition-colors cursor-default">
              <span className="w-2 h-2 bg-[#10B981] rounded-full animate-ping"></span>
              AI-Powered Safety Solutions
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black leading-[1.1] mb-6 md:mb-8 tracking-tight group perspective-1000">
              <div className="inline-block transform transition-transform duration-700 hover:-translate-y-2 hover:rotate-2">Deteksi</div> <div className="inline-block transform transition-transform duration-700 hover:-translate-y-2 hover:-rotate-1">Helm</div> <br className="hidden md:block" />
              <span className="relative inline-block mt-2 md:mt-0">
                <span className="absolute -inset-2 bg-[#10B981]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                <span className="relative bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#0A84FF] bg-[length:200%_auto] animate-gradient-fast bg-clip-text text-transparent transform transition-all duration-500 hover:scale-105 inline-block">K3 Cerdas</span>
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl mb-10 md:mb-12 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Visi komputer tercanggih untuk otomasi kepatuhan keselamatan kerja secara real-time. Amankan operasional Anda dengan <span className="text-[#10B981]">teknologi deteksi instan</span>.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-6 justify-center lg:justify-start">
              <button onClick={startCamera} className="w-full sm:w-auto justify-center px-8 md:px-10 py-4 md:py-5 bg-[#10B981] text-black font-extrabold rounded-2xl animate-[glow-pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite] hover:scale-105 hover:bg-[#34D399] transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.4)] relative overflow-hidden group">
                <span className="absolute inset-0 w-full h-full bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></span>
                <span className="relative uppercase tracking-wider">Mulai Kamera</span>
                <svg className="relative h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
              <a href="#features" className="w-full sm:w-auto justify-center px-8 md:px-10 py-4 md:py-5 bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-2xl font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 group">
                Pelajari
                <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </a>
            </div>
          </div>

          <div className="relative animate-[float_6s_ease-in-out_infinite] order-1 lg:order-2 px-4 md:px-0 mt-8 md:mt-0">
            <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1 md:p-2 bg-white/5 group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#10B981]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="rounded-[1.8rem] md:rounded-[2.5rem] overflow-hidden relative w-full flex justify-center items-center">
                <img alt="Worker with AI detection" className="w-full h-auto max-h-[500px] object-cover md:object-contain object-top transform group-hover:scale-105 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsPG07YlruYl134-CDlI7-D0oDcoY7r--1cjNVTcpw-47UyqfDBkKExCMgEvZNwat4PxBawmbyWlUQI5oCwxmLTytkNWz9OwjO_xnNtfxodYGlFe8WEQPgv0_-Q2JEPm7eRsnutU0ZAm_VxflzGbCZA6vRUHerHz7MLD_21O9xr6Xr8HDshFfVPLRPxY4MxyE_IHraUZ2dcX2H6kdFemMhmoGvBL6SwL5y92RPplG2EOPGkFiws9trfLZv49oVaS2_FDnZHkazFCg" />

                {/* Fixed Bounding Box for Mobile to not cover face */}
                <div className="absolute top-[8%] md:top-[15%] left-[25%] md:left-[35%] w-[50%] md:w-[30%] h-[40%] md:h-[25%] border-[2px] md:border-[3px] border-[#10B981] rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300 group-hover:border-[#34D399] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.8)]">
                  <span className="absolute -top-6 md:-top-7 left-0 bg-[#10B981] text-black text-[9px] md:text-[11px] px-2 md:px-3 py-1 font-black rounded-lg shadow-lg uppercase tracking-wider whitespace-nowrap">HELMET: 98.4%</span>
                  <div className="absolute inset-0 bg-[#10B981]/5"></div>

                  {/* Crosshairs */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#10B981]"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#10B981]"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#10B981]"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#10B981]"></div>
                </div>

                <div className="absolute h-[2px] md:h-[3px] w-full z-20 shadow-[0_0_15px_#10B981] bg-gradient-to-r from-transparent via-[#10B981] to-transparent animate-[scan_3s_linear_infinite]"></div>
              </div>
            </div>

            <div className="absolute -bottom-6 md:-bottom-8 -left-2 md:-left-8 bg-black/60 backdrop-blur-[20px] rounded-2xl border border-white/10 p-4 md:p-6 flex items-center gap-4 md:gap-5 animate-[float_6s_ease-in-out_infinite] shadow-2xl" style={{ animationDelay: '-3s' }}>
              <div className="bg-[#10B981]/20 rounded-xl md:rounded-2xl p-2 md:p-3 border border-[#10B981]/30">
                <svg className="h-5 w-5 md:h-7 md:w-7 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">Model Latency</p>
                <p className="text-xl md:text-2xl font-black text-white font-mono">24<span className="text-[#10B981] text-sm md:text-lg">ms</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FeaturesSection */}
      <section className="py-20 md:py-32 px-6 relative" id="features">
        <div className="container mx-auto">
          <div className="text-center mb-16 md:mb-24 reveal opacity-0 transform translate-y-10 transition-all duration-800">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6">Inovasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Keselamatan</span></h2>
            <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">Arsitektur cerdas yang menggabungkan kecepatan pemrosesan data dengan akurasi visual tanpa kompromi.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
            {/* Feature 1 */}
            <div className="bg-[#0f0f12]/80 backdrop-blur-[20px] border border-white/5 rounded-3xl p-8 md:p-10 hover:border-[#10B981]/50 hover:bg-[#15151a] hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)] hover:-translate-y-2 transition-all duration-500 reveal opacity-0 transform translate-y-10 group" style={{ transitionDelay: '0.1s' }}>
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#0A84FF]/20 to-[#0A84FF]/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-[#0A84FF]/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <svg className="h-7 w-7 md:h-8 md:w-8 text-[#0A84FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-3 md:mb-4 text-white group-hover:text-[#0A84FF] transition-colors">Monitoring Real-time</h3>
              <p className="text-gray-400 leading-relaxed font-medium text-sm md:text-base">Analisis feed video CCTV secara simultan dari berbagai titik koordinat tanpa hambatan latensi.</p>
            </div>
            {/* Feature 2 (Kuning) */}
            <div className="bg-[#0f0f12]/80 backdrop-blur-[20px] border border-white/5 rounded-3xl p-8 md:p-10 hover:border-[#F59E0B]/50 hover:bg-[#15151a] hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)] hover:-translate-y-2 transition-all duration-500 reveal opacity-0 transform translate-y-10 group" style={{ transitionDelay: '0.2s' }}>
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#F59E0B]/20 to-[#F59E0B]/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-[#F59E0B]/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <svg className="h-7 w-7 md:h-8 md:w-8 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-3 md:mb-4 text-white group-hover:text-[#F59E0B] transition-colors">Alert Otomatis</h3>
              <p className="text-gray-400 leading-relaxed font-medium text-sm md:text-base">Notifikasi pelaporan visual berupa lampu dan warna hijau untuk pekerja yang menggunakan helm, dan warna merah untuk pekerja yang tidak menggunakan helm.</p>
            </div>
            {/* Feature 3 */}
            <div className="bg-[#0f0f12]/80 backdrop-blur-[20px] border border-white/5 rounded-3xl p-8 md:p-10 hover:border-[#10B981]/50 hover:bg-[#15151a] hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)] hover:-translate-y-2 transition-all duration-500 reveal opacity-0 transform translate-y-10 group sm:col-span-2 md:col-span-1" style={{ transitionDelay: '0.3s' }}>
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#34D399]/20 to-[#34D399]/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-[#34D399]/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <svg className="h-7 w-7 md:h-8 md:w-8 text-[#34D399]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-3 md:mb-4 text-white group-hover:text-[#34D399] transition-colors">Akurasi Tinggi</h3>
              <p className="text-gray-400 leading-relaxed font-medium text-sm md:text-base">Model dilatih khusus pada dataset industri berat untuk menekan angka false positive hingga &lt;0.5%.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ModelIntroduction */}
      <section className="py-20 md:py-32 px-6 overflow-hidden bg-gradient-to-b from-[#050505] to-[#0a0a0c]" id="model">
        <div className="container mx-auto">
          <div className="flex flex-col items-center gap-12 md:gap-20">
            {/* Teks ditempatkan di atas dan diposisikan center */}
            <div className="w-full max-w-4xl text-center reveal opacity-0 transform translate-y-10 transition-all duration-1000 px-4 md:px-0">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 md:mb-8 tracking-tight group">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-gray-400 to-gray-600 italic inline-block transform transition-transform duration-500 group-hover:-translate-y-1">The Core:</span> <br className="hidden sm:block" />
                <span className="relative inline-block mt-2">
                  <span className="bg-gradient-to-r from-[#10B981] via-[#0A84FF] to-[#10B981] bg-[length:200%_auto] animate-gradient-fast bg-clip-text text-transparent transform transition-all duration-500 hover:scale-[1.02] inline-block filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">YOLOv8 Engine</span>
                </span>
              </h2>
              <p className="text-gray-400 mb-8 md:mb-10 text-lg md:text-xl leading-relaxed font-medium mt-4">
                Kekuatan utama kami terletak pada <span className="text-white font-bold underline decoration-[#10B981] decoration-4 md:decoration-8 underline-offset-4 md:underline-offset-8 transition-colors hover:text-[#10B981]">Arsitektur YOLOv8</span>, model visi komputer paling progresif saat ini. Kami mengoptimalkan bobot model khusus untuk lingkungan konstruksi dan manufaktur.
              </p>
            </div>

            <div className="w-full max-w-5xl reveal opacity-0 transform translate-y-10 transition-all duration-1000 px-2 md:px-0">
              <div className="relative p-1 bg-gradient-to-br from-[#10B981]/30 to-[#0A84FF]/30 rounded-[2rem] md:rounded-[3rem] group">
                <div className="absolute -inset-4 md:-inset-10 bg-[#10B981]/10 rounded-full blur-[60px] md:blur-[100px] opacity-30 animate-pulse group-hover:opacity-60 transition-opacity duration-700"></div>
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-transparent to-[#050505]/50 rounded-[3rem] z-10 pointer-events-none mix-blend-overlay"></div>
                <img alt="AI Architecture" className="relative rounded-[1.8rem] md:rounded-[2.8rem] w-full shadow-2xl filter brightness-90 group-hover:brightness-110 transition-all duration-700 object-contain max-h-[400px] bg-black" src="/yolov8_architecture_diagram_1773501368254.png" />

                {/* Decorative floating badges */}
                <div className="absolute -left-2 md:-left-8 top-1/4 bg-black/80 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10 shadow-2xl z-20 animate-[float_5s_ease-in-out_infinite]">
                  <div className="text-[10px] text-gray-400 font-mono mb-1">FPS LIMIT</div>
                  <div className="text-xl md:text-2xl font-black text-[#10B981]">120+</div>
                </div>
              </div>
            </div>

            {/* Features List di bawah gambar */}
            <div className="w-full max-w-4xl mx-auto mt-12 md:mt-16 reveal opacity-0 transform translate-y-10 transition-all duration-1000 px-4 md:px-0">
              <ul className="space-y-4 md:space-y-6">
                <li className="flex items-start md:items-center gap-4 md:gap-5 group p-2 md:p-3 rounded-2xl hover:bg-white/5 transition-colors">
                  <span className="shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl group-hover:bg-[#10B981] group-hover:scale-110 transition-all duration-300 shadow-[0_0_0_rgba(16,185,129,0)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-[#10B981] group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                  <span className="text-gray-300 group-hover:text-white transition-colors text-sm sm:text-base md:text-lg font-semibold pt-1 md:pt-0 leading-relaxed">Edge Computing optimized untuk latensi rendah.</span>
                </li>
                <li className="flex items-start md:items-center gap-4 md:gap-5 group p-2 md:p-3 rounded-2xl hover:bg-white/5 transition-colors">
                  <span className="shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl group-hover:bg-[#10B981] group-hover:scale-110 transition-all duration-300 shadow-[0_0_0_rgba(16,185,129,0)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-[#10B981] group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                  <span className="text-gray-300 group-hover:text-white transition-colors text-sm sm:text-base md:text-lg font-semibold pt-1 md:pt-0 leading-relaxed">Support untuk CCTV IP Camera &amp; Mobile Drone feed.</span>
                </li>
                <li className="flex items-start md:items-center gap-4 md:gap-5 group p-2 md:p-3 rounded-2xl hover:bg-white/5 transition-colors">
                  <span className="shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl group-hover:bg-[#10B981] group-hover:scale-110 transition-all duration-300 shadow-[0_0_0_rgba(16,185,129,0)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-[#10B981] group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                  <span className="text-gray-300 group-hover:text-white transition-colors text-sm sm:text-base md:text-lg font-semibold pt-1 md:pt-0 leading-relaxed">Analitik data mingguan untuk laporan kepatuhan K3.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 md:py-20 px-6 border-t border-white/5 bg-[#030303] w-full mt-auto">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-12 mb-12 md:mb-16">
            <div className="max-w-xs md:max-w-sm">
              <p className="text-2xl font-black mb-4">K3<span className="text-[#10B981]">GUARD</span></p>
              <p className="text-gray-500 font-medium text-sm md:text-base">Solusi Keselamatan Kerja Masa Depan. Membangun standar baru dalam proteksi tenaga kerja industri.</p>
            </div>
            <div className="grid grid-cols-2 gap-12 md:gap-20 w-full md:w-auto mt-6 md:mt-0">
              <div className="flex flex-col gap-3 md:gap-4">
                <p className="text-white font-bold mb-1 md:mb-2 text-sm md:text-base">Perusahaan</p>
                <a className="text-gray-500 hover:text-[#10B981] transition-colors font-medium text-sm md:text-base" href="#">Tentang</a>
                <a className="text-gray-500 hover:text-[#10B981] transition-colors font-medium text-sm md:text-base" href="#">Karir</a>
                <a className="text-gray-500 hover:text-[#10B981] transition-colors font-medium text-sm md:text-base" href="#">Kontak</a>
              </div>
              <div className="flex flex-col gap-3 md:gap-4">
                <p className="text-white font-bold mb-1 md:mb-2 text-sm md:text-base">Topik</p>
                <a className="text-gray-500 hover:text-[#10B981] transition-colors font-medium text-sm md:text-base" href="#">Dokumentasi</a>
                <a className="text-gray-500 hover:text-[#10B981] transition-colors font-medium text-sm md:text-base" href="#">API Refs</a>
                <a className="text-gray-500 hover:text-[#10B981] transition-colors font-medium text-sm md:text-base" href="#">Blog</a>
              </div>
            </div>
          </div>
          <div className="pt-6 md:pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 text-center md:text-left">
            <div className="text-gray-600 text-xs md:text-sm font-bold uppercase tracking-widest">
              © 2026 K3Guard AI Tech. All rights reserved.
            </div>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#10B981]/20 hover:text-[#10B981] transition-colors text-gray-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#10B981]/20 hover:text-[#10B981] transition-colors text-gray-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Detection Simulation WebRTC Overlay */}
      <div className={`fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex-col items-center justify-center transition-all duration-700 ${isDetecting ? 'flex opacity-100 pointer-events-auto' : 'hidden opacity-0 pointer-events-none'}`}>
        <button onClick={stopCamera} className="absolute top-6 right-6 md:top-10 md:right-10 px-4 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/50 hover:border-red-500 text-red-500 hover:text-white rounded-full transition-all duration-300 flex items-center gap-2 group z-[110]">
          <span className="font-bold text-sm tracking-wider">TUTUP</span>
          <svg className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div className="text-center mb-6 md:mb-12 mt-16 md:mt-0 px-4 w-full">
          <h2 className="text-2xl md:text-4xl font-black text-[#10B981] mb-2 md:mb-3 tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Kamera Aktif: Analisis AI</h2>
          <p className="text-gray-500 font-bold tracking-widest uppercase text-[10px] md:text-xs">Scanning for PPE compliance...</p>
        </div>

        <div className="relative w-full aspect-video md:aspect-[21/9] lg:aspect-video max-w-5xl mx-auto rounded-2xl md:rounded-[2.5rem] overflow-hidden border-2 border-[#10B981]/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] md:shadow-[0_0_80px_rgba(16,185,129,0.15)] bg-black">
          {/* The Video Element that was missing! */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute top-4 left-4 md:top-8 md:left-8 bg-black/80 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-white/10 text-[10px] md:text-xs text-red-500 font-black flex items-center gap-2 md:gap-3 backdrop-blur-md">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]"></span> REC
          </div>

          <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/80 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-white/10 text-[10px] md:text-xs text-[#10B981] font-black flex items-center gap-2 md:gap-3 backdrop-blur-md">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[#10B981] rounded-full animate-pulse shadow-[0_0_10px_#10B981]"></span> {connectionStatus === "connected" ? "CONNECTED" : "CONNECTING..."}
          </div>

          {/* Dynamic Bounding Boxes */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {stats.boxes?.map((box, idx) => {
              const isSafe = box.label === 'safetyhelmet';
              const colorClass = isSafe ? 'border-[#10B981]' : 'border-red-500';
              const bgClass = isSafe ? 'bg-[#10B981]' : 'bg-red-500';
              const title = isSafe ? 'HELMET' : 'NO HELMET';

              return (
                <div
                  key={idx}
                  className={`absolute border-[2px] md:border-[3px] rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-75 ${colorClass}`}
                  style={{
                    left: `${box.x1 * 100}%`,
                    top: `${box.y1 * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`
                  }}
                >
                  <div className={`text-black flex items-center justify-center text-[8px] md:text-[10px] absolute -top-5 md:-top-6 left-[-2px] px-2 py-0.5 md:py-1 font-black rounded-t-md shadow-lg ${bgClass}`}>
                    CLASS: {title} ({box.confidence.toFixed(2)})
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute h-[2px] md:h-[3px] w-full z-20 shadow-[0_0_15px_#10B981] bg-gradient-to-r from-transparent via-[#10B981] to-transparent animate-[scan_3s_linear_infinite] opacity-60"></div>
        </div>

        <div className="mt-8 md:mt-16 flex flex-row gap-4 md:gap-8 px-4 w-full md:w-auto justify-center">
          <div className="bg-white/5 backdrop-blur-[20px] rounded-xl md:rounded-2xl border border-white/10 p-3 md:px-10 md:py-5 flex flex-col items-center flex-1 md:flex-none">
            <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 text-center">Confidence</span>
            <span className="text-xl md:text-3xl font-black text-[#10B981]">{stats.total > 0 ? stats.confidence.toFixed(1) + '%' : '0%'}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-[20px] rounded-xl md:rounded-2xl border border-white/10 p-3 md:px-10 md:py-5 flex flex-col items-center flex-1 md:flex-none transition-colors duration-500" style={{ backgroundColor: stats.danger > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)' }}>
            <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 text-center">Status</span>
            <span className={`text-xl md:text-3xl font-black ${stats.danger > 0 ? "text-red-500" : "text-white"}`}>{stats.danger > 0 ? 'WARNING!' : 'SECURED'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
