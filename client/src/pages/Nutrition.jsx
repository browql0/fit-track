import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Apple, Barcode, BookOpen, ChevronRight, Coffee, Droplets, Globe2, Info, Moon, PencilLine, Plus, Search, Sparkles, Sun, Trash2, UtensilsCrossed, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { foodService } from '../services/foodService';
import { profileService } from '../services/profileService';
import { hydrationService } from '../services/hydrationService';
import { queryKeys } from '../services/queryClient';
import { getErrorMessage } from '../utils/errors';
import { useScanner } from '../context/scannerContext';
import './Nutrition.css';

const mealTypes = [
  { id: 'breakfast', label: 'Petit-dejeuner', icon: Coffee, color: 'lime' },
  { id: 'lunch', label: 'Dejeuner', icon: Sun, color: 'aqua' },
  { id: 'dinner', label: 'Diner', icon: Moon, color: 'violet' },
  { id: 'snack', label: 'Snack', icon: Apple, color: 'coral' },
];

const emptyDraft = {
  name: '',
  caloriesPer100g: 0,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 0,
  category: 'other',
};

const pct = (value, max) => (max ? Math.min(100, Math.round((Number(value || 0) / max) * 100)) : 0);
const foodTabs = [
  { id: 'search', label: 'Recherche' },
  { id: 'scanner', label: 'Scanner' },
  { id: 'recent', label: 'Recents' },
  { id: 'favorites', label: 'Favoris' },
  { id: 'manual', label: 'Creer' },
];

