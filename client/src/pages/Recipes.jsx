import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChefHat,
  Clock3,
  Flame,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';
import { recipeService } from '../services/recipeService';
import { queryKeys } from '../services/queryClient';
import './Recipes.css';

const CATEGORIES = [
  { id: '', label: 'Tous' },
  { id: 'breakfast', label: 'Petit-dej' },
  { id: 'lunch', label: 'Dejeuner' },
  { id: 'dinner', label: 'Diner' },
  { id: 'snack', label: 'Snack' },
  { id: 'post_training', label: 'Post-training' },
  { id: 'budget_student', label: 'Budget' },
];

const PANTRY = [
  'oeufs', 'thon', 'poulet', 'riz', 'pates', 'pain', 'tomate', 'oignon', 'yaourt',
  'avoine', 'banane', 'fromage', 'lentilles', 'pois chiches', 'lait', 'whey', 'huile d olive',
];

const GOALS = [
  { id: 'fat_loss', label: 'Seche' },
  { id: 'maintenance', label: 'Maintien' },
  { id: 'muscle_gain', label: 'Muscle' },
  { id: 'bulking', label: 'Bulk' },
];

const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

const TAG_FILTERS = [
  { id: 'high-protein', label: 'Proteine +' },
  { id: 'fat-loss', label: 'Fat loss' },
  { id: 'muscle-gain', label: 'Muscle' },
  { id: 'quick', label: 'Rapide' },
  { id: 'budget', label: 'Budget' },
  { id: 'moroccan', label: 'Marocain' },
  { id: 'meal-prep', label: 'Meal prep' },
];

const today = () => new Date().toISOString().slice(0, 10);

const macroLabel = (recipe) => `${Math.round(recipe.proteinG)}P / ${Math.round(recipe.carbsG)}G / ${Math.round(recipe.fatG)}L`;
const recipesQueryKey = Array.isArray(queryKeys.recipes) ? queryKeys.recipes : ['recipes'];

