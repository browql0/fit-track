import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { Card, CardHeader } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ACTIVITY_LEVELS, ACTIVITY_LEVEL_LABELS, GOALS, GOAL_LABELS } from '../utils/constants';

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
    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile();
        if (data && data.profile) {
          setFormData(data.profile);
          setIsEditing(true);
        }
      } catch {
        // Expected for new users
      }
    };
    fetchProfile();
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
      if (isEditing) {
        await profileService.updateProfile(formData);
      } else {
        await profileService.createProfile(formData);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-4 slide-in-right">
            <Input label="Nom complet" name="name" value={formData.name} onChange={handleChange} required autoFocus />
            <div className="flex gap-4">
              <Input label="Age" type="number" name="age" value={formData.age} onChange={handleChange} required min="10" max="120" />
              <Select label="Genre" name="gender" value={formData.gender} onChange={handleChange} required options={[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' }
              ]} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4 slide-in-right">
            <Input label="Taille (cm)" type="number" name="heightCm" value={formData.heightCm} onChange={handleChange} required min="100" max="250" autoFocus />
            <Input label="Poids (kg)" type="number" name="weightKg" value={formData.weightKg} onChange={handleChange} required min="30" max="300" step="0.1" />
            <Input label="Poids cible (kg)" type="number" name="targetWeightKg" value={formData.targetWeightKg || ''} onChange={handleChange} min="30" max="300" step="0.1" />
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-3 slide-in-right">
            {ACTIVITY_LEVELS.map(level => (
              <label 
                key={level}
                className={`glass-panel p-4 cursor-pointer transition-all ${formData.activityLevel === level ? 'border-primary ring-1 ring-primary' : 'hover:bg-card-hover'}`}
              >
                <div className="flex items-center gap-3">
                  <input type="radio" name="activityLevel" value={level} checked={formData.activityLevel === level} onChange={handleChange} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.activityLevel === level ? 'border-primary' : 'border-glass-border'}`}>
                    {formData.activityLevel === level && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <span className="font-medium text-text">{ACTIVITY_LEVEL_LABELS[level]}</span>
                </div>
              </label>
            ))}
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col gap-3 slide-in-right">
            {GOALS.map(goal => (
              <label 
                key={goal}
                className={`glass-panel p-4 cursor-pointer transition-all ${formData.goal === goal ? 'border-primary ring-1 ring-primary' : 'hover:bg-card-hover'}`}
              >
                <div className="flex items-center gap-3">
                  <input type="radio" name="goal" value={goal} checked={formData.goal === goal} onChange={handleChange} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.goal === goal ? 'border-primary' : 'border-glass-border'}`}>
                    {formData.goal === goal && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <span className="font-medium text-text">{GOAL_LABELS[goal]}</span>
                </div>
              </label>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8 fade-in">
      <Card animate className="w-full max-w-[500px]">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1.5 rounded-full flex-1 transition-colors ${i <= step ? 'bg-primary' : 'bg-glass-border'}`} />
          ))}
        </div>

        <CardHeader 
          title={isEditing ? "Mettre à jour" : "Complétez votre profil"} 
          subtitle={
            step === 1 ? "Commençons par faire connaissance" :
            step === 2 ? "Vos mensurations" :
            step === 3 ? "Votre niveau d'activité" :
            "Quel est votre objectif ?"
          } 
        />
        
        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-danger text-danger px-4 py-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={step === 4 ? handleSubmit : handleNext}>
          {renderStepContent()}
          
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={handleBack} className="w-1/3">
                Retour
              </Button>
            )}
            <Button type="submit" loading={loading} className={step > 1 ? "w-2/3" : "w-full"}>
              {step === 4 ? (isEditing ? 'Sauvegarder' : 'Terminer') : 'Suivant'}
            </Button>
          </div>
        </form>
      </Card>
      
      {/* Simple inline CSS for this component's transitions */}
      <style>{`
        .slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
