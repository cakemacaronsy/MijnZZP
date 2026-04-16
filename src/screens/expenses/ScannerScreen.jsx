import { useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { analyzeReceipt } from '../../services/receipt-analyzer';
import { uploadReceiptPhoto } from '../../lib/db';
import { genId } from '../../utils/id';
import { ArrowLeft, Camera, Upload, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import '../../components/shared/shared.css';

export default function ScannerScreen() {
  const { saveExpense, user } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Webcam state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Image state
  const [capturedImage, setCapturedImage] = useState(null); // base64 data URL
  const [imageFile, setImageFile] = useState(null);         // File object for upload
  const [imageName, setImageName] = useState('');

  // OCR state
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState('');

  // Saving state
  const [saving, setSaving] = useState(false);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Start webcam
  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      setCameraActive(true);
      // Attach to video element after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 50);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions in your browser.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : `Camera error: ${err.message}`
      );
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setImageName(`webcam-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.jpg`);

    // Convert to File for storage upload
    canvas.toBlob((blob) => {
      if (blob) setImageFile(new File([blob], 'receipt.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.85);

    stopCamera();
  }, [stopCamera]);

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageName(file.name);
    setOcrResult(null);
    setOcrError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Clear captured image
  const clearImage = useCallback(() => {
    setCapturedImage(null);
    setImageFile(null);
    setImageName('');
    setOcrResult(null);
    setOcrError('');
  }, []);

  // Run OCR analysis
  const runOCR = useCallback(async () => {
    if (!capturedImage) return;
    setAnalyzing(true);
    setOcrError('');
    setOcrResult(null);

    try {
      // Extract base64 data (strip data:image/...;base64, prefix)
      const base64Data = capturedImage.replace(/^data:image\/\w+;base64,/, '');
      const result = await analyzeReceipt(base64Data);
      setOcrResult(result);
    } catch (err) {
      console.error('OCR error:', err);
      setOcrError(err.message || 'Failed to analyze receipt');
    } finally {
      setAnalyzing(false);
    }
  }, [capturedImage]);

  // Save expense with OCR data and original image
  const handleSave = useCallback(async () => {
    if (!ocrResult) return;
    setSaving(true);

    try {
      const expenseId = genId();

      // Upload original image to Supabase Storage
      if (imageFile) {
        try {
          await uploadReceiptPhoto(expenseId, imageFile);
        } catch (err) {
          console.warn('Failed to upload receipt photo:', err);
          // Continue saving expense even if photo upload fails
        }
      }

      // Save expense with OCR-extracted data
      await saveExpense({
        id: expenseId,
        category: ocrResult.category || 'other',
        description: ocrResult.description || '',
        amount: ocrResult.amount || 0,
        vatRate: ocrResult.vatRate || 21,
        date: ocrResult.date || new Date().toISOString().slice(0, 10),
        supplier: ocrResult.supplier || '',
        isAsset: false,
      });

      navigate('/expenses');
    } catch (err) {
      console.error('Failed to save:', err);
      setOcrError('Failed to save expense: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [ocrResult, imageFile, saveExpense, navigate]);

  // Navigate to expense form with pre-filled OCR data (for manual editing)
  const handleEditAndSave = useCallback(() => {
    if (!ocrResult) return;
    const params = new URLSearchParams({
      category: ocrResult.category || 'other',
      description: ocrResult.description || '',
      amount: String(ocrResult.amount || 0),
      vatRate: String(ocrResult.vatRate || 21),
      date: ocrResult.date || new Date().toISOString().slice(0, 10),
      supplier: ocrResult.supplier || '',
    });
    navigate(`/expenses/new?${params.toString()}`);
  }, [ocrResult, navigate]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
            <ArrowLeft size={16} />
          </button>
          <h1>{t.scan?.title || 'Receipt Scanner'}</h1>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Step 1: Capture or Upload */}
        {!capturedImage && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>{t.scan?.step1 || 'Capture or Upload Receipt'}</h3>

            {/* Webcam area */}
            {cameraActive ? (
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxHeight: 400,
                    borderRadius: 8,
                    background: '#000',
                    objectFit: 'cover',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={capturePhoto}>
                    <Camera size={16} style={{ marginRight: 6 }} />
                    {t.scan?.capture || 'Capture'}
                  </button>
                  <button className="btn btn-secondary" onClick={stopCamera}>
                    <X size={16} style={{ marginRight: 6 }} />
                    {t.scan?.stopCam || 'Stop Camera'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={startCamera}>
                  <Camera size={16} style={{ marginRight: 6 }} />
                  {t.scan?.openCam || 'Open Camera'}
                </button>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <Upload size={16} style={{ marginRight: 6 }} />
                  {t.scan?.upload || 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}

            {cameraError && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={16} />
                {cameraError}
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Step 2: Preview + Analyze */}
        {capturedImage && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{t.scan?.preview || 'Receipt Preview'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={clearImage}>
                <X size={16} style={{ marginRight: 4 }} />
                {t.scan?.clear || 'Clear'}
              </button>
            </div>

            {/* Image preview */}
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img
                src={capturedImage}
                alt="Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: 350,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                }}
              />
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {imageName}
                {user && <> &middot; {user.email}</>}
                {' '}&middot; {new Date().toLocaleDateString()}
              </div>
            </div>

            {/* Analyze button */}
            {!ocrResult && !analyzing && (
              <button className="btn btn-primary" onClick={runOCR} style={{ width: '100%' }}>
                {t.scan?.analyze || 'Analyze Receipt (OCR)'}
              </button>
            )}

            {/* Loading */}
            {analyzing && (
              <div style={{
                padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)',
              }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 8 }}>{t.scan?.analyzing || 'Analyzing receipt...'}</p>
              </div>
            )}

            {/* OCR Error */}
            {ocrError && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={16} />
                <span>{ocrError}</span>
              </div>
            )}

            {/* OCR Results */}
            {ocrResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                  color: ocrResult._placeholder ? 'var(--color-warning)' : 'var(--color-success)',
                }}>
                  <CheckCircle size={16} />
                  <span style={{ fontWeight: 500 }}>
                    {ocrResult._placeholder
                      ? (t.scan?.placeholder || 'Placeholder data — configure Claude API key in Settings for real OCR')
                      : (t.scan?.success || 'Receipt analyzed successfully')}
                  </span>
                </div>

                <div style={{
                  background: 'var(--color-bg-secondary)', borderRadius: 8,
                  padding: 16, fontSize: 14,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{t.exp?.sup || 'Supplier'}:</span>
                    <span style={{ fontWeight: 500 }}>{ocrResult.supplier}</span>

                    <span style={{ color: 'var(--color-text-secondary)' }}>{t.exp?.desc || 'Description'}:</span>
                    <span>{ocrResult.description}</span>

                    <span style={{ color: 'var(--color-text-secondary)' }}>{t.exp?.amt || 'Amount'}:</span>
                    <span className="mono" style={{ fontWeight: 500 }}>
                      &euro;{(ocrResult.amount || 0).toFixed(2)}
                    </span>

                    <span style={{ color: 'var(--color-text-secondary)' }}>{t.exp?.vat || 'VAT'}:</span>
                    <span>{ocrResult.vatRate}%</span>

                    <span style={{ color: 'var(--color-text-secondary)' }}>{t.exp?.date || 'Date'}:</span>
                    <span>{ocrResult.date}</span>

                    <span style={{ color: 'var(--color-text-secondary)' }}>{t.exp?.cat || 'Category'}:</span>
                    <span>{t.exp?.cats?.[ocrResult.category] || ocrResult.category}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ flex: 1 }}
                  >
                    {saving ? (t.scan?.saving || 'Saving...') : (t.scan?.saveExpense || 'Save Expense')}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleEditAndSave}
                    style={{ flex: 1 }}
                  >
                    {t.scan?.editFirst || 'Edit First'}
                  </button>
                </div>

                <button
                  className="btn btn-ghost"
                  onClick={runOCR}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {t.scan?.reanalyze || 'Re-analyze'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