function RecipeCard({ recipe, onDetails, onAdd, onSave, busy }) {
  const ingredientsPreview = (recipe.ingredients || []).slice(0, 3).map((ingredient) => ingredient.name).join(', ');

  return (
    <motion.article
      className="recipe-card"
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="recipe-card__top">
        <span className="recipe-card__category">{recipe.categoryLabel || recipe.category}</span>
        <button className="recipe-icon-btn" type="button" onClick={() => onSave(recipe)} aria-label="Sauvegarder">
          {recipe.saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      <button className="recipe-card__main" type="button" onClick={() => onDetails(recipe)}>
        <h3>{recipe.title}</h3>
        <p>{recipe.description}</p>
      </button>

      <div className="recipe-card__stats" aria-label="Nutrition recette">
        <span>
          <Clock3 size={15} />
          <strong>{recipe.prepTimeMinutes}</strong>
          <small>min</small>
        </span>
        <span>
          <Flame size={15} />
          <strong>{recipe.calories}</strong>
          <small>kcal</small>
        </span>
        <span>
          <Zap size={15} />
          <strong>{Math.round(recipe.proteinG)}g</strong>
          <small>prot</small>
        </span>
      </div>

      <div className="recipe-card__meta">
        <div>
          <span>Score proteine</span>
          <strong>{recipe.proteinScore || Math.round(recipe.proteinG * 2)}/100</strong>
        </div>
        <div>
          <span>Base</span>
          <strong>{ingredientsPreview || 'ingredients simples'}</strong>
        </div>
      </div>

      <div className="recipe-card__tags">
        {(recipe.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
      </div>

      <div className="recipe-card__actions">
        <button type="button" onClick={() => onDetails(recipe)} className="recipe-secondary">Voir</button>
        <button type="button" onClick={() => onAdd(recipe)} className="recipe-primary" disabled={busy}>
          <Plus size={16} /> Journal
        </button>
      </div>
    </motion.article>
  );
}

function RecipeSheet({ recipe, onClose, onAdd }) {
  const [stepMode, setStepMode] = useState(true);
  useEffect(() => {
    if (!recipe) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [recipe]);

  if (!recipe) return null;

  const steps = (recipe.instructions || []).map((instruction, index) => {
    if (typeof instruction === 'string') {
      return { step: index + 1, title: `Etape ${index + 1}`, description: instruction };
    }
    if (!instruction || typeof instruction !== 'object') {
      return { step: index + 1, title: `Etape ${index + 1}`, description: String(instruction || '') };
    }
    return {
      step: instruction.step || index + 1,
      title: String(instruction.title || `Etape ${index + 1}`),
      description: String(instruction.description || ''),
    };
  });

  return createPortal(
    <AnimatePresence>
      <motion.div className="recipe-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.section
          className="recipe-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="recipe-sheet__grab" />
          
          <div className="recipe-sheet__content">
            <div className="recipe-sheet__header">
              <div>
                <span>{recipe.categoryLabel || recipe.category}</span>
                <h2>{recipe.title}</h2>
                <p>{recipe.description}</p>
              </div>
              <button type="button" className="recipe-sheet__close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
            </div>

            <div className="recipe-sheet__macro">
              <strong>{recipe.calories}<small>kcal</small></strong>
              <strong>{Math.round(recipe.proteinG)}<small>g prot</small></strong>
              <strong>{Math.round(recipe.carbsG)}<small>g gluc</small></strong>
              <strong>{Math.round(recipe.fatG)}<small>g lip</small></strong>
            </div>
            <div className="recipe-sheet__mode">
              <span>Mode recette</span>
              <button type="button" className={clsx(stepMode && 'active')} onClick={() => setStepMode(true)}>Etape par etape</button>
              <button type="button" className={clsx(!stepMode && 'active')} onClick={() => setStepMode(false)}>Compact</button>
            </div>

            <div className="recipe-sheet__grid">
              <div>
                <h3>Ingredients</h3>
                <ul>
                  {(recipe.ingredients || []).map((ingredient, index) => (
                    <li key={`${ingredient.id || ingredient.name}-${ingredient.quantity || index}-${index}`}>
                      <Check size={16} />
                      <span><strong>{ingredient.name}</strong> {ingredient.quantity ? `${ingredient.quantity} ${ingredient.unit}` : ingredient.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Preparation</h3>
                {stepMode ? (
                  <div className="recipe-steps">
                    {steps.map((step, index) => (
                      <article className="recipe-step" key={`${step.step}-${step.title}-${index}`}>
                        <span>{step.step}</span>
                        <div>
                          <strong>{step.title}</strong>
                          <p>{step.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <ol>
                    {steps.map((step, index) => <li key={`${step.step}-${step.title}-${index}`}>{step.title}: {step.description}</li>)}
                  </ol>
                )}
              </div>
            </div>

            <button type="button" className="recipe-sheet__add" onClick={() => { onAdd(recipe); onClose(); }}>
              <Plus size={20} /> Ajouter au journal
            </button>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export const Recipes = () => {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [proteinMin, setProteinMin] = useState('');
  const [caloriesMax, setCaloriesMax] = useState('');
  const [prepTimeMax, setPrepTimeMax] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedIngredients, setSelectedIngredients] = useState(['thon', 'tomate', 'pain']);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [generator, setGenerator] = useState({
    goal: 'muscle_gain',
    mealType: 'lunch',
    timeAvailable: 20,
    caloriesMax: 650,
    proteinMin: 35,
    avoidIngredientsText: '',
  });

  const recipesQuery = useQuery({
    queryKey: [...recipesQueryKey, { category, search, proteinMin, caloriesMax, prepTimeMax, goalFilter, selectedTags }],
    queryFn: () => recipeService.getRecipes({
      category,
      search,
      proteinMin,
      caloriesMax,
      prepTimeMax,
      goal: goalFilter,
      tags: selectedTags,
    }),
  });

  const recommendedQuery = useQuery({
    queryKey: [...recipesQueryKey, 'recommended-today'],
    queryFn: recipeService.getRecommendedToday,
  });

  const matchQuery = useQuery({
    queryKey: [...recipesQueryKey, 'match', selectedIngredients],
    queryFn: () => recipeService.matchIngredients(selectedIngredients),
    enabled: selectedIngredients.length > 0,
  });

  const generateMutation = useMutation({
    mutationFn: recipeService.generate,
  });

  const addMutation = useMutation({
    mutationFn: (recipe) => recipeService.addToFoodLog(recipe.id, {
      entryDate: today(),
      mealType: generator.mealType,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(today()) });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (recipe) => recipe.saved ? recipeService.unsave(recipe.id) : recipeService.save(recipe.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipesQueryKey });
    },
  });

  const recipes = recipesQuery.data || [];
  const filteredIngredients = useMemo(() => (
    PANTRY.filter((ingredient) => ingredient.includes(ingredientSearch.trim().toLowerCase()))
  ), [ingredientSearch]);

  const generatedRecipes = generateMutation.data || [];

  const toggleIngredient = (ingredient) => {
    setSelectedIngredients((current) => (
      current.includes(ingredient)
        ? current.filter((item) => item !== ingredient)
        : [...current, ingredient]
    ));
  };

  const toggleTag = (tag) => {
    setSelectedTags((current) => (
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    ));
  };

  const runGenerator = () => {
    generateMutation.mutate({
      goal: generator.goal,
      mealType: generator.mealType,
      timeAvailable: Number(generator.timeAvailable),
      caloriesMax: Number(generator.caloriesMax),
      proteinMin: Number(generator.proteinMin),
      avoidIngredients: generator.avoidIngredientsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <main className="recipes-page">
      <header className="recipes-hero">
        <div className="recipes-hero__content">
          <div>
            <span className="recipes-eyebrow"><ChefHat size={14} /> FitTrack Kitchen</span>
            <h1>Recettes</h1>
            <p>Choisis une recette, trouve quoi cuisiner avec ton frigo, ou genere un repas selon ton objectif.</p>
          </div>
          <button type="button" className="recipes-hero__cta" onClick={runGenerator}>
            <Sparkles size={18} /> Generer
          </button>
        </div>
      </header>

      <div className="desktop-grid">
        <div className="main-column">
          {recommendedQuery.data?.recipe && (
            <section className="recipes-section recipe-recommended">
              <div className="recipes-section__head">
                <div>
                  <h2>Recette recommandee aujourd'hui</h2>
                  <p>{recommendedQuery.data.reason}</p>
                </div>
              </div>
              <RecipeCard
                recipe={recommendedQuery.data.recipe}
                onDetails={setSelectedRecipe}
                onAdd={(item) => addMutation.mutate(item)}
                onSave={(item) => saveMutation.mutate(item)}
                busy={addMutation.isPending}
              />
            </section>
          )}

          <section className="recipes-section">
            <div className="recipes-section__head">
              <div>
                <h2>Recettes Proteinees</h2>
                <p>{recipes.length} idees pretes pour le journal</p>
              </div>
            </div>
            
            <div className="recipes-search-wrapper">
              <div className="recipes-search">
                <Search size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chercher thon, poulet, avoine..." />
              </div>
            </div>
            
            <div className="recipes-filters" aria-label="Filtres recettes">
              {CATEGORIES.map((item) => (
                <button key={item.id || 'all'} type="button" onClick={() => setCategory(item.id)} className={clsx(category === item.id && 'active')}>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="recipe-filter-panel">
              <div className="recipe-filter-field">
                <label>Objectif</label>
                <select value={goalFilter} onChange={(event) => setGoalFilter(event.target.value)}>
                  <option value="">Tous</option>
                  <option value="fat_loss">Fat loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="muscle_gain">Muscle gain</option>
                  <option value="bulking">Bulking</option>
                </select>
              </div>
              <div className="recipe-filter-field">
                <label>Prot. min</label>
                <input type="number" value={proteinMin} onChange={(event) => setProteinMin(event.target.value)} placeholder="30g" />
              </div>
              <div className="recipe-filter-field">
                <label>Kcal max</label>
                <input type="number" value={caloriesMax} onChange={(event) => setCaloriesMax(event.target.value)} placeholder="550" />
              </div>
              <div className="recipe-filter-field">
                <label>Temps max</label>
                <input type="number" value={prepTimeMax} onChange={(event) => setPrepTimeMax(event.target.value)} placeholder="15" />
              </div>
            </div>

            <div className="recipes-filters" aria-label="Filtres tags">
              {TAG_FILTERS.map((tag) => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={clsx(selectedTags.includes(tag.id) && 'active')}>
                  {tag.label}
                </button>
              ))}
            </div>
            
            <div className="recipe-rail">
              {recipesQuery.isLoading ? (
                <>
                  <div className="recipes-loading" />
                  <div className="recipes-loading" />
                </>
              ) : recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onDetails={setSelectedRecipe}
                  onAdd={(item) => addMutation.mutate(item)}
                  onSave={(item) => saveMutation.mutate(item)}
                  busy={addMutation.isPending}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="side-column">
          <section className="recipes-section recipe-pantry">
            <div className="recipes-section__head">
              <div>
                <h2>Avec ce que j'ai</h2>
                <p>Selectionne ton frigo, on calcule.</p>
              </div>
              <span className="recipe-count-chip">{selectedIngredients.length}</span>
            </div>
            
            <div className="recipes-search-wrapper">
              <div className="recipes-search recipes-search--compact">
                <Search size={16} />
                <input value={ingredientSearch} onChange={(event) => setIngredientSearch(event.target.value)} placeholder="Chercher un ingredient" />
              </div>
            </div>
            
            <div className="ingredient-cloud">
              {filteredIngredients.map((ingredient) => (
                <button
                  key={ingredient}
                  type="button"
                  onClick={() => toggleIngredient(ingredient)}
                  className={clsx(selectedIngredients.includes(ingredient) && 'active')}
                >
                  {selectedIngredients.includes(ingredient) && <Check size={14} />}
                  {ingredient}
                </button>
              ))}
            </div>
            
            <div className="match-list">
              {(matchQuery.data || []).slice(0, 4).map((recipe) => (
                <button key={recipe.id} type="button" className="match-card" onClick={() => setSelectedRecipe(recipe)}>
                  <span className="match-card__score">Match {recipe.match.score}%</span>
                  <strong>{recipe.title}</strong>
                  <small>Tu as : {recipe.match.availableIngredients.join(', ') || 'rien'}</small>
                  <small>Manque : {recipe.match.missingIngredients.slice(0, 4).join(', ') || 'rien'}</small>
                  <em>{recipe.match.alternative}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="recipes-section recipe-generator">
            <div className="recipes-section__head">
              <div>
                <h2>Generateur Objectif</h2>
                <p>3 repas adaptes aux contraintes.</p>
              </div>
              <SlidersHorizontal size={24} color="var(--aqua)" />
            </div>
            
            <div className="generator-field">
              <label>Objectif</label>
              <div className="generator-chips">
                {GOALS.map((goal) => (
                  <button 
                    key={goal.id} 
                    type="button" 
                    className={clsx('generator-chip', generator.goal === goal.id && 'active')}
                    onClick={() => setGenerator({ ...generator, goal: goal.id })}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="generator-field">
              <label>Repas</label>
              <div className="generator-chips">
                {MEALS.map((meal) => (
                  <button 
                    key={meal.id} 
                    type="button" 
                    className={clsx('generator-chip', generator.mealType === meal.id && 'active')}
                    onClick={() => setGenerator({ ...generator, mealType: meal.id })}
                  >
                    {meal.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="generator-field">
              <label>Temps dispo</label>
              <div className="generator-chips">
                {[5, 10, 15, 20, 30].map((time) => (
                  <button 
                    key={time} 
                    type="button" 
                    className={clsx('generator-chip', Number(generator.timeAvailable) === time && 'active')}
                    onClick={() => setGenerator({ ...generator, timeAvailable: time })}
                  >
                    {time} min
                  </button>
                ))}
              </div>
            </div>

            <div className="generator-grid-2">
              <div className="generator-field">
                <label>Calories max</label>
                <div className="input-with-suffix">
                  <input type="number" value={generator.caloriesMax} onChange={(event) => setGenerator({ ...generator, caloriesMax: event.target.value })} />
                  <span>kcal</span>
                </div>
              </div>
              <div className="generator-field">
                <label>Proteines min</label>
                <div className="input-with-suffix">
                  <input type="number" value={generator.proteinMin} onChange={(event) => setGenerator({ ...generator, proteinMin: event.target.value })} />
                  <span>g</span>
                </div>
              </div>
            </div>

            <div className="generator-field">
              <label>Ingredients a eviter</label>
              <input 
                className="generator-input-text"
                value={generator.avoidIngredientsText} 
                onChange={(event) => setGenerator({ ...generator, avoidIngredientsText: event.target.value })} 
                placeholder="ex: lait, fromage, gluten..." 
              />
            </div>
            
            <button type="button" className="generator-run" onClick={runGenerator} disabled={generateMutation.isPending}>
              <Target size={20} /> 
              {generateMutation.isPending ? 'Generation en cours...' : 'Generer 3 recettes'}
            </button>
            
            <div className="generated-list">
              {generatedRecipes.map((recipe) => (
                <button key={recipe.id} type="button" className="generated-card" onClick={() => setSelectedRecipe(recipe)}>
                  <span>{recipe.fitScore}% fit</span>
                  <strong>{recipe.title}</strong>
                  <small>{recipe.reason}</small>
                  <em>{macroLabel(recipe)}</em>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <RecipeSheet
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onAdd={(recipe) => addMutation.mutate(recipe)}
      />
    </main>
  );
};