export const Nutrition = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openScanner } = useScanner();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingWater, setSavingWater] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState('lunch');
  const [submitting, setSubmitting] = useState(false);
  const [assistMode, setAssistMode] = useState('search');
  const [assistantError, setAssistantError] = useState('');
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalResults, setExternalResults] = useState([]);
  const [estimateDescription, setEstimateDescription] = useState('');
  const [draftFood, setDraftFood] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const nutritionQuery = useQuery({
    queryKey: queryKeys.nutrition(date),
    queryFn: async () => {
      const [entriesData, summaryData, profileData, hydrationData] = await Promise.all([
        foodService.getFoodEntries(date),
        foodService.getDailySummary(date).catch(() => ({ calories: 0, protein: 0, carbs: 0, fat: 0 })),
        profileService.getProfile().catch(() => null),
        hydrationService.getSummary(date).catch(() => ({ totalMl: 0, targetMl: 2500, progress: 0 })),
      ]);
      return { entries: entriesData || [], summary: summaryData, profile: profileData, hydration: hydrationData };
    },
  });
  const entries = useMemo(() => nutritionQuery.data?.entries || [], [nutritionQuery.data?.entries]);
  const summary = nutritionQuery.data?.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const hydrationSummary = nutritionQuery.data?.hydration || { totalMl: 0, targetMl: 2500, progress: 0 };
  const targets = nutritionQuery.data?.profile?.targets ? {
    calories: nutritionQuery.data.profile.targets.targetCalories,
    protein: nutritionQuery.data.profile.targets.targetProtein,
    carbs: nutritionQuery.data.profile.targets.targetCarbs,
    fat: nutritionQuery.data.profile.targets.targetFat,
  } : { calories: 2200, protein: 145, carbs: 240, fat: 72 };

  const invalidateNutritionViews = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(date) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    queryClient.invalidateQueries({ queryKey: queryKeys.coach });
  };

  const addEntryMutation = useMutation({ mutationFn: foodService.addFoodEntry, onSuccess: invalidateNutritionViews });
  const deleteEntryMutation = useMutation({ mutationFn: foodService.deleteFoodEntry, onSuccess: invalidateNutritionViews });
  const addWaterMutation = useMutation({ mutationFn: hydrationService.addEntry, onSuccess: invalidateNutritionViews });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 1) {
        setSearchResults([]);
        return;
      }
      try {
        setSearchResults(await foodService.searchFoods(searchQuery));
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const grouped = useMemo(() => Object.fromEntries(mealTypes.map((meal) => [meal.id, entries.filter((entry) => entry.mealType === meal.id)])), [entries]);

  const resetAssistant = () => {
    setSelectedFood(null);
    setSearchResults([]);
    setSearchQuery('');
    setAssistMode('search');
    setAssistantError('');
    setExternalResults([]);
    setEstimateDescription('');
    setDraftFood(null);
    setQuantity(100);
    setActiveTab('search');
  };

  const openAdd = (meal = 'lunch', tab = 'search') => {
    setMealType(meal);
    setActiveTab(tab);
    setIsModalOpen(true);
  };

  const handleAddEntry = async (event) => {
    event.preventDefault();
    if (!selectedFood) return;
    setSubmitting(true);
    try {
      await addEntryMutation.mutateAsync({
        foodId: selectedFood.id,
        quantityG: parseInt(quantity, 10),
        mealType,
        entryDate: date,
      });
      setIsModalOpen(false);
      resetAssistant();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible d ajouter cet aliment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteEntryMutation.mutateAsync(id);
  };

  const handleAddWater = async (amountMl) => {
    setSavingWater(true);
    try {
      await addWaterMutation.mutateAsync({ amountMl, entryDate: date });
    } catch {
      // ignore
    } finally {
      setSavingWater(false);
    }
  };

  const runExternalSearch = async () => {
    setAssistMode('external');
    setAssistantError('');
    setExternalLoading(true);
    try {
      const foods = await foodService.externalSearch(searchQuery);
      setExternalResults(foods || []);
      if (!foods?.length) {
        setAssistantError('Aucun produit fiable trouve en ligne. Essaie une estimation ou une creation manuelle.');
      }
    } catch {
      setAssistantError('Recherche en ligne indisponible. Tu peux utiliser l estimation ou la creation manuelle.');
    } finally {
      setExternalLoading(false);
    }
  };

  const runEstimate = async (event) => {
    event.preventDefault();
    setAssistantError('');
    setSubmitting(true);
    try {
      const estimate = await foodService.estimateFood(estimateDescription || searchQuery);
      setDraftFood(estimate);
      setQuantity(estimate.suggestedQuantityG || 100);
    } catch (err) {
      setAssistantError(getErrorMessage(err, 'Impossible de generer une estimation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraftFood = async (event) => {
    event.preventDefault();
    if (!draftFood) return;
    setSubmitting(true);
    setAssistantError('');
    try {
      const created = await foodService.createCustomFood({
        name: draftFood.name,
        caloriesPer100g: Number(draftFood.caloriesPer100g),
        proteinPer100g: Number(draftFood.proteinPer100g),
        carbsPer100g: Number(draftFood.carbsPer100g),
        fatPer100g: Number(draftFood.fatPer100g),
        category: draftFood.category || 'other',
      });
      // Ouvrir directement l'écran quantité avec l'aliment créé
      setSelectedFood(created.food);
      setQuantity(draftFood.suggestedQuantityG || 100);
    } catch (err) {
      setAssistantError(getErrorMessage(err, 'Impossible de sauvegarder cet aliment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="nutri-shell"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="nutri-header">
        <div className="nutri-header-text">
          <span className="nutri-eyebrow">Nutrition Engine</span>
          <h1 className="nutri-title">Journal food</h1>
        </div>
        <div className="nutri-header-actions">
          <button type="button" className="nutri-btn-add nutri-btn-scan" onClick={() => openScanner({ mealType: 'lunch', entryDate: date })}>
            <Barcode size={17} /> Scanner produit
          </button>
          <button type="button" className="nutri-btn-add" onClick={() => openAdd('lunch', 'search')}>
            <Plus size={17} /> Ajouter aliment
          </button>
          <button type="button" className="nutri-btn-add nutri-btn-recipes" onClick={() => navigate('/recipes')}>
            <BookOpen size={17} /> Recettes
          </button>
        </div>
      </header>

      {error && <div className="error-panel" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="nutri-layout">
        <div className="nutri-sidebar">
          <motion.div className="nutri-hero-card" whileHover={{ scale: 1.01 }}>
            <div className="nutri-hero-top">
              <div className="nutri-hero-info">
                <span className="nutri-status-chip"><Clock size={14} /> Aujourd'hui</span>
                <div className="nutri-calories-wrap">
                  <h2 className="nutri-cals-val">{Math.round(summary.calories || 0)} kcal</h2>
                  <span className="nutri-cals-left">{Math.max(0, Math.round(targets.calories - summary.calories))} kcal restantes</span>
                </div>
              </div>
              <div className="nutri-date-picker-wrap">
                <CustomDatePicker value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="nutri-macro-section">
              <MacroBar label="Proteines" value={summary.protein} target={targets.protein} color="aqua" />
              <MacroBar label="Glucides" value={summary.carbs} target={targets.carbs} color="violet" />
              <MacroBar label="Lipides" value={summary.fat} target={targets.fat} color="coral" />
            </div>
          </motion.div>

          <motion.div className="nutri-hydration-card" whileHover={{ scale: 1.01 }}>
            <div className="nutri-hydro-header">
              <div className="nutri-hydro-title">
                <div className="nutri-hydro-icon"><Droplets size={20} /></div>
                <div>
                  <h3>Hydratation</h3>
                  <span>{hydrationSummary.totalMl} ml / {hydrationSummary.targetMl} ml</span>
                </div>
              </div>
              <motion.button 
                className="nutri-hydro-add" 
                onClick={() => handleAddWater(250)}
                disabled={savingWater}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <Plus size={16} strokeWidth={3} /> 250ml
              </motion.button>
            </div>
            <div className="nutri-macro-track">
              <motion.div 
                className="nutri-macro-fill aqua" 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (hydrationSummary.totalMl / hydrationSummary.targetMl) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {nutritionQuery.isFetching && nutritionQuery.data && <div className="status-chip" style={{ marginTop: 14 }}>Refresh...</div>}
          {nutritionQuery.isLoading && !entries.length && <div className="loading-panel" style={{ marginTop: 14 }}><span className="spinner" /> Chargement...</div>}
        </div>

        <div className="nutri-main">
          <div className="nutri-timeline">
            {mealTypes.map((meal, index) => {
              const Icon = meal.icon;
              const mealEntries = grouped[meal.id] || [];
              const mealCals = mealEntries.reduce((sum, entry) => sum + (entry.calories || Math.round(((entry.food?.caloriesPer100g || 0) * entry.quantityG) / 100)), 0);

              return (
                <div key={meal.id} className="nutri-timeline-node">
                  <div className={`nutri-timeline-dot ${meal.color}`} />
                  <div className="nutri-timeline-line" />
                  <motion.article 
                    className="nutri-meal-card"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    <div className="nutri-meal-header">
                      <div className="nutri-meal-info">
                        <div className={`nutri-meal-icon ${meal.color}`}><Icon size={20} /></div>
                        <div><h3 className="nutri-meal-name">{meal.label}</h3><span className="nutri-meal-cals">{mealCals} kcal</span></div>
                      </div>
                      <motion.button 
                        className="nutri-meal-add" 
                        onClick={() => openAdd(meal.id)} 
                        aria-label={`Ajouter a ${meal.label}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      ><Plus size={18} /></motion.button>
                    </div>
                    {mealEntries.length === 0 ? (
                      <div className="nutri-meal-empty">Aucun aliment. Ajoute le premier en un geste.</div>
                    ) : (
                      <div className="nutri-entries">
                        <AnimatePresence>
                          {mealEntries.map((entry) => {
                            const cals = entry.calories || Math.round(((entry.food?.caloriesPer100g || 0) * entry.quantityG) / 100);
                            return (
                              <motion.div 
                                key={entry.id} 
                                className="nutri-entry-row"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                              >
                                <div className="nutri-entry-details">
                                  <strong>{entry.food?.name || 'Aliment'}</strong>
                                  <small>{entry.quantityG} g · {cals} kcal</small>
                                </div>
                                <motion.button 
                                  className="nutri-entry-del" 
                                  onClick={() => handleDelete(entry.id)}
                                  whileHover={{ scale: 1.1, color: '#FF4D6D' }}
                                ><Trash2 size={16} /></motion.button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.article>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetAssistant(); }}
        title={selectedFood ? 'Details' : 'Ajouter un aliment'}
      >
        {!selectedFood ? (
          <div className="nutri-modal-search">
            <div className="nutri-tabs" role="tablist" aria-label="Ajouter un aliment">
              {foodTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`nutri-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    if (tab.id === 'scanner') {
                      setIsModalOpen(false);
                      resetAssistant();
                      openScanner({ mealType, entryDate: date });
                      return;
                    }
                    setActiveTab(tab.id);
                    if (tab.id === 'manual') setDraftFood((current) => current || { ...emptyDraft, name: searchQuery });
                  }}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'search' && (
              <>
                <div className="nutri-search-box">
                  <Search size={18} className="nutri-search-icon" />
                  <input className="nutri-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un aliment..." autoFocus />
                </div>

                {searchQuery && searchResults.length === 0 && (
                  <AssistPanel
                    searchQuery={searchQuery}
                    runExternalSearch={runExternalSearch}
                    startEstimate={() => { setAssistMode('estimate'); setEstimateDescription(searchQuery); setDraftFood(null); }}
                    startManual={() => { setActiveTab('manual'); setAssistMode('manual'); setDraftFood({ ...emptyDraft, name: searchQuery }); }}
                  />
                )}
              </>
            )}

            {assistantError && <div className="error-panel">{assistantError}</div>}
            {activeTab === 'search' && assistMode === 'external' && <ExternalResults loading={externalLoading} results={externalResults} setSelectedFood={setSelectedFood} />}
            {activeTab === 'search' && assistMode === 'estimate' && (
              <form className="nutri-assist-section" onSubmit={draftFood ? saveDraftFood : runEstimate}>
                <span className="nutri-assist-label">Estimation approximative</span>
                {!draftFood ? (
                  <>
                    <Input label="Description" value={estimateDescription} onChange={(e) => setEstimateDescription(e.target.value)} placeholder="ex: sandwich thon mayo" required />
                    <button className="nutri-btn-submit" type="submit" disabled={submitting}>{submitting ? 'Estimation...' : 'Estimer les macros'}</button>
                  </>
                ) : <FoodDraftEditor draftFood={draftFood} setDraftFood={setDraftFood} submitting={submitting} />}
              </form>
            )}
            {activeTab === 'recent' && <RecentFoods entries={entries} setSelectedFood={setSelectedFood} />}
            {activeTab === 'favorites' && (
              <div className="nutri-assist-section">
                <span className="nutri-assist-label">Favoris</span>
                <div className="nutri-empty-tab">Aucun favori pour le moment.</div>
              </div>
            )}
            {activeTab === 'manual' && draftFood && (
              <form className="nutri-assist-section" onSubmit={saveDraftFood}>
                <span className="nutri-assist-label">Creation manuelle</span>
                <FoodDraftEditor draftFood={draftFood} setDraftFood={setDraftFood} submitting={submitting} />
              </form>
            )}

            {activeTab === 'search' && <div className="nutri-search-results">
              {searchResults.map((food) => (
                <button key={food.id} className="nutri-search-item pressable" onClick={() => setSelectedFood(food)}>
                  <div className="nutri-search-item-icon"><UtensilsCrossed size={18} /></div>
                  <div className="nutri-search-item-info">
                    <strong>{food.name}</strong>
                    <small>
                      {food.isPublic ? 'Systeme' : 'Mon aliment'} · {food.caloriesPer100g} kcal / 100g
                    </small>
                  </div>
                  <ChevronRight size={18} className="nutri-search-item-arrow" />
                </button>
              ))}
            </div>}
          </div>
        ) : (
          <form className="nutri-modal-form" onSubmit={handleAddEntry}>
            <div className={`nutri-food-card ${selectedFood.imageUrl ? 'with-image' : ''}`}>
              {selectedFood.imageUrl ? <img src={selectedFood.imageUrl} alt="" className="nutri-food-image" /> : <div className="nutri-food-card-icon"><Info size={24} /></div>}
              <div className="nutri-food-card-content">
                <strong>{selectedFood.name}</strong>
                {selectedFood.brand && <span>{selectedFood.brand}</span>}
                <p>{Math.round(selectedFood.caloriesPer100g * (quantity / 100))} kcal pour {quantity}g</p>
              </div>
            </div>
            <div className="nutri-product-macros">
              <span>{selectedFood.caloriesPer100g} kcal / 100g</span>
              <span>P {selectedFood.proteinPer100g}g</span>
              <span>G {selectedFood.carbsPer100g}g</span>
              <span>L {selectedFood.fatPer100g}g</span>
            </div>
            <div className="nutri-quantity-presets">
              {[50, 100].map((value) => (
                <button key={value} type="button" className={Number(quantity) === value ? 'active' : ''} onClick={() => setQuantity(value)}>{value}g</button>
              ))}
              <button type="button" className={![50, 100].includes(Number(quantity)) ? 'active' : ''}>Portion perso</button>
            </div>
            <Input label="Quantite (g)" type="number" min="1" max="2000" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <select className="nutri-select" value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {mealTypes.map((meal) => <option key={meal.id} value={meal.id}>{meal.label}</option>)}
            </select>
            <button className="nutri-btn-submit" type="submit" disabled={submitting}>{submitting ? 'Ajout en cours...' : 'Ajouter au journal'}</button>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

const AssistPanel = ({ searchQuery, runExternalSearch, startEstimate, startManual }) => (
  <div className="nutri-assist-panel">
    <div><strong>Aucun resultat local pour "{searchQuery}".</strong><small>Choisis une solution rapide. Tu pourras ajouter la quantite juste apres.</small></div>
    <div className="nutri-assist-actions">
      <button type="button" className="nutri-assist-btn" onClick={startManual}><PencilLine size={18} /><span>Creer manuellement</span></button>
      <button type="button" className="nutri-assist-btn" onClick={runExternalSearch}><Globe2 size={18} /><span>Rechercher en ligne</span><span className="nutri-assist-badge">OpenFoodFacts</span></button>
      <button type="button" className="nutri-assist-btn" onClick={startEstimate}><Sparkles size={18} /><span>Estimation rapide</span><span className="nutri-assist-badge">Approximatif</span></button>
    </div>
  </div>
);

const RecentFoods = ({ entries, setSelectedFood }) => {
  const foods = useMemo(() => {
    const seen = new Set();
    return entries
      .map((entry) => entry.food)
      .filter((food) => {
        if (!food?.id || seen.has(food.id)) return false;
        seen.add(food.id);
        return true;
      })
      .slice(0, 8);
  }, [entries]);

  return (
    <div className="nutri-assist-section">
      <span className="nutri-assist-label">Recents</span>
      {foods.length === 0 ? <div className="nutri-empty-tab">Aucun aliment recent aujourd'hui.</div> : foods.map((food) => (
        <button key={food.id} className="nutri-search-item pressable" onClick={() => setSelectedFood(food)}>
          <div className="nutri-search-item-icon"><Clock size={18} /></div>
          <div className="nutri-search-item-info">
            <strong>{food.name}</strong>
            <small>{food.caloriesPer100g} kcal / 100g</small>
          </div>
          <ChevronRight size={18} className="nutri-search-item-arrow" />
        </button>
      ))}
    </div>
  );
};

const ExternalResults = ({ loading, results, setSelectedFood }) => (
  <div className="nutri-assist-section">
    <span className="nutri-assist-label">OpenFoodFacts</span>
    {loading ? <div className="loading-panel"><span className="spinner" /> Recherche en ligne...</div> : results.map((food) => (
      <button key={food.id} className="nutri-search-item pressable" onClick={() => setSelectedFood(food)}>
        <div className="nutri-search-item-icon external"><Globe2 size={18} /></div>
        <div className="nutri-search-item-info"><strong>{food.name}</strong><small>Importe · {food.caloriesPer100g} kcal · P {food.proteinPer100g}g · G {food.carbsPer100g}g · L {food.fatPer100g}g</small></div>
        <ChevronRight size={18} className="nutri-search-item-arrow" />
      </button>
    ))}
  </div>
);

const FoodDraftEditor = ({ draftFood, setDraftFood, submitting }) => {
  const update = (field, value) => setDraftFood((current) => ({ ...current, [field]: value }));

  return (
    <>
      {draftFood.approximate && <div className="nutri-estimate-note">Estimation approximative. Modifie les valeurs si besoin avant validation.</div>}
      <Input label="Nom" value={draftFood.name} onChange={(e) => update('name', e.target.value)} required />
      <div className="nutri-draft-grid">
        <Input label="kcal / 100g" type="number" min="0" max="1000" value={draftFood.caloriesPer100g} onChange={(e) => update('caloriesPer100g', e.target.value)} required />
        <Input label="Proteines" type="number" min="0" max="100" step="0.1" value={draftFood.proteinPer100g} onChange={(e) => update('proteinPer100g', e.target.value)} required />
        <Input label="Glucides" type="number" min="0" max="100" step="0.1" value={draftFood.carbsPer100g} onChange={(e) => update('carbsPer100g', e.target.value)} required />
        <Input label="Lipides" type="number" min="0" max="100" step="0.1" value={draftFood.fatPer100g} onChange={(e) => update('fatPer100g', e.target.value)} required />
      </div>
      <select className="nutri-select" value={draftFood.category || 'other'} onChange={(e) => update('category', e.target.value)}>
        <option value="protein">Proteine</option>
        <option value="grain">Feculent</option>
        <option value="vegetable">Legume</option>
        <option value="fruit">Fruit</option>
        <option value="dairy">Laitier</option>
        <option value="fat">Lipide</option>
        <option value="other">Autre</option>
      </select>
      <button className="nutri-btn-submit" type="submit" disabled={submitting}>{submitting ? 'Sauvegarde...' : 'Valider et continuer'}</button>
    </>
  );
};

const MacroBar = ({ label, value, target, color }) => {
  const percent = pct(value, target);
  return (
    <div className="nutri-macro-bar-wrap">
      <div className="nutri-macro-head"><span className="nutri-macro-label">{label}</span><span className="nutri-macro-val">{Math.round(value || 0)}g / {target}g</span></div>
      <div className="nutri-macro-track">
        <motion.div 
          className={`nutri-macro-fill ${color}`} 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
