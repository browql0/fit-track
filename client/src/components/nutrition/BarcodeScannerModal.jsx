import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, CheckCircle2, Info, Keyboard, Search, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { foodService } from '../../services/foodService';
import { queryKeys } from '../../services/queryClient';
import { getErrorMessage } from '../../utils/errors';
import { useScanner } from '../../context/scannerContext';
import './BarcodeScannerModal.css';

const mealTypes = [
  { id: 'breakfast', label: 'Petit-dejeuner' },
  { id: 'lunch', label: 'Dejeuner' },
  { id: 'dinner', label: 'Diner' },
  { id: 'snack', label: 'Snack' },
];

const normalizeBarcode = (value) => String(value || '').trim().replace(/\D/g, '');

export const BarcodeScannerModal = () => {
  const queryClient = useQueryClient();
  const { scannerOpen, closeScanner, selectedMealType, selectedDate, onProductAdded } = useScanner();
  const rawId = useId();
  const scannerId = useMemo(() => `fittrack-global-barcode-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const scannerRef = useRef(null);
  const lockedRef = useRef(false);
  const [status, setStatus] = useState('ready');
  const [message, setMessage] = useState('Place le code-barres dans le cadre.');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState(selectedMealType || 'lunch');
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);

  const invalidateViews = useCallback((date) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(date) });
    queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    queryClient.invalidateQueries({ queryKey: ['food-entries'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    queryClient.invalidateQueries({ queryKey: queryKeys.coach });
  }, [queryClient]);

  const addEntryMutation = useMutation({
    mutationFn: foodService.addFoodEntry,
    onSuccess: (_data, variables) => invalidateViews(variables.entryDate),
  });

  const resetScannerState = useCallback(() => {
    lockedRef.current = false;
    setStatus('ready');
    setMessage('Place le code-barres dans le cadre.');
    setSelectedFood(null);
    setQuantity(100);
    setManualBarcode('');
    setManualOpen(false);
    setMealType(selectedMealType || 'lunch');
  }, [selectedMealType]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Fast modal closes can race with camera startup.
    }
    try {
      await scanner.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
  }, []);

  const resolveBarcode = useCallback(async (barcodeValue) => {
    const barcode = normalizeBarcode(barcodeValue);
    if (!barcode || barcode.length < 6) {
      setStatus('missing');
      setMessage('Code-barres invalide.');
      return;
    }

    if (lockedRef.current) return;
    lockedRef.current = true;
    window.navigator.vibrate?.(70);
    setStatus('searching');
    setMessage('Recherche du produit...');
    await stopScanner();

    try {
      const food = await foodService.getFoodByBarcode(barcode);
      setSelectedFood(food);
      setStatus('found');
      setMessage('Produit trouve');
      window.navigator.vibrate?.([40, 40, 80]);
    } catch (err) {
      const code = err.response?.data?.code;
      setStatus('missing');
      setMessage(code === 'PRODUCT_NOT_FOUND' ? 'Produit introuvable' : getErrorMessage(err, 'Recherche indisponible.'));
      lockedRef.current = false;
    }
  }, [stopScanner]);

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return undefined;
    }

    let cancelled = false;
    window.setTimeout(() => {
      if (!cancelled) resetScannerState();
    }, 0);
    const cameraSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

    if (!cameraSupported) {
      window.setTimeout(() => {
        if (!cancelled) {
          setStatus('error');
          setMessage('Autorise l acces a la camera pour scanner un produit. En Safari/PWA, ouvre FitTrack en HTTPS.');
          setManualOpen(true);
        }
      }, 0);
      return undefined;
    }

    const scanner = new Html5Qrcode(scannerId, { verbose: false });
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 170 }, aspectRatio: 1.777 },
      (decodedText) => {
        if (!cancelled) resolveBarcode(decodedText);
      },
      () => {}
    ).catch((err) => {
      if (cancelled) return;
      const denied = err?.name === 'NotAllowedError' || String(err || '').toLowerCase().includes('permission');
      setStatus('error');
      setMessage(denied ? 'Autorise l acces a la camera pour scanner un produit.' : 'Camera indisponible. Tu peux entrer le code manuellement.');
      setManualOpen(true);
    });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scannerOpen, resetScannerState, resolveBarcode, scannerId, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    closeScanner();
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    resolveBarcode(manualBarcode);
  };

  const handleAddEntry = async (event) => {
    event.preventDefault();
    if (!selectedFood) return;
    await addEntryMutation.mutateAsync({
      foodId: selectedFood.id,
      quantityG: Number(quantity),
      mealType,
      entryDate: selectedDate,
    });
    onProductAdded?.(selectedFood);
    await handleClose();
  };

  return (
    <Modal isOpen={scannerOpen} onClose={handleClose} title="Scanner produit" className="modal-content--scanner barcode-modal" overlayClassName="barcode-overlay">
      {!selectedFood ? (
        <div className="barcode-scanner">
          <div className={`barcode-stage ${status}`}>
            <div id={scannerId} className="barcode-reader" />
            <div className="barcode-frame" aria-hidden="true"><span /></div>
          </div>

          <div className="barcode-status">
            {status === 'found' ? <CheckCircle2 size={18} /> : status === 'missing' || status === 'error' ? <AlertTriangle size={18} /> : status === 'searching' ? <span className="spinner" /> : <Camera size={18} />}
            <span>{message}</span>
          </div>

          <button type="button" className="barcode-manual-toggle" onClick={() => setManualOpen((value) => !value)}>
            {manualOpen ? <X size={18} /> : <Keyboard size={18} />}
            {manualOpen ? 'Masquer la saisie' : 'Entrer le code-barres manuellement'}
          </button>

          {manualOpen && (
            <form className="barcode-manual-form" onSubmit={handleManualSubmit}>
              <Input label="Code-barres" value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} inputMode="numeric" placeholder="Ex: 3017620422003" />
              <button type="submit" className="barcode-primary" disabled={status === 'searching'}>
                {status === 'searching' ? 'Recherche...' : <><Search size={18} /> Rechercher</>}
              </button>
            </form>
          )}
        </div>
      ) : (
        <form className="barcode-product" onSubmit={handleAddEntry}>
          <div className={`barcode-product-card ${selectedFood.imageUrl ? 'with-image' : ''}`}>
            {selectedFood.imageUrl ? <img src={selectedFood.imageUrl} alt="" /> : <div className="barcode-product-icon"><Info size={24} /></div>}
            <div>
              <strong>{selectedFood.name}</strong>
              {selectedFood.brand && <span>{selectedFood.brand}</span>}
              <small>{selectedFood.caloriesPer100g} kcal / 100g</small>
            </div>
          </div>

          <div className="barcode-macros">
            <span>P {selectedFood.proteinPer100g}g</span>
            <span>G {selectedFood.carbsPer100g}g</span>
            <span>L {selectedFood.fatPer100g}g</span>
          </div>

          <div className="barcode-quantity">
            {[50, 100].map((value) => (
              <button key={value} type="button" className={Number(quantity) === value ? 'active' : ''} onClick={() => setQuantity(value)}>
                {value}g
              </button>
            ))}
            <button type="button" className={![50, 100].includes(Number(quantity)) ? 'active' : ''}>
              Portion perso
            </button>
          </div>

          <Input label="Quantite (g)" type="number" min="1" max="2000" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          <select className="barcode-select" value={mealType} onChange={(event) => setMealType(event.target.value)}>
            {mealTypes.map((meal) => <option key={meal.id} value={meal.id}>{meal.label}</option>)}
          </select>
          <button type="submit" className="barcode-primary" disabled={addEntryMutation.isPending}>
            {addEntryMutation.isPending ? 'Ajout...' : 'Ajouter au journal'}
          </button>
        </form>
      )}
    </Modal>
  );
};
