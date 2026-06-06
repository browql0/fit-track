import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Plus, Scale, Target, Trash2, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../components/ui/Input';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { weightService } from '../services/weightService';
import { queryKeys } from '../services/queryClient';
import { getRelativeDate } from '../utils/formatters';
import './Tracking.css';

export const Tracking = () => {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const progressQuery = useQuery({
    queryKey: queryKeys.progress,
    queryFn: async () => {
      const [entries, weightStats] = await Promise.all([
        weightService.getWeightEntries(30),
        weightService.getWeightStats().catch(() => null),
      ]);
      return { entries: entries || [], stats: weightStats };
    },
  });
  const history = useMemo(() => progressQuery.data?.entries || [], [progressQuery.data?.entries]);
  const stats = progressQuery.data?.stats || null;

  const invalidateProgressViews = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    queryClient.invalidateQueries({ queryKey: queryKeys.weight });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    queryClient.invalidateQueries({ queryKey: queryKeys.coach });
  };
  const saveWeightMutation = useMutation({ mutationFn: weightService.addOrUpdateWeight, onSuccess: invalidateProgressViews });
  const deleteWeightMutation = useMutation({ mutationFn: weightService.deleteWeight, onSuccess: invalidateProgressViews });

  const chartData = useMemo(() => [...history].reverse().map((entry) => ({
    date: new Date(entry.entryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    weight: Number(entry.weightKg),
  })), [history]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await saveWeightMutation.mutateAsync({ weightKg: Number(weight), entryDate: date, notes: notes || undefined });
      setWeight('');
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteWeightMutation.mutateAsync(id);
  };

  const latest = history[0];
  const previous = history[1];
  const delta = latest && previous ? Number(latest.weightKg) - Number(previous.weightKg) : 0;
  const chartFallback = chartData.length ? chartData : [{ date: 'J-6', weight: 78 }, { date: 'J-3', weight: 77.5 }, { date: 'Today', weight: 77.1 }];

  return (
    <motion.div 
      className="tr-shell"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="tr-header">
        <div className="tr-header-text">
          <span className="tr-eyebrow">Body signal</span>
          <h1 className="tr-title">Progression</h1>
        </div>
        <span className="tr-status-chip"><Calendar size={15} /> 30 jours</span>
      </header>

      {error && <div className="error-panel" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="tr-layout">
        <div className="tr-sidebar">
          {/* --- HERO: Weight Summary --- */}
          <motion.section className="tr-hero-card" whileHover={{ scale: 1.01 }}>
            <div className="tr-hero-content">
              <div className="tr-weight-main">
                <span className="tr-eyebrow" style={{ color: 'var(--aqua)' }}>Poids actuel</span>
                <h2 className="tr-weight-val">{latest ? `${latest.weightKg} kg` : '--'}</h2>
                
                {latest && previous && (
                  <div className={`tr-weight-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'stable'}`}>
                    {delta < 0 ? <TrendingDown size={14} /> : delta > 0 ? <TrendingUp size={14} /> : null}
                    <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)} kg</span>
                  </div>
                )}
              </div>
              <Scale size={48} color="rgba(0,229,255,0.15)" strokeWidth={1.5} />
            </div>
          </motion.section>

          {/* --- STATS GRID --- */}
          <section className="tr-grid-2">
            <motion.div 
              className="tr-stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Target size={20} className="tr-stat-icon" />
              <div className="tr-stat-label">Moyenne (30j)</div>
              <div className="tr-stat-val">{stats?.average ? `${Number(stats.average).toFixed(1)} kg` : '--'}</div>
            </motion.div>
            <motion.div 
              className="tr-stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Activity size={20} className="tr-stat-icon" style={{ color: 'var(--violet)' }} />
              <div className="tr-stat-label">Check-ins</div>
              <div className="tr-stat-val">{history.length} mesures</div>
            </motion.div>
          </section>

          {/* --- DATA ENTRY --- */}
          <motion.article 
            className="tr-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="tr-section-title" style={{ marginTop: 0 }}>
              <div><span className="tr-eyebrow">Check-in</span><h2>Nouvelle mesure</h2></div>
              <Plus size={20} color="rgba(255,255,255,0.4)" />
            </div>
            <form className="tr-form-stack" onSubmit={handleSubmit}>
              <div className="tr-grid-2">
                <Input label="Poids (kg)" type="number" step="0.1" min="20" max="500" value={weight} onChange={(event) => setWeight(event.target.value)} required />
                <div className="input-wrapper tr-date-wrap">
                  <label className="input-label">Date</label>
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <CustomDatePicker value={date} onChange={(event) => setDate(event.target.value)} />
                  </div>
                </div>
              </div>
              <Input label="Note" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sommeil, energie, contexte..." />
              <button className="tr-btn-submit" type="submit" disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer le poids'}</button>
            </form>
          </motion.article>
        </div>

        <div className="tr-main">
          {/* --- CHART SECTION --- */}
          <motion.article 
            className="tr-card tr-chart-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="tr-section-title" style={{ marginTop: 0 }}>
              <div><span className="tr-eyebrow">Tendance</span><h2>Courbe de poids</h2></div>
            </div>
            <div className="tr-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartFallback} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ background: '#050816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} 
                    itemStyle={{ color: '#00E5FF', fontWeight: 800 }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#00E5FF" strokeWidth={4} fill="url(#trGradient)" activeDot={{ r: 6, fill: '#00E5FF', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.article>

          {/* --- HISTORY LIST --- */}
          <motion.article 
            className="tr-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="tr-section-title" style={{ marginTop: 0 }}>
              <div><span className="tr-eyebrow">Historique</span><h2>Dernières mesures</h2></div>
            </div>
            
            {progressQuery.isFetching && progressQuery.data && <div className="status-chip" style={{ marginTop: 12 }}>Refresh...</div>}
            {progressQuery.isLoading && !progressQuery.data ? (
              <div className="loading-panel"><span className="spinner" /> Chargement...</div>
            ) : history.length === 0 ? (
              <div className="empty-panel" style={{ marginTop: 16 }}>Aucune mesure. Ton premier check-in crée la base.</div>
            ) : (
              <div className="tr-history-list">
                <AnimatePresence>
                  {history.slice(0, 8).map((entry) => (
                    <motion.div 
                      key={entry.id} 
                      className="tr-history-row"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="tr-history-info">
                        <strong>{entry.weightKg} kg</strong>
                        <small>{getRelativeDate(entry.entryDate.split('T')[0])}{entry.notes ? ` · ${entry.notes}` : ''}</small>
                      </div>
                      <motion.button 
                        className="tr-history-del" 
                        onClick={() => handleDelete(entry.id)}
                        whileHover={{ scale: 1.1, color: '#FF4D6D' }}
                      ><Trash2 size={16} /></motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.article>
        </div>
      </div>
    </motion.div>
  );
};
