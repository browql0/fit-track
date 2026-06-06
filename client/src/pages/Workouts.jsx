import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Dumbbell, Flame, Plus, Trash2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { workoutService } from '../services/workoutService';
import { exerciseService } from '../services/exerciseService';
import { queryKeys } from '../services/queryClient';
import './Workouts.css';

export const Workouts = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  
  // Smart fields
  const [rounds, setRounds] = useState('');
  const [roundDuration, setRoundDuration] = useState('');
  const [restDuration, setRestDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [sets, setSets] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const workoutsQuery = useQuery({
    queryKey: queryKeys.workouts(date),
    queryFn: () => workoutService.getWorkouts(date),
  });
  const workouts = workoutsQuery.data || [];

  const getExerciseType = (exId) => {
    const ex = exercises.find(e => e.id === parseInt(exId, 10));
    if (!ex) return 'default';
    const name = ex.name;
    if (['Boxing', 'HIIT', 'Martial Arts'].includes(name)) return 'rounds';
    if (['Running (slow)', 'Running (fast)', 'Cycling', 'Swimming', 'Walking', 'Rowing'].includes(name)) return 'distance';
    if (['Weight Training'].includes(name)) return 'sets';
    return 'default';
  };

  useEffect(() => {
    exerciseService.getAllExercises().then((data) => setExercises(data || [])).catch(() => setExercises([]));
  }, []);

  const invalidateWorkoutViews = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workouts(date) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    queryClient.invalidateQueries({ queryKey: queryKeys.coach });
  };

  const addWorkoutMutation = useMutation({
    mutationFn: workoutService.addWorkout,
    onSuccess: invalidateWorkoutViews,
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: workoutService.deleteWorkout,
    onSuccess: invalidateWorkoutViews,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const exType = getExerciseType(exerciseId);
    let finalDuration = parseInt(duration, 10);
    let finalNotes = notes || '';
    
    if (exType === 'rounds') {
      const r = parseInt(rounds, 10) || 0;
      const rd = parseFloat(roundDuration) || 0;
      const rest = parseInt(restDuration, 10) || 0;
      if (r > 0 && rd > 0) {
        finalDuration = Math.round((r * rd) + ((r > 1 ? r - 1 : 0) * (rest / 60)));
        const roundText = `${r} round${r > 1 ? 's' : ''} de ${rd} min`;
        const restText = rest > 0 ? ` (${rest}s de pause)` : '';
        const combined = `${roundText}${restText}`;
        finalNotes = finalNotes ? `${combined} - ${finalNotes}` : combined;
      }
    } else if (exType === 'distance') {
      const d = parseFloat(distance);
      if (d > 0) {
        const combined = `${d} km`;
        finalNotes = finalNotes ? `${combined} - ${finalNotes}` : combined;
      }
    } else if (exType === 'sets') {
      const s = parseInt(sets, 10);
      if (s > 0) {
        const combined = `${s} séries`;
        finalNotes = finalNotes ? `${combined} - ${finalNotes}` : combined;
      }
    }

    try {
      await addWorkoutMutation.mutateAsync({
        exerciseId: parseInt(exerciseId, 10),
        durationMinutes: finalDuration,
        workoutDate: date,
        notes: finalNotes || undefined,
      });
      setIsModalOpen(false);
      setExerciseId('');
      setDuration('');
      setNotes('');
      setRounds('');
      setRoundDuration('');
      setRestDuration('');
      setDistance('');
      setSets('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l ajout.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteWorkoutMutation.mutateAsync(id);
  };

  const totalCalories = workouts.reduce((sum, workout) => sum + Number(workout.caloriesBurned || 0), 0);
  const totalDuration = workouts.reduce((sum, workout) => sum + Number(workout.durationMinutes || 0), 0);
  const intensity = Math.min(100, Math.round((totalDuration / 45) * 100));

  return (
    <motion.div 
      className="wo-shell"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="wo-header">
        <div className="wo-header-text">
          <span className="wo-eyebrow">Move protocol</span>
          <h1 className="wo-title">Training</h1>
        </div>
        <button className="wo-btn-add" onClick={() => setIsModalOpen(true)}><Plus size={18} strokeWidth={2.5} /> Session</button>
      </header>

      <div className="wo-layout">
        <div className="wo-sidebar">
          <motion.section className="wo-hero-card" whileHover={{ scale: 1.01 }}>
            <div className="wo-hero-top">
              <div className="wo-hero-info">
                <span className="wo-status-chip"><Zap size={14} /> Objectif 45 min</span>
                <h2 className="wo-cals-val">{totalDuration} min</h2>
                <p className="wo-cals-left">{totalDuration ? 'Mouvement enregistré. Garde ce rythme.' : 'Démarre court, gagne le momentum.'}</p>
              </div>
              <div className="wo-date-picker-wrap">
                <CustomDatePicker value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
            </div>
            
            <div className="wo-macro-section">
              <div className="wo-ring-strip">
                <div className="wo-mini-stat"><span><Clock size={14} /> Temps</span><strong>{totalDuration}m</strong></div>
                <div className="wo-mini-stat"><span><Flame size={14} /> Burn</span><strong>{totalCalories}</strong></div>
                <div className="wo-mini-stat"><span><Dumbbell size={14} /> Score</span><strong>{intensity}%</strong></div>
              </div>
              <div className="wo-macro-track" style={{ marginTop: 16 }}>
                <motion.div 
                  className="wo-macro-fill cyan" 
                  initial={{ width: 0 }}
                  animate={{ width: `${intensity}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            </div>
          </motion.section>
        </div>

        <div className="wo-main">
          {error && <div className="error-panel" style={{ marginTop: 14, marginBottom: 14 }}>{error}</div>}

          <section className="wo-section-title">
            <div><span className="wo-eyebrow">Journal</span><h2>Sessions du jour</h2></div>
          </section>

      {workoutsQuery.isFetching && workoutsQuery.data && <div className="status-chip" style={{ marginTop: 14 }}>Refresh...</div>}

      {workoutsQuery.isLoading && !workoutsQuery.data ? (
        <div className="loading-panel"><span className="spinner" /> Chargement...</div>
      ) : workouts.length === 0 ? (
        <div className="wo-empty-panel">Aucune session. Ajoute 20 minutes pour faire monter ton Pulse.</div>
      ) : (
        <div className="wo-workouts-list">
          <AnimatePresence>
            {workouts.map((workout) => (
              <motion.article 
                key={workout.id} 
                className="wo-workout-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="wo-workout-icon cyan"><Dumbbell size={20} /></div>
                <div className="wo-workout-info">
                  <strong>{workout.exercise?.name || 'Exercice'}</strong>
                  <small>{workout.durationMinutes} min · {workout.caloriesBurned || 0} kcal{workout.notes ? ` · ${workout.notes}` : ''}</small>
                </div>
                <motion.button 
                  className="wo-workout-del" 
                  onClick={() => handleDelete(workout.id)} 
                  aria-label="Supprimer"
                  whileHover={{ scale: 1.1, color: '#FF4D6D' }}
                ><Trash2 size={16} /></motion.button>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle session">
        {error && <div className="error-panel mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="stack">
          <Select
            label="Exercice"
            value={exerciseId}
            onChange={(event) => {
              setExerciseId(event.target.value);
              setDuration('');
              setRounds('');
              setRoundDuration('');
              setRestDuration('');
              setDistance('');
              setSets('');
            }}
            required
            options={[{ value: '', label: 'Choisir un exercice...' }, ...exercises.map((exercise) => ({ value: exercise.id, label: exercise.name }))]}
          />
          
          <AnimatePresence>
            {exerciseId && (
              <motion.div 
                className="smart-fields-anim"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {getExerciseType(exerciseId) === 'rounds' ? (
                  <div className="stack" style={{ gap: '12px' }}>
                    <div className="grid-2">
                      <Input label="Rounds" type="number" min="1" value={rounds} onChange={(e) => setRounds(e.target.value)} required />
                      <Input label="Durée/round (min)" type="number" min="0.5" step="0.5" value={roundDuration} onChange={(e) => setRoundDuration(e.target.value)} required />
                    </div>
                    <Input label="Pause entre rounds (sec)" type="number" min="0" step="5" value={restDuration} onChange={(e) => setRestDuration(e.target.value)} required />
                  </div>
                ) : getExerciseType(exerciseId) === 'distance' ? (
                  <div className="grid-2">
                    <Input label="Distance (km)" type="number" min="0.1" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} />
                    <Input label="Durée (min)" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} required />
                  </div>
                ) : getExerciseType(exerciseId) === 'sets' ? (
                   <div className="grid-2">
                    <Input label="Séries (total)" type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} />
                    <Input label="Durée (min)" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} required />
                  </div>
                ) : (
                  <Input label="Durée (minutes)" type="number" min="1" max="600" value={duration} onChange={(event) => setDuration(event.target.value)} required />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Input label="Notes" type="text" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ressenti, intensité, PR..." />
          <button className="wo-btn-submit" type="submit" disabled={submitting}>{submitting ? 'Enregistrement...' : 'Enregistrer la session'}</button>
        </form>
      </Modal>
    </motion.div>
  );
};
