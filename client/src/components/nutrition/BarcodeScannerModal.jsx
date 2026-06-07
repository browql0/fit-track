import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertTriangle, Camera, CheckCircle2, Info, Keyboard, PencilLine, Search, X } from 'lucide-react';
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

const barcodeFormatsToSupport = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
];

const formatNumber = (value, suffix = 'g') => {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const formatted = Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
  return `${formatted}${suffix}`;
};

const formatCalories = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)} kcal` : '--';
};

const getNutriScoreClass = (value) => {
  const grade = String(value || '').toLowerCase();
  return ['a', 'b', 'c', 'd', 'e'].includes(grade) ? grade : 'unknown';
};

const getNutritionMessages = (food) => {
  const messages = [];
  const protein = Number(food?.proteinPer100g);
  const sugars = Number(food?.sugarsPer100g);
  const fat = Number(food?.fatPer100g);
  const nutriScore = String(food?.nutriScore || '').toUpperCase();

  if (Number.isFinite(protein) && protein >= 10) messages.push('Bon apport en protéines');
  if (Number.isFinite(sugars) && sugars >= 15) messages.push('Attention, produit sucré');
  if (Number.isFinite(fat) && fat >= 17.5) messages.push('Produit riche en lipides');
  if (['A', 'B'].includes(nutriScore)) messages.push('Bon choix global');
  if (['D', 'E'].includes(nutriScore)) messages.push('À consommer occasionnellement');

  return messages;
};

const playConfirmationTone = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
    window.setTimeout(() => context.close?.(), 220);
  } catch {
    // Audio feedback is optional.
  }
};

const getCameraUnavailableMessage = () => {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'La camera est bloquee car FitTrack est ouvert en HTTP. Sur iPhone Safari/PWA, la permission camera apparait seulement en HTTPS. Utilise une URL HTTPS ou entre le code manuellement.';
  }

  return 'Camera indisponible. Tu peux entrer le code-barres manuellement.';
};

const getCameraDeniedMessage = () => {
  return 'Autorise l acces a la camera dans les reglages Safari ou de la PWA FitTrack, puis rouvre le scanner.';
};

export const BarcodeScannerModal = () => {
  const queryClient = useQueryClient();
  const { scannerOpen, closeScanner, selectedMealType, selectedDate, onProductAdded } = useScanner();
  const rawId = useId();
  const scannerId = useMemo(() => `fittrack-global-barcode-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
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
    isProcessingRef.current = false;
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

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    console.info('[barcode-scanner] code detecte', barcode);
    window.navigator.vibrate?.(70);
    playConfirmationTone();
    setStatus('searching');
    setMessage('Recherche du produit...');
    await stopScanner();

    try {
      console.info('[barcode-scanner] appel API lance', barcode);
      const food = await foodService.getFoodByBarcode(barcode);
      console.info('[barcode-scanner] reponse API recue', food);
      setSelectedFood(food);
      setStatus('found');
      setMessage('Produit trouve');
      window.navigator.vibrate?.([40, 40, 80]);
    } catch (err) {
      const code = err.response?.data?.code;
      setStatus('missing');
      setMessage(code === 'PRODUCT_NOT_FOUND' ? 'Produit non trouvé dans la base alimentaire' : getErrorMessage(err, 'Recherche indisponible.'));
      isProcessingRef.current = false;
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
          setMessage(getCameraUnavailableMessage());
          setManualOpen(true);
        }
      }, 0);
      return undefined;
    }

    const scanner = new Html5Qrcode(scannerId, {
      formatsToSupport: barcodeFormatsToSupport,
      verbose: false,
    });
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: 250 },
      (decodedText) => {
        console.info('[barcode-scanner] onScanSuccess appele');
        if (!cancelled) resolveBarcode(decodedText);
      },
      () => {}
    ).then(() => {
      if (!cancelled) console.info('[barcode-scanner] scanner demarre');
    }).catch((err) => {
      if (cancelled) return;
      const denied = err?.name === 'NotAllowedError' || String(err || '').toLowerCase().includes('permission');
      setStatus('error');
      setMessage(denied ? getCameraDeniedMessage() : getCameraUnavailableMessage());
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

  const nutritionRows = selectedFood ? [
    ['Calories', formatCalories(selectedFood.caloriesPer100g)],
    ['Protéines', formatNumber(selectedFood.proteinPer100g)],
    ['Glucides', formatNumber(selectedFood.carbsPer100g)],
    ['Sucres', formatNumber(selectedFood.sugarsPer100g)],
    ['Lipides', formatNumber(selectedFood.fatPer100g)],
    ['Acides gras saturés', formatNumber(selectedFood.saturatedFatPer100g)],
    ['Fibres', formatNumber(selectedFood.fiberPer100g)],
    ['Sel', formatNumber(selectedFood.saltPer100g)],
    ['Sodium', formatNumber(selectedFood.sodiumPer100g)],
  ] : [];
  const nutritionMessages = selectedFood ? getNutritionMessages(selectedFood) : [];
  const nutriScoreClass = getNutriScoreClass(selectedFood?.nutriScore);

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
            {manualOpen ? 'Masquer la saisie' : 'Saisir le code-barres manuellement'}
          </button>

          {status === 'missing' && (
            <div className="barcode-missing-actions">
              <div>
                <strong>Produit non trouvé dans la base alimentaire</strong>
                <span>Tu peux créer un aliment personnalisé ou saisir les valeurs nutritionnelles manuellement.</span>
              </div>
              <button type="button" onClick={handleClose}><PencilLine size={17} /> Créer un aliment personnalisé</button>
            </div>
          )}

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
            <div className="barcode-product-copy">
              <strong>{selectedFood.name}</strong>
              {selectedFood.brand && <span>{selectedFood.brand}</span>}
              <div className={`barcode-nutriscore ${nutriScoreClass}`}>
                Nutri-Score <b>{selectedFood.nutriScore || '--'}</b>
              </div>
            </div>
          </div>

          <div className="barcode-macros">
            <span><b>{formatCalories(selectedFood.caloriesPer100g)}</b><small>/ 100g</small></span>
            <span><b>{formatNumber(selectedFood.proteinPer100g)}</b><small>Protéines</small></span>
            <span><b>{formatNumber(selectedFood.carbsPer100g)}</b><small>Glucides</small></span>
            <span><b>{formatNumber(selectedFood.fatPer100g)}</b><small>Lipides</small></span>
            <span><b>{formatNumber(selectedFood.sugarsPer100g)}</b><small>Sucres</small></span>
          </div>

          <div className="barcode-nutrition-table" role="table" aria-label="Tableau nutritionnel">
            <div className="barcode-nutrition-row head" role="row">
              <span role="columnheader">Nutriment</span>
              <span role="columnheader">Pour 100g</span>
            </div>
            {nutritionRows.map(([label, value]) => (
              <div key={label} className="barcode-nutrition-row" role="row">
                <span role="cell">{label}</span>
                <strong role="cell">{value}</strong>
              </div>
            ))}
          </div>

          {nutritionMessages.length > 0 && (
            <div className="barcode-insights">
              {nutritionMessages.map((item) => <span key={item}>{item}</span>)}
            </div>
          )}

          <div className="barcode-log-section">
            <span className="barcode-section-label">Ajout au journal</span>
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
          </div>
        </form>
      )}
    </Modal>
  );
};
