import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { ACTIVITY_LEVELS, ACTIVITY_LEVEL_LABELS, GOALS, GOAL_LABELS } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Ruler, Activity, Target, ArrowRight, ArrowLeft, 
  CheckCircle2, Flame, TrendingDown, Scale, Dumbbell, Zap,
  Briefcase, Footprints, Heart, BatteryCharging
} from 'lucide-react';

const ACTIVITY_DETAILS = {
  sedentary: { desc: 'Peu ou pas d\'exercice, travail de bureau', icon: Briefcase },
  light: { desc: 'Exercice léger 1 à 3 jours par semaine', icon: Footprints },
  moderate: { desc: 'Exercice modéré 3 à 5 jours par semaine', icon: Heart },
  active: { desc: 'Exercice intense 6 à 7 jours par semaine', icon: Flame },
  very_active: { desc: 'Entraînement physique très intense', icon: BatteryCharging },
};

const GOAL_DETAILS = {
  fat_loss: { desc: 'Optimiser la composition corporelle', icon: Flame },
  weight_loss: { desc: 'Réduire le poids global', icon: TrendingDown },
  maintenance: { desc: 'Maintenir le poids et la forme actuels', icon: Scale },
  muscle_gain: { desc: 'Augmenter la masse musculaire maigre', icon: Dumbbell },
  bulking: { desc: 'Augmenter le volume et la force globale', icon: Zap },
};

