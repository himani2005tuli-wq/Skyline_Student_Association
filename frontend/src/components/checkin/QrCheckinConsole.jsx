import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  ScanLine,
  Camera,
  Upload,
  Keyboard,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  FileImage,
  Check,
  Laptop,
  CheckCheck,
} from 'lucide-react';
import { checkinApi } from '@/api';
import { playSuccessSound, playErrorSound } from '@/utils/sound';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { StatusPill, Badge } from '@/components/ui/primitives';

function ResultPanel({ result, onReset }) {
  const map = {
    valid: {
      tone: 'border-success/40 bg-success-soft',
      icon: CheckCircle2,
      color: 'text-success',
      title: 'Welcome in!',
      testid: 'checkin-result-valid',
    },
    already: {
      tone: 'border-warning/40 bg-warning-soft',
      icon: AlertTriangle,
      color: 'text-warning',
      title: 'Already checked in',
      testid: 'checkin-result-already',
    },
    cancelled: {
      tone: 'border-danger/40 bg-danger-soft',
      icon: XCircle,
      color: 'text-danger',
      title: 'Ticket cancelled',
      testid: 'checkin-result-cancelled',
    },
    invalid: {
      tone: 'border-danger/40 bg-danger-soft',
      icon: XCircle,
      color: 'text-danger',
      title: 'Invalid ticket',
      testid: 'checkin-result-invalid',
    },
  }[result?.result || 'invalid'] || {
    tone: 'border-danger/40 bg-danger-soft',
    icon: XCircle,
    color: 'text-danger',
    title: 'Verification Error',
    testid: 'checkin-result-error',
  };

  const Icon = map.icon;
  return (
    <div className={`rounded-2xl border-2 p-6 transition-all animate-in fade-in-50 duration-200 ${map.tone}`} data-testid={map.testid}>
      <div className="flex items-center gap-3">
        <Icon size={28} className={map.color} />
        <div>
          <h3 className={`font-display text-xl font-semibold ${map.color}`}>{map.title}</h3>
          {result.name && (
            <p className="text-sm font-semibold text-ink">
              {result.name} · {result.type || 'Standard Entry'}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-1 text-sm text-ink/70">
        {result.event && (
          <p>
            Event: <b>{result.event}</b>
          </p>
        )}
        {result.checkedInAt && (
          <p>
            Checked in at <b>{result.checkedInAt}</b> — entry logged to attendance ledger.
          </p>
        )}
        {result.result === 'already' && (
          <p>This ticket was scanned previously. Multiple entries with the same pass are restricted.</p>
        )}
        {result.result === 'cancelled' && (
          <p>This booking has been cancelled or refunded. Do not permit entry.</p>
        )}
        {result.result === 'invalid' && (
          <p>Ticket reference could not be found. Check spelling or use attendee lookup below.</p>
        )}
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/45 pt-1">
          Reference verified securely by server database
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-5"
        onClick={onReset}
        data-testid="checkin-reset-button"
      >
        Clear / Ready for Next Scan
      </Button>
    </div>
  );
}

export default function QrCheckinConsole({
  attendees = [],
  eventId = null,
  onCheckinSuccess = null,
  htmlIdPrefix = 'console',
}) {
  const qc = useQueryClient();
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'upload' | 'search' | 'manual'
  const [code, setCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [inspectedQrAttendee, setInspectedQrAttendee] = useState(null);

  const scannerRef = useRef(null);
  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef({ code: '', time: 0 });
  const fileInputRef = useRef(null);
  const containerId = `${htmlIdPrefix}-qr-scanner-region`;
  const fileReaderId = `${htmlIdPrefix}-qr-file-region`;

  // Core scan execution
  const scan = async (rawCode, attendeeName = null) => {
    const value = (rawCode ?? code).trim();
    if (!value) return;
    setBusy(true);

    try {
      const r = await checkinApi.scan(value);
      setResult({ ...r, code: value, name: attendeeName || r.name });

      if (r.result === 'valid') {
        playSuccessSound();
        toast.success(`Verified: ${r.name || attendeeName || 'Guest'}`);
        qc.invalidateQueries({ queryKey: ['attendees'] });
        if (onCheckinSuccess) onCheckinSuccess(r);
      } else if (r.result === 'invalid') {
        playErrorSound();
        toast.error('Invalid ticket — entry denied.');
      } else {
        playErrorSound();
        toast(
          r.result === 'already'
            ? 'Ticket already checked in!'
            : 'Ticket cancelled — entry denied.',
        );
      }

      setHistory((prev) => [
        {
          code: value,
          name: attendeeName || r.name || 'Attendee',
          result: r.result,
          at: new Date().toLocaleTimeString('en-IN'),
        },
        ...prev.slice(0, 15),
      ]);
    } catch (err) {
      playErrorSound();
      toast.error(err.friendly || err.message || 'Check-in validation failed');
    } finally {
      setBusy(false);
      setCode('');
    }
  };

  // ── Laptop Feature: Image File / Screenshot QR Scanner ──
  const handleImageFile = async (file) => {
    if (!file) return;
    setBusy(true);
    toast.loading('Analyzing QR image file on laptop…', { id: 'file-scan' });

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode(fileReaderId, /* verbose= */ false);

      const decodedText = await html5QrCode.scanFile(file, false);
      toast.success('QR Code detected from image!', { id: 'file-scan' });
      await scan(decodedText);
      try {
        html5QrCode.clear();
      } catch {}
    } catch (err) {
      toast.error(
        'Could not detect a readable QR code. Ensure the screenshot is clear and well-lit.',
        { id: 'file-scan' },
      );
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clipboard paste listener (Cmd+V / Ctrl+V image on laptop)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            toast.info('Pasted image from clipboard!');
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // ── Laptop Feature: Webcam & External Camera Scanner ──
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  };

  const startCamera = async (forceCameraId = null) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsCameraStarting(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Stop any existing instance
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch {}
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }

      // Check if container element is mounted in DOM
      const containerEl = document.getElementById(containerId);
      if (!containerEl) {
        console.warn('Container not ready in DOM yet:', containerId);
        setIsCameraStarting(false);
        isStartingRef.current = false;
        return;
      }

      const scanner = new Html5Qrcode(containerId, /* verbose= */ false);
      scannerRef.current = scanner;

      // Query cameras
      const devices = await Html5Qrcode.getCameras().catch(() => []);
      if (devices && devices.length > 0) {
        setCameras(devices);
      }

      const targetCameraId =
        forceCameraId || selectedCameraId || (devices && devices.length > 0 ? devices[0].id : null);
      if (targetCameraId && !selectedCameraId) {
        setSelectedCameraId(targetCameraId);
      }

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(edge * 0.72));
          return { width: size, height: size };
        },
        aspectRatio: 1.333333,
      };

      const onScanSuccess = async (decoded) => {
        const clean = String(decoded || '').trim();
        if (!clean) return;
        const now = Date.now();
        if (lastScannedRef.current.code === clean && now - lastScannedRef.current.time < 3000) {
          return;
        }
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        lastScannedRef.current = { code: clean, time: now };

        await scan(clean);

        setTimeout(() => {
          isProcessingRef.current = false;
        }, 1600);
      };

      let started = false;
      if (targetCameraId) {
        try {
          await scanner.start(targetCameraId, qrConfig, onScanSuccess, () => {});
          started = true;
        } catch (camErr) {
          console.warn('Camera start with device ID failed, trying facingMode:', camErr);
        }
      }

      if (!started) {
        try {
          await scanner.start({ facingMode: 'user' }, qrConfig, onScanSuccess, () => {});
          started = true;
        } catch {
          await scanner.start({ facingMode: 'environment' }, qrConfig, onScanSuccess, () => {});
          started = true;
        }
      }

      setIsCameraActive(true);
      setCameraError(null);
      toast.success('Live camera scanner active! Hold ticket QR code in front of camera.');
    } catch (err) {
      console.error('Camera startup error:', err);
      setIsCameraActive(false);
      setCameraError(err?.message || 'Camera permission denied or camera unavailable');
      toast.error('Unable to open camera feed.', {
        description: 'Check browser camera permissions, or use image upload / search below.',
      });
    } finally {
      setIsCameraStarting(false);
      isStartingRef.current = false;
    }
  };

  // Autostart camera on mount or mode change to 'camera'
  useEffect(() => {
    let isMounted = true;
    if (activeMode === 'camera') {
      const timer = setTimeout(() => {
        if (isMounted) startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [activeMode]);

  // Filter attendees for fast search
  const filteredAttendees = useMemo(() => {
    if (!attendees || attendees.length === 0) return [];
    if (!searchQuery.trim()) return attendees.slice(0, 8); // show first 8 for quick checkin

    const q = searchQuery.toLowerCase().trim();
    return attendees
      .filter((a) => {
        const name = (a.name || '').toLowerCase();
        const ref = (a.ref || a.code || '').toLowerCase();
        const type = (a.type || '').toLowerCase();
        const email = (a.email || '').toLowerCase();
        return name.includes(q) || ref.includes(q) || type.includes(q) || email.includes(q);
      })
      .slice(0, 12);
  }, [attendees, searchQuery]);

  // Statistics
  const validCount = history.filter((h) => h.result === 'valid').length;
  const rejectedCount = history.filter((h) => h.result !== 'valid').length;

  return (
    <div className="space-y-6" data-testid="qr-checkin-console">
      {/* Hidden container for file scanning */}
      <div id={fileReaderId} className="hidden" aria-hidden="true" />

      {/* Mode Switcher Banner tailored for Laptops */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper-card p-2 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveMode('camera')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeMode === 'camera'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-ink/65 hover:bg-ink/[0.06] hover:text-ink'
            }`}
            data-testid="mode-tab-camera"
          >
            <Camera size={14} />
            <span>Webcam / Live Scanner</span>
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent-dark font-semibold">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveMode('search')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeMode === 'search'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-ink/65 hover:bg-ink/[0.06] hover:text-ink'
            }`}
            data-testid="mode-tab-search"
          >
            <Search size={14} />
            <span>1-Click Search Check-In</span>
          </button>

          <button
            onClick={() => setActiveMode('upload')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeMode === 'upload'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-ink/65 hover:bg-ink/[0.06] hover:text-ink'
            }`}
            data-testid="mode-tab-upload"
          >
            <Upload size={14} />
            <span>Upload / Paste QR Image</span>
          </button>

          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeMode === 'manual'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-ink/65 hover:bg-ink/[0.06] hover:text-ink'
            }`}
            data-testid="mode-tab-manual"
          >
            <Keyboard size={14} />
            <span>Barcode Gun / Code Entry</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-xs font-mono text-ink/50">
          <Laptop size={14} />
          <span>Optimized for Laptops</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Scanner Section */}
        <div className="space-y-5 lg:col-span-7">
          <Card className="p-6 sm:p-7" data-testid="scanner-card">
            {/* ── MODE 1: FILE / SCREENSHOT DRAG & DROP OR PASTE ── */}
            {activeMode === 'upload' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer?.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? 'border-accent bg-accent/10 scale-[0.99]'
                      : 'border-ink/20 bg-ink/[0.02] hover:border-accent/60 hover:bg-ink/[0.04]'
                  }`}
                  data-testid="qr-dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper shadow-sm group-hover:scale-105 transition-transform">
                    <FileImage size={32} className="text-accent-dark" />
                  </div>

                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                    Drop Ticket QR Screenshot or Photo Here
                  </h3>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink/55">
                    Click to browse an image file, or drag & drop a screenshot directly onto this box.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-[11px] font-mono text-ink/70">
                    <kbd className="rounded bg-ink/10 px-1 py-0.5 text-[10px] font-bold">Ctrl+V</kbd>
                    <span>/</span>
                    <kbd className="rounded bg-ink/10 px-1 py-0.5 text-[10px] font-bold">Cmd+V</kbd>
                    <span>Paste image from clipboard works automatically!</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-ink/50 pt-1">
                  <span>Supported: PNG, JPG, WEBP, SVG, HEIC</span>
                  <span className="font-semibold text-accent-dark">Instant decoding</span>
                </div>
              </div>
            )}

            {/* ── MODE 2: FAST ATTENDEE SEARCH & 1-CLICK CHECK-IN ── */}
            {activeMode === 'search' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by attendee name, email, or booking reference…"
                    className="h-11 w-full rounded-2xl border border-ink/20 bg-white pl-10 pr-4 text-sm font-medium text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    autoFocus
                    data-testid="search-attendee-input"
                  />
                </div>

                <div className="mt-2 divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-white overflow-hidden">
                  {filteredAttendees.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink/50">
                      No attendee matches "{searchQuery}". Try searching by reference code or last name.
                    </div>
                  ) : (
                    filteredAttendees.map((a) => {
                      const isUsed = a.status === 'checked_in' || a.status === 'USED';
                      return (
                        <div
                          key={a.ref || a.id}
                          className="flex items-center justify-between p-3.5 hover:bg-ink/[0.02] transition"
                          data-testid={`attendee-search-row-${a.ref}`}
                        >
                          <div className="min-w-0 pr-3">
                            <p className="truncate text-sm font-bold text-ink">{a.name}</p>
                            <p className="font-mono text-xs text-ink/50">
                              Ref: <b className="text-ink">{a.ref || a.code}</b> · {a.type}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isUsed ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.07] px-3 py-1 font-mono text-[11px] font-semibold text-ink/60">
                                <CheckCheck size={12} className="text-success" /> Already In
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                loading={busy}
                                onClick={() => scan(a.ref || a.code, a.name)}
                                icon={Check}
                                data-testid={`instant-checkin-btn-${a.ref}`}
                              >
                                Check In
                              </Button>
                            )}

                            <button
                              onClick={() => setInspectedQrAttendee(a)}
                              className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink transition"
                              title="Show QR Code on screen"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="text-[11px] text-ink/50 text-center font-mono">
                  Showing matches from {attendees.length} total event ticket holders
                </p>
              </div>
            )}

            {/* ── MODE 3: WEBCAM SCANNER ── */}
            {activeMode === 'camera' && (
              <div className="space-y-4">
                <style>{`
                  @keyframes scanLaser {
                    0% { top: 15%; opacity: 0.2; }
                    50% { top: 82%; opacity: 1; }
                    100% { top: 15%; opacity: 0.2; }
                  }
                  #${containerId} video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 1.25rem;
                  }
                `}</style>
                <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border-2 border-ink/15 bg-black shadow-lg">
                  {/* Dedicated html5-qrcode container with no React child nodes */}
                  <div
                    id={containerId}
                    className={`h-full w-full ${isMirrored ? '[&_video]:scale-x-[-1]' : ''} [&_canvas]:hidden`}
                    data-testid="qr-reader-region"
                  />

                  {/* Target Crosshairs and Animated Laser when camera is active */}
                  {isCameraActive && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative h-56 w-56 rounded-2xl border-2 border-accent/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]">
                        {/* Corner Accents */}
                        <span className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-accent rounded-tl-lg" />
                        <span className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-accent rounded-tr-lg" />
                        <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-accent rounded-bl-lg" />
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-accent rounded-br-lg" />
                        {/* Animated Laser line */}
                        <div
                          className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_12px_#F97316]"
                          style={{
                            animation: 'scanLaser 2.2s ease-in-out infinite',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Idle / Loading / Error Overlay */}
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/95 p-6 text-center text-ink/70 backdrop-blur-xs">
                      <ScanLine size={48} className="mx-auto text-accent animate-pulse" />
                      <p className="mt-3 text-sm font-bold text-ink">
                        {isCameraStarting ? 'Connecting to Camera Feed…' : cameraError ? 'Camera Access Needed' : 'Camera Scanner Ready'}
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-ink/50">
                        {cameraError || 'Click Start Camera below to activate your webcam.'}
                      </p>
                      <Button
                        onClick={() => startCamera()}
                        loading={isCameraStarting}
                        loadingText="Starting camera…"
                        size="sm"
                        icon={Camera}
                        className="mt-4"
                        data-testid="camera-start-overlay-btn"
                      >
                        {cameraError ? 'Retry Camera' : 'Turn On Camera'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Camera options bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {cameras.length > 1 && (
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={14} className="text-ink/40" />
                        <select
                          value={selectedCameraId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setSelectedCameraId(newId);
                            stopCamera().then(() => startCamera(newId));
                          }}
                          className="rounded-xl border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                        >
                          {cameras.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label || `Camera ${c.id.slice(0, 5)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-ink/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMirrored}
                      onChange={(e) => setIsMirrored(e.target.checked)}
                      className="rounded accent-accent"
                    />
                    <span>Flip / Mirror View</span>
                  </label>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  {!isCameraActive ? (
                    <Button onClick={() => startCamera()} icon={Camera} data-testid="camera-scan-button">
                      Start Camera Scan
                    </Button>
                  ) : (
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      icon={RefreshCw}
                      data-testid="camera-stop-button"
                    >
                      Stop Camera
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── MODE 4: MANUAL LOOKUP & BARCODE GUN ── */}
            {activeMode === 'manual' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink/10 bg-accent-soft/40 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-ink">
                    <Keyboard size={15} className="text-accent-dark" />
                    Handheld Barcode Reader & Keyboard Override
                  </p>
                  <p className="mt-1 text-xs text-ink/65">
                    Connect any standard USB/Bluetooth handheld barcode gun. When you scan a ticket, it automatically types into this field and validates upon pressing Enter.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        scan();
                      }
                    }}
                    placeholder="Enter booking reference (e.g. SG-2026-0042)"
                    aria-label="Booking reference"
                    autoFocus
                    data-testid="manual-code-input"
                  />
                  <Button
                    onClick={() => scan()}
                    loading={busy}
                    loadingText="Verifying…"
                    flash={false}
                    className="whitespace-nowrap"
                    data-testid="manual-checkin-button"
                  >
                    Check In
                  </Button>
                </div>
              </div>
            )}

            {/* Simulation / Quick Test Strip for Laptops */}
            <div className="mt-6 border-t border-ink/8 pt-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink/45">
                  <Sparkles size={12} className="text-accent" /> Laptop Quick Test Simulation
                </span>
                <span className="text-[11px] text-ink/45">Click to test check-in without scanning</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {attendees.slice(0, 3).map((a) => (
                  <button
                    key={a.ref || a.id}
                    onClick={() => scan(a.ref || a.code, a.name)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent hover:bg-accent-soft transition"
                    data-testid={`simulate-scan-${a.ref}`}
                  >
                    <span>⚡ Test: {a.name?.split(' ')?.[0] || 'Attendee'}</span>
                    <span className="font-mono text-[10px] text-ink/40">({a.ref || a.code})</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Verification Result Card */}
          {result && <ResultPanel result={result} onReset={() => setResult(null)} />}
        </div>

        {/* Right Column: Session Summary + Real-time History */}
        <div className="space-y-5 lg:col-span-5">
          <Card className="p-6" data-testid="checkin-summary-card">
            <h2 className="font-display text-xl font-semibold text-ink">Session Summary</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-ink/[0.04] py-3.5">
                <p className="font-mono text-2xl font-bold text-ink">{history.length}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink/45">Processed</p>
              </div>
              <div className="rounded-xl bg-success-soft py-3.5 text-success">
                <p className="font-mono text-2xl font-bold">{validCount}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider">Valid Entries</p>
              </div>
              <div className="rounded-xl bg-danger-soft py-3.5 text-danger">
                <p className="font-mono text-2xl font-bold">{rejectedCount}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider">Rejected</p>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="checkin-history-card">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
              <History size={16} /> Live Scan History
            </h2>
            {history.length === 0 ? (
              <p className="mt-4 text-xs text-ink/45">
                No tickets scanned in this session yet. Upload a QR screenshot or select an attendee above.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-ink/6 max-h-80 overflow-y-auto pr-1">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 text-sm"
                    data-testid={`checkin-history-${i}`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-mono text-xs font-bold text-ink truncate">{h.code}</p>
                      <p className="text-xs text-ink/50 truncate">
                        {h.name} · {h.at}
                      </p>
                    </div>
                    <StatusPill status={h.result === 'valid' ? 'checked_in' : h.result} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: View QR Code on Screen */}
      {inspectedQrAttendee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-50"
          onClick={() => setInspectedQrAttendee(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-paper p-6 text-center shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold text-ink">
              {inspectedQrAttendee.name}'s QR Ticket
            </h3>
            <p className="mt-1 font-mono text-xs text-ink/50">
              Ref: {inspectedQrAttendee.ref || inspectedQrAttendee.code} · {inspectedQrAttendee.type}
            </p>

            <div className="my-6 mx-auto flex w-fit rounded-2xl bg-white p-5 shadow-card border border-ink/10">
              <QRCodeSVG
                value={inspectedQrAttendee.ref || inspectedQrAttendee.code}
                size={180}
                fgColor="#0B0E17"
                bgColor="#FFFFFF"
              />
            </div>

            <p className="text-xs text-ink/60 mb-6">
              Hold a camera or barcode reader to this screen, or click Check In below to mark entry directly.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setInspectedQrAttendee(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  scan(inspectedQrAttendee.ref || inspectedQrAttendee.code, inspectedQrAttendee.name);
                  setInspectedQrAttendee(null);
                }}
              >
                Check In Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
