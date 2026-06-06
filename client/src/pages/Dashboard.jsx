import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ChevronRight, Dumbbell, Flame, Salad, Scale, Target, Zap, TrendingUp, Sparkles, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { dashboardService } from '../services/dashboardService';
import { missionService } from '../services/missionService';
import { queryKeys } from '../services/queryClient';
import { getGreeting } from '../utils/formatters';
import './Dashboard.css';

const fallback = { targetCalories: 2200, targetProtein: 145, targetCarbs: 240, targetFat: 72 };
const pct = (v, m) => (m ? Math.min(100, Math.round((Number(v || 0) / m) * 100)) : 0);

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completingMission, setCompletingMission] = useState('');
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardService.getDashboard,
  });

  const dashboard = dashboardQuery.data;
  const s = useMemo(() => ({
    loading: dashboardQuery.isLoading,
    error: dashboardQuery.error ? 'Sync partielle.' : '',
    profile: dashboard?.profile || null,
    targets: dashboard?.targets || fallback,
    summary: dashboard?.nutritionToday || dashboard?.summary || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    workouts: dashboard?.workoutsToday || dashboard?.workouts || [],
    weights: dashboard?.weightTrend?.entries || dashboard?.weights || [],
    coach: dashboard?.coach || null,
    dashboardMeta: dashboard?.meta,
    completingMission,
  }), [dashboard, dashboardQuery.error, dashboardQuery.isLoading, completingMission]);

  const completeMissionMutation = useMutation({
    mutationFn: (mission) => missionService.completeMission({ missionId: mission.id, missionDate: new Date().toISOString().slice(0, 10) }),
    onMutate: (mission) => setCompletingMission(mission.id),
    onSuccess: (_data, mission) => {
      queryClient.setQueryData(queryKeys.dashboard, (current) => {
        if (!current?.coach?.missions) return current;
        return {
          ...current,
          coach: {
            ...current.coach,
            missions: current.coach.missions.map((item) => item.id === mission.id ? { ...item, done: true, progress: 100 } : item),
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach });
    },
    onSettled: () => setCompletingMission(''),
  });

  const chartData = useMemo(() => {
    const pts = [...s.weights].reverse();
    if (pts.length) return pts.map(e => ({ day: new Date(e.entryDate).toLocaleDateString('fr-FR', { weekday: 'short' }), weight: Number(e.weightKg) }));
    return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => ({ day: d, weight: 78 - i * 0.16 }));
  }, [s.weights]);

  if (dashboardQuery.error?.response?.status === 404) {
    navigate('/profile/setup');
    return null;
  }

  if (s.loading && !dashboard) return (
    <motion.div className="ft-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="ft-skeleton" style={{ height: 320 }} />
      <div className="ft-skeleton" style={{ height: 180 }} />
    </motion.div>
  );

  const { profile, targets, summary, workouts, coach } = s;
  const name = profile?.name?.split(' ')[0] || 'Athlète';
  const mins = workouts.reduce((a, w) => a + Number(w.durationMinutes || 0), 0);
  const burned = workouts.reduce((a, w) => a + Number(w.caloriesBurned || 0), 0);
  const calTarget = Number(targets.targetCalories || fallback.targetCalories) + burned;
  const calPct = pct(summary.calories, calTarget);
  const protPct = pct(summary.protein, targets.targetProtein || fallback.targetProtein);
  const carbPct = pct(summary.carbs, targets.targetCarbs || fallback.targetCarbs);
  const fatPct = pct(summary.fat, targets.targetFat || fallback.targetFat);
  const movePct = pct(mins, 45);

  const score = coach ? coach.score : Math.min(98, Math.round(calPct * 0.34 + protPct * 0.34 + movePct * 0.24 + 8));
  const missions = coach?.missions || [];
  const nextMission = coach?.premium?.dashboardWidget?.missionOfTheDay || missions.find(m => !m.done) || missions[0];
  const doneCount = missions.filter(m => m.done).length;
  const prediction = coach?.premium?.dashboardWidget?.mainPrediction || coach?.predictions?.[0];
  const advice = coach?.premium?.dashboardWidget?.mainAdvice || coach?.insights?.[0];

  const ringData = [
    { label: 'Protéines', val: summary.protein || 0, max: targets.targetProtein || 145, p: protPct, color: '#22d3ee', unit: 'g' },
    { label: 'Glucides', val: summary.carbs || 0, max: targets.targetCarbs || 240, p: carbPct, color: '#a78bfa', unit: 'g' },
    { label: 'Lipides', val: summary.fat || 0, max: targets.targetFat || 72, p: fatPct, color: '#f59e0b', unit: 'g' },
    { label: 'Move', val: mins, max: 45, p: movePct, color: '#f43f5e', unit: 'min' },
  ];

  const streaks = coach?.streaks ? [
    { k: 'global', label: 'Tracking', v: coach.streaks.global, Icon: Flame, color: '#f59e0b' },
    { k: 'protein', label: 'Protéines', v: coach.streaks.protein, Icon: Salad, color: '#22d3ee' },
    { k: 'training', label: 'Training', v: coach.streaks.training, Icon: Dumbbell, color: '#a78bfa' },
    { k: 'weight', label: 'Pesée', v: coach.streaks.weight, Icon: Scale, color: '#f43f5e' },
  ] : [];

  const completeMission = async (m) => {
    if (!m || m.done || s.completingMission) return;
    completeMissionMutation.mutate(m);
  };

  /* SVG ring helper */
  const R = 42, C = 2 * Math.PI * R;

  return (
    <motion.div 
      className="ft-shell"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {dashboardQuery.isFetching && dashboard && <div className="status-chip" style={{ marginBottom: 12 }}>Refresh...</div>}

      {/* ══════ HEADER ══════ */}
      <header className="ft-head">
        <div>
          <p className="ft-head__sub">{getGreeting()}</p>
          <h1 className="ft-head__name">{name}</h1>
        </div>
        <button className="ft-head__avatar" onClick={() => navigate('/profile')}>
          {name[0]?.toUpperCase()}
        </button>
      </header>

      {/* ══════ HERO SCORE : COACH IA ══════ */}
      <motion.section 
        className="ft-score-card"
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="ft-score-card__bg" />
        <div className="ft-score-card__mesh" />

        <div className="ft-score-card__top">
          <div className="ft-score-card__ring-box">
            <svg viewBox="0 0 100 100" className="ft-score-card__svg">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <motion.circle cx="50" cy="50" r={R} fill="none"
                stroke="url(#scoreGrad)" strokeWidth="5.5" strokeLinecap="round"
                strokeDasharray={C} 
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C - (score / 100) * C }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                className="ft-score-card__arc"
                transform="rotate(-90 50 50)" />
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#00FFA3" />
                </linearGradient>
              </defs>
            </svg>
            <div className="ft-score-card__num">
              <span>{score}</span>
              <small>FitScore</small>
            </div>
          </div>

          <div className="ft-score-card__meta">
            <div className="ft-score-card__coach-tag">
              <Sparkles size={14} /> Coach IA
            </div>
            <p className="ft-score-card__msg">
              {coach?.summary?.message || `Tu peux gagner +18 points FitScore aujourd'hui.`}
            </p>
            {nextMission && (
              <motion.button 
                className="ft-score-card__cta" 
                onClick={() => navigate(nextMission.route)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Faire maintenant <ChevronRight size={15} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="ft-score-card__stats">
          <div className="ft-stat-box">
            <Flame size={16} color="#FFB84D" strokeWidth={2.5} />
            <div className="ft-stat-box__info">
               <strong>{burned} <small>kcal</small></strong>
               <span>Brûlées</span>
            </div>
          </div>
          <div className="ft-stat-box">
            <Zap size={16} color="#00E5FF" strokeWidth={2.5} />
            <div className="ft-stat-box__info">
               <strong>{Math.max(0, Math.round(calTarget - (summary.calories || 0)))} <small>kcal</small></strong>
               <span>Restantes</span>
            </div>
          </div>
          <div className="ft-stat-box">
            <Award size={16} color="#00FFA3" strokeWidth={2.5} />
            <div className="ft-stat-box__info">
               <strong>{s.weights[0]?.weightKg || '--'} <small>kg</small></strong>
               <span>Actuel</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ══════ FUEL RINGS (macros) ══════ */}
      <section className="ft-fuel">
        <div className="ft-fuel__header">
          <h2 className="ft-fuel__title">Carburant</h2>
          <span className="ft-fuel__cal">{summary.calories || 0}<small> / {calTarget} kcal</small></span>
        </div>
        <div className="ft-fuel__rings">
          {ringData.map((r, i) => {
            const offset = C - (r.p / 100) * C;
            return (
              <motion.div 
                className="ft-ring" 
                key={r.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                whileHover={{ y: -5, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
              >
                <div className="ft-ring__circle-wrap">
                  <svg viewBox="0 0 100 100" className="ft-ring__svg">
                    <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    <motion.circle cx="50" cy="50" r={R} fill="none"
                      stroke={r.color} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={C} 
                      initial={{ strokeDashoffset: C }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.1 + 0.5 }}
                      className="ft-ring__arc" transform="rotate(-90 50 50)" />
                  </svg>
                  <div className="ft-ring__center">
                    <strong>{r.val}</strong>
                    <small>{r.unit}</small>
                  </div>
                </div>
                <span className="ft-ring__label">{r.label}</span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ══════ STREAKS ══════ */}
      {streaks.length > 0 && (
        <section className="ft-streaks">
          {streaks.map(sk => {
            const active = sk.v > 0;
            return (
              <div className={`ft-sk ${active ? 'ft-sk--on' : ''}`} key={sk.k} style={{ '--sk-color': sk.color }}>
                <sk.Icon size={18} strokeWidth={2.4} />
                <div className="ft-sk__info">
                  <strong>{sk.v}<small>j</small></strong>
                  <span>{sk.label}</span>
                </div>
                {active && <div className="ft-sk__pulse" />}
              </div>
            );
          })}
        </section>
      )}

      {/* ══════ MISSIONS ══════ */}
      {missions.length > 0 && (
        <section className="ft-missions">
          <div className="ft-missions__head">
            <h2 className="ft-missions__title">Missions D'Aujourd'hui</h2>
            <span className="ft-missions__count">{doneCount}/{missions.length}</span>
          </div>
          <AnimatePresence>
            {missions.map((m, i) => {
              const Icon = m.category === 'nutrition' ? Salad : m.category === 'training' ? Dumbbell : Target;
              const cls = m.category === 'nutrition' ? 'green' : m.category === 'training' ? 'cyan' : 'amber';
              return (
                <motion.button 
                  key={m.id} 
                  className={clsx('ft-mi', m.done && 'ft-mi--done')} 
                  onClick={() => m.done ? navigate(m.route) : completeMission(m)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className={`ft-mi__ico ${cls}`}><Icon size={18} /></span>
                  <div className="ft-mi__body">
                    <strong>{m.title}</strong>
                    <small>{m.detail}</small>
                  </div>
                  <span className="ft-mi__end">
                    {m.done ? <CheckCircle2 size={18} /> : s.completingMission === m.id ? <span className="spinner" /> : <ChevronRight size={16} />}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </section>
      )}

      {/* ══════ CHART ══════ */}
      <motion.section 
        className="ft-chart"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="ft-chart__head">
          <h2 className="ft-chart__title">Trajectoire</h2>
          <span className="ft-chart__live"><span /><small>Live</small></span>
        </div>
        <div className="ft-chart__box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="wFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgba(8,10,18,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', fontSize: '0.82rem' }} />
              <Area type="monotone" dataKey="weight" stroke="#00E5FF" strokeWidth={3} fill="url(#wFill)" dot={{ fill: '#050816', r: 4, strokeWidth: 2, stroke: '#00E5FF' }} activeDot={{ r: 6, fill: '#00E5FF', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* ══════ INSIGHT ══════ */}
      <AnimatePresence>
        {prediction ? (
          <motion.section 
            className="ft-insight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="ft-insight__tag"><TrendingUp size={12} /> Prédiction IA</span>
            <p className="ft-insight__msg">{prediction.message}</p>
          </motion.section>
        ) : advice ? (
          <motion.section 
            className="ft-insight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="ft-insight__tag"><Zap size={12} /> Conseil IA</span>
            <p className="ft-insight__msg">{advice.title} — {advice.message}</p>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};