export const ProfileSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    activityLevel: 'sedentary',
    goal: 'maintenance'
  });

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile();
        if (!cancelled && data && data.profile) {
          setFormData(data.profile);
          setIsEditing(true);
        } else if (!cancelled) {
          setIsEditing(false);
        }
      } catch {
        if (!cancelled) {
          setIsEditing(false);
        }
      }
    };
    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['age', 'heightCm', 'weightKg', 'targetWeightKg'];
    setFormData(prev => ({ 
      ...prev, 
      [name]: numericFields.includes(name) ? Number(value) || '' : value 
    }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      try {
        if (isEditing) {
          await profileService.updateProfile(formData);
        } else {
          await profileService.createProfile(formData);
        }
      } catch (err) {
        if (isEditing && err.response?.status === 404) {
          await profileService.createProfile(formData);
        } else {
          throw err;
        }
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Identité', subtitle: 'Faisons connaissance', icon: User },
    { num: 2, title: 'Physiologie', subtitle: 'Vos métriques actuelles', icon: Ruler },
    { num: 3, title: 'Mode de vie', subtitle: 'Votre niveau d\'activité', icon: Activity },
    { num: 4, title: 'Objectif', subtitle: 'Votre cible de performance', icon: Target }
  ];

  const currentStepInfo = steps[step - 1];
  const StepIcon = currentStepInfo.icon;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="step-content"
          >
            <Input label="Nom complet" name="name" value={formData.name} onChange={handleChange} required autoFocus placeholder="Ex: Jean Dupont" />
            <div className="grid-2 mt-4">
              <Input label="Âge" type="number" name="age" value={formData.age} onChange={handleChange} required min="10" max="120" placeholder="Ex: 25" />
              <Select label="Genre" name="gender" value={formData.gender} onChange={handleChange} required options={[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' }
              ]} />
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="step-content"
          >
            <Input label="Taille (cm)" type="number" name="heightCm" value={formData.heightCm} onChange={handleChange} required min="100" max="250" autoFocus placeholder="Ex: 175" />
            <div className="grid-2 mt-4">
              <Input label="Poids actuel (kg)" type="number" name="weightKg" value={formData.weightKg} onChange={handleChange} required min="30" max="300" step="0.1" placeholder="Ex: 70" />
              <Input label="Poids cible (kg)" type="number" name="targetWeightKg" value={formData.targetWeightKg || ''} onChange={handleChange} min="30" max="300" step="0.1" placeholder="Ex: 65" />
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="step-content scrollable-list"
          >
            {ACTIVITY_LEVELS.map(level => {
              const isSelected = formData.activityLevel === level;
              const Icon = ACTIVITY_DETAILS[level].icon;
              return (
                <label key={level} className={`choice-card ${isSelected ? 'selected' : ''}`}>
                  <input type="radio" name="activityLevel" value={level} checked={isSelected} onChange={handleChange} style={{ display: 'none' }} />
                  
                  <div className={`choice-icon ${isSelected ? 'selected-icon' : ''}`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="choice-text">
                    <div className="choice-title">{ACTIVITY_LEVEL_LABELS[level]}</div>
                    <div className="choice-desc">{ACTIVITY_DETAILS[level].desc}</div>
                  </div>
                  
                  <div className={`choice-radio ${isSelected ? 'selected-radio' : ''}`}>
                    {isSelected && <div className="choice-radio-inner" />}
                  </div>
                </label>
              );
            })}
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="step-content scrollable-list"
          >
            {GOALS.map(goal => {
              const isSelected = formData.goal === goal;
              const Icon = GOAL_DETAILS[goal].icon;
              return (
                <label key={goal} className={`choice-card ${isSelected ? 'selected' : ''}`}>
                  <input type="radio" name="goal" value={goal} checked={isSelected} onChange={handleChange} style={{ display: 'none' }} />
                  
                  <div className={`choice-icon ${isSelected ? 'selected-icon' : ''}`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="choice-text">
                    <div className="choice-title">{GOAL_LABELS[goal]}</div>
                    <div className="choice-desc">{GOAL_DETAILS[goal].desc}</div>
                  </div>
                  
                  <div className={`choice-radio ${isSelected ? 'selected-radio' : ''}`}>
                    {isSelected && <div className="choice-radio-inner" />}
                  </div>
                </label>
              );
            })}
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="setup-container">
      {/* Background glow effects */}
      <div className="setup-glow setup-glow-1" />
      <div className="setup-glow setup-glow-2" />

      <Card className="setup-card" style={{ padding: 0 }}>
        {/* Header */}
        <div className="setup-header">
          <div className="setup-header-top">
            <div className="setup-header-left">
              <div className="setup-header-icon">
                <StepIcon size={20} />
              </div>
              <div>
                <h1 className="setup-title">{isEditing ? "Mise à jour" : "Bienvenue"}</h1>
                <p className="setup-subtitle">{currentStepInfo.subtitle}</p>
              </div>
            </div>
            
            <div className="setup-header-right">
              <div className="setup-step-count">Étape {step} / 4</div>
              <div className="setup-step-name">{currentStepInfo.title}</div>
            </div>
          </div>

          <div className="setup-progress-container">
            {steps.map((s) => (
              <div key={s.num} className="setup-progress-track">
                <motion.div 
                  className="setup-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: step >= s.num ? '100%' : '0%' }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="setup-error">
            <div className="setup-error-dot" />
            {error}
          </div>
        )}

        {/* Body */}
        <div className="setup-body">
          <form onSubmit={step === 4 ? handleSubmit : handleNext}>
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
            
            <div className="setup-footer">
              {step > 1 && (
                <button type="button" className="ghost-btn setup-back-btn" onClick={handleBack}>
                  <ArrowLeft size={18} />
                </button>
              )}
              
              <button 
                type="submit" 
                className={`quick-btn primary setup-next-btn ${step === 4 && isEditing ? 'setup-save-btn' : ''}`}
                disabled={loading}
              >
                {loading ? <div className="spinner" /> : (
                  step === 4 ? (
                    <>
                      <CheckCircle2 size={18} />
                      {isEditing ? 'Enregistrer' : "Démarrer l'expérience"}
                    </>
                  ) : (
                    <>
                      Suivant
                      <ArrowRight size={18} />
                    </>
                  )
                )}
              </button>
            </div>
          </form>
        </div>
      </Card>

      <style>{`
        .setup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .setup-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }

        .setup-glow-1 {
          top: 10%;
          left: 10%;
          width: 300px;
          height: 300px;
          background: rgba(0, 229, 255, 0.1);
        }

        .setup-glow-2 {
          bottom: 10%;
          right: 10%;
          width: 400px;
          height: 400px;
          background: rgba(0, 255, 163, 0.05);
        }

        .setup-card {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
        }

        .setup-header {
          padding: 24px 30px 20px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(to bottom, rgba(255,255,255,0.02), transparent);
        }

        .setup-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .setup-header-left {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .setup-header-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 229, 255, 0.1);
          color: var(--aqua);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .setup-title {
          font-size: 1.4rem;
          font-weight: 900;
          color: var(--ink);
          margin: 0;
          line-height: 1.1;
        }

        .setup-subtitle {
          font-size: 0.85rem;
          color: var(--soft);
          margin: 4px 0 0 0;
        }

        .setup-header-right {
          text-align: right;
          flex-shrink: 0;
          margin-left: 16px;
        }

        .setup-step-count {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--muted);
          font-weight: 700;
          margin-bottom: 4px;
        }

        .setup-step-name {
          font-size: 0.85rem;
          color: var(--aqua);
          font-weight: 800;
        }

        .setup-progress-container {
          display: flex;
          gap: 8px;
        }

        .setup-progress-track {
          flex: 1;
          height: 6px;
          background: var(--line);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .setup-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--lime), var(--aqua));
          border-radius: inherit;
        }

        .setup-body {
          padding: 24px 30px 30px;
        }

        .step-content {
          display: flex;
          flex-direction: column;
        }

        .scrollable-list {
          gap: 12px;
          max-height: 50vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .scrollable-list::-webkit-scrollbar {
          width: 4px;
        }
        .scrollable-list::-webkit-scrollbar-thumb {
          background: var(--line-strong);
          border-radius: 4px;
        }

        .choice-card {
          display: flex;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .choice-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .choice-card.selected {
          background: rgba(0, 229, 255, 0.08);
          border-color: rgba(0, 229, 255, 0.4);
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.1);
        }

        .choice-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          color: var(--soft);
          margin-right: 16px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .choice-icon.selected-icon {
          background: linear-gradient(135deg, var(--lime), var(--aqua));
          color: #050816;
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
        }

        .choice-text {
          flex: 1;
        }

        .choice-title {
          font-weight: 800;
          font-size: 1rem;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .choice-card.selected .choice-title {
          color: var(--aqua);
        }

        .choice-desc {
          font-size: 0.75rem;
          color: var(--soft);
          line-height: 1.3;
        }

        .choice-radio {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid var(--line-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 12px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .choice-radio.selected-radio {
          border-color: var(--aqua);
        }

        .choice-radio-inner {
          width: 10px;
          height: 10px;
          background: var(--aqua);
          border-radius: 50%;
        }

        .setup-footer {
          display: flex;
          gap: 16px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
        }

        .setup-back-btn {
          width: 54px;
          padding: 0;
          border-radius: 16px;
        }

        .setup-next-btn {
          flex: 1;
          border-radius: 16px;
        }
        
        .setup-save-btn {
          background: var(--ink);
          color: var(--deep);
        }

        .setup-error {
          margin: 20px 30px 0;
          padding: 12px 16px;
          background: rgba(255, 77, 109, 0.1);
          border: 1px solid rgba(255, 77, 109, 0.2);
          border-radius: 12px;
          color: #ff9fb3;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .setup-error-dot {
          width: 6px;
          height: 6px;
          background: var(--danger);
          border-radius: 50%;
        }

        @media (max-width: 600px) {
          .setup-container { padding: 12px; }
          .setup-header { padding: 20px 20px 16px; }
          .setup-body { padding: 20px 20px 24px; }
          .setup-title { font-size: 1.25rem; }
          .setup-header-icon { width: 38px; height: 38px; }
          .choice-card { padding: 12px; }
          .choice-icon { width: 38px; height: 38px; margin-right: 12px; }
        }
      `}</style>
    </div>
  );
};
